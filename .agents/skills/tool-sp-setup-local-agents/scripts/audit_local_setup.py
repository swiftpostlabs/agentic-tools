#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = []
# ///
"""Audit this machine's local-model setup against the local-setup baseline.

Measures the accelerator, reads the Ollama server's real configuration, lists
installed models and their capabilities, and detects which agent clients are
present. Reports findings as check IDs so the calling skill can map each one to
a fix.

Detection only: this script never starts, stops, pulls, or reconfigures
anything. It also never prints the value of an environment variable whose name
suggests a credential.

Usage:
    uv run audit_local_setup.py
    uv run audit_local_setup.py --json
    uv run audit_local_setup.py --only S2,S3
    uv run audit_local_setup.py --class agent

Exit status: 0 when no check failed, 1 when at least one check failed, 2 on a
usage or environment error. Warnings alone do not change the exit status.
"""

from __future__ import annotations

import argparse
import json
import platform
import re
import shutil
import subprocess
import sys
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Literal

Status = Literal["pass", "warn", "fail", "info"]
HarnessClass = Literal["agent", "edit-format", "fim"]

OLLAMA_URL = "http://localhost:11434"

# Context floor per harness class. The agent floor is Ollama's own guidance for
# agents and coding tools; the others need far less because they do not resend
# tool schemas every turn.
CONTEXT_FLOOR: dict[str, int] = {"agent": 65536, "edit-format": 16384, "fim": 4096}

# Accelerator memory in GB -> the richest harness class that budget can serve.
CLASS_FLOOR_GB: tuple[tuple[float, HarnessClass], ...] = (
    (12.0, "fim"),
    (24.0, "edit-format"),
)

# Environment variables Ollama documents. Anything else in the service config is
# reported so a stale or invented setting does not look authoritative.
KNOWN_OLLAMA_VARS: frozenset[str] = frozenset(
    {
        "OLLAMA_CONTEXT_LENGTH",
        "OLLAMA_FLASH_ATTENTION",
        "OLLAMA_HOST",
        "OLLAMA_KEEP_ALIVE",
        "OLLAMA_KV_CACHE_TYPE",
        "OLLAMA_MAX_LOADED_MODELS",
        "OLLAMA_MAX_QUEUE",
        "OLLAMA_MODELS",
        "OLLAMA_NO_CLOUD",
        "OLLAMA_NUM_PARALLEL",
        "OLLAMA_ORIGINS",
        "OLLAMA_VULKAN",
        "CUDA_VISIBLE_DEVICES",
        "PATH",
    }
)

SECRET_HINTS: tuple[str, ...] = ("KEY", "TOKEN", "SECRET", "PASSWORD", "CREDENTIAL")

CLIENTS: dict[str, str] = {
    "pi": "pi (coding agent)",
    "hermes": "Hermes Agent",
    "aider": "Aider",
    "llama-server": "llama.cpp server",
    "opencode": "OpenCode",
    "claude": "Claude Code",
}


@dataclass
class Finding:
    """One audited check."""

    check: str
    status: Status
    summary: str
    detail: str = ""

    def as_dict(self) -> dict[str, str]:
        return {
            "check": self.check,
            "status": self.status,
            "summary": self.summary,
            "detail": self.detail,
        }


@dataclass
class Setup:
    """Everything the audit observed, before it is judged."""

    accelerator: str | None = None
    accelerator_gb: float | None = None
    server_up: bool = False
    service_env: dict[str, str] = field(default_factory=dict[str, str])
    models: list[str] = field(default_factory=list[str])
    tool_capable: list[str] = field(default_factory=list[str])
    clients: list[str] = field(default_factory=list[str])


def _run(command: list[str]) -> str:
    """Run a command, returning stdout, or an empty string on any failure."""
    if shutil.which(command[0]) is None:
        return ""
    try:
        result = subprocess.run(
            command, capture_output=True, text=True, timeout=30, check=False
        )
    except OSError:
        return ""
    except subprocess.SubprocessError:
        return ""
    return result.stdout if result.returncode == 0 else ""


def redact(name: str, value: str) -> str:
    """Never echo a value whose variable name suggests a credential."""
    if any(hint in name.upper() for hint in SECRET_HINTS):
        return "<redacted>"
    return value


def detect_accelerator() -> tuple[str | None, float | None]:
    out = _run(
        [
            "nvidia-smi",
            "--query-gpu=name,memory.total",
            "--format=csv,noheader,nounits",
        ]
    )
    if out.strip():
        parts = [p.strip() for p in out.strip().splitlines()[0].split(",")]
        if len(parts) >= 2 and parts[1].replace(".", "").isdigit():
            return parts[0], float(parts[1]) * 1024 * 1024 / 1_000_000_000
    if platform.system() == "Darwin":
        for line in _run(["system_profiler", "SPHardwareDataType"]).splitlines():
            if "Chip" in line:
                mem = _run(["sysctl", "-n", "hw.memsize"]).strip()
                gb = int(mem) / 1_000_000_000 * 0.75 if mem.isdigit() else None
                return line.split(":", 1)[-1].strip(), gb
    return None, None


def read_service_env() -> dict[str, str]:
    """Read the Ollama service environment, which is what the server sees."""
    env: dict[str, str] = {}
    if platform.system() == "Linux":
        for line in _run(["systemctl", "cat", "ollama.service"]).splitlines():
            match = re.match(r'\s*Environment="?([A-Z_]+)=([^"]*)"?', line)
            if match:
                env[match.group(1)] = match.group(2)
    elif platform.system() == "Darwin":
        for name in KNOWN_OLLAMA_VARS:
            value = _run(["launchctl", "getenv", name]).strip()
            if value:
                env[name] = value
    return env


def server_reachable() -> bool:
    try:
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=5) as response:
            return 200 <= int(response.status) < 300
    # URLError already subclasses OSError; separate clauses keep this valid on
    # every interpreter, since the formatter targets a newer except syntax.
    except OSError:
        return False
    except ValueError:
        return False


def installed_models() -> list[str]:
    names: list[str] = []
    for line in _run(["ollama", "list"]).splitlines()[1:]:
        name = line.split()[0] if line.split() else ""
        if name:
            names.append(name)
    return names


def tool_capable_models(models: list[str]) -> list[str]:
    """Which installed models report a tools capability, per `ollama show`."""
    capable: list[str] = []
    for name in models[:25]:
        out = _run(["ollama", "show", name])
        if re.search(r"^\s*tools\s*$", out, re.MULTILINE):
            capable.append(name)
    return capable


def detect_clients() -> list[str]:
    return [name for name in CLIENTS if shutil.which(name) is not None]


def gather() -> Setup:
    name, gb = detect_accelerator()
    models = installed_models()
    return Setup(
        accelerator=name,
        accelerator_gb=gb,
        server_up=server_reachable(),
        service_env=read_service_env(),
        models=models,
        tool_capable=tool_capable_models(models),
        clients=detect_clients(),
    )


def default_class(budget_gb: float | None) -> HarnessClass:
    """The richest harness class this much accelerator memory can serve."""
    if budget_gb is None:
        return "fim"
    for ceiling, name in CLASS_FLOOR_GB:
        if budget_gb < ceiling:
            return name
    return "agent"


def _check_hardware(setup: Setup, target: HarnessClass) -> list[Finding]:
    findings: list[Finding] = []
    if setup.accelerator is None:
        findings.append(
            Finding(
                "H1",
                "warn",
                "No accelerator detected; expect CPU-only inference",
                "Interactive agent loops are not viable on CPU. Batch work is.",
            )
        )
    else:
        gb = setup.accelerator_gb
        findings.append(
            Finding(
                "H1",
                "pass",
                f"Accelerator: {setup.accelerator}" + (f" ({gb:.1f} GB)" if gb else ""),
            )
        )
    affordable = default_class(setup.accelerator_gb)
    if target == "agent" and affordable != "agent":
        findings.append(
            Finding(
                "H2",
                "fail",
                f"Target class 'agent' exceeds this machine; it can serve '{affordable}'",
                "Pick the affordable class or use a hosted model. Do not configure "
                "an agent harness that cannot call tools at a usable context.",
            )
        )
    else:
        findings.append(
            Finding("H2", "pass", f"Machine can serve harness class '{affordable}'")
        )
    return findings


def _check_server(setup: Setup, target: HarnessClass) -> list[Finding]:
    findings: list[Finding] = []
    env = setup.service_env
    findings.append(
        Finding(
            "S1",
            "pass" if setup.server_up else "fail",
            (
                "Ollama server is reachable"
                if setup.server_up
                else f"Ollama server not reachable at {OLLAMA_URL}"
            ),
        )
    )

    floor = CONTEXT_FLOOR[target]
    raw_ctx = env.get("OLLAMA_CONTEXT_LENGTH")
    if raw_ctx is None:
        findings.append(
            Finding(
                "S2",
                "fail",
                "OLLAMA_CONTEXT_LENGTH is not set; the default is far below the floor",
                f"Class '{target}' needs at least {floor}.",
            )
        )
    elif raw_ctx.isdigit() and int(raw_ctx) < floor:
        findings.append(
            Finding(
                "S2",
                "warn",
                f"Context {raw_ctx} is below the {floor} floor for class '{target}'",
            )
        )
    else:
        findings.append(Finding("S2", "pass", f"Context length {raw_ctx}"))

    if "OLLAMA_KEEP_ALIVE" not in env:
        findings.append(
            Finding(
                "S3",
                "warn",
                "OLLAMA_KEEP_ALIVE is not set; models unload after 5 minutes idle",
                "Every pause re-pays prefill of the fixed prompt. Set 24h.",
            )
        )
    else:
        findings.append(Finding("S3", "pass", f"Keep-alive {env['OLLAMA_KEEP_ALIVE']}"))

    cache = env.get("OLLAMA_KV_CACHE_TYPE", "f16")
    tight = setup.accelerator_gb is not None and setup.accelerator_gb < 12.0
    if tight and cache == "f16":
        findings.append(
            Finding(
                "S4",
                "warn",
                "KV cache is f16 on a memory-constrained accelerator",
                "q8_0 roughly halves cache memory with little quality cost.",
            )
        )
    else:
        findings.append(Finding("S4", "pass", f"KV cache {cache}"))

    parallel = env.get("OLLAMA_NUM_PARALLEL")
    if parallel and parallel.isdigit() and int(parallel) > 1 and tight:
        findings.append(
            Finding(
                "S5",
                "warn",
                f"OLLAMA_NUM_PARALLEL={parallel} multiplies cache memory",
                "Required memory scales by NUM_PARALLEL x CONTEXT_LENGTH.",
            )
        )
    else:
        findings.append(Finding("S5", "pass", "Concurrency settings are sane"))

    unknown = sorted(set(env) - KNOWN_OLLAMA_VARS)
    if unknown:
        findings.append(
            Finding(
                "S6",
                "warn",
                f"Undocumented variables in the service config: {', '.join(unknown)}",
                "Likely stale from an older Ollama. Verify each still does anything.",
            )
        )
    else:
        findings.append(Finding("S6", "pass", "No undocumented server variables"))
    return findings


def _check_network(setup: Setup) -> list[Finding]:
    findings: list[Finding] = []
    host = setup.service_env.get("OLLAMA_HOST", "")
    if host.startswith("0.0.0.0") or host.startswith("::"):
        findings.append(
            Finding(
                "N1",
                "warn",
                f"OLLAMA_HOST={host} listens on every interface",
                "Ollama has no authentication. Anyone reachable on the network can "
                "drive the models. Use 127.0.0.1 unless LAN access is deliberate.",
            )
        )
    else:
        findings.append(
            Finding("N1", "pass", f"Bound to {host or '127.0.0.1 (default)'}")
        )

    origins = setup.service_env.get("OLLAMA_ORIGINS", "")
    if origins.strip() == "*":
        findings.append(
            Finding(
                "N2",
                "warn",
                "OLLAMA_ORIGINS=* accepts any browser origin",
                "Any page you visit can reach the server. Narrow it to what needs it.",
            )
        )
    else:
        findings.append(Finding("N2", "pass", "CORS origins are not wildcarded"))
    return findings


def _check_models(setup: Setup, target: HarnessClass) -> list[Finding]:
    findings: list[Finding] = []
    if not setup.models:
        findings.append(Finding("M1", "fail", "No models installed"))
        return findings
    findings.append(
        Finding(
            "M1",
            "pass",
            f"{len(setup.models)} model(s) installed",
            ", ".join(setup.models),
        )
    )
    if target == "agent":
        if setup.tool_capable:
            findings.append(
                Finding(
                    "M2",
                    "pass",
                    f"{len(setup.tool_capable)} tool-capable model(s)",
                    ", ".join(setup.tool_capable),
                )
            )
        else:
            findings.append(
                Finding(
                    "M2",
                    "fail",
                    "No installed model reports a tools capability",
                    "An agent that cannot call tools cannot read a file or run a "
                    "command. This is a hard gate.",
                )
            )
    else:
        findings.append(
            Finding("M2", "info", f"Class '{target}' does not require tool calling")
        )
    return findings


def _check_clients(setup: Setup) -> list[Finding]:
    if setup.clients:
        names = ", ".join(CLIENTS[c] for c in setup.clients)
        return [Finding("C1", "pass", f"Clients present: {names}")]
    return [
        Finding(
            "C1",
            "warn",
            "No known local-model client found on PATH",
            "Nothing is wired to the server yet.",
        )
    ]


def audit(setup: Setup, target: HarnessClass) -> list[Finding]:
    return [
        *_check_hardware(setup, target),
        *_check_server(setup, target),
        *_check_network(setup),
        *_check_models(setup, target),
        *_check_clients(setup),
    ]


def render(setup: Setup, findings: list[Finding], target: HarnessClass) -> str:
    marks: dict[str, str] = {
        "pass": "ok  ",
        "warn": "WARN",
        "fail": "FAIL",
        "info": "info",
    }
    lines = [f"Local agent setup audit (target harness class: {target})", ""]
    for finding in findings:
        lines.append(f"  [{marks[finding.status]}] {finding.check}  {finding.summary}")
        if finding.detail and finding.status in ("warn", "fail"):
            lines.append(f"           {finding.detail}")

    env = setup.service_env
    if env:
        lines.append("")
        lines.append("Server configuration seen:")
        for name in sorted(env):
            if name == "PATH":
                continue
            lines.append(f"  {name}={redact(name, env[name])}")

    failed = sum(1 for f in findings if f.status == "fail")
    warned = sum(1 for f in findings if f.status == "warn")
    lines.append("")
    lines.append(f"Summary: {failed} failed, {warned} warnings")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Audit this machine's local-model setup."
    )
    parser.add_argument(
        "--class",
        dest="target",
        choices=["agent", "edit-format", "fim"],
        help="harness class to audit against (default: what the hardware can serve)",
    )
    parser.add_argument("--json", action="store_true", help="emit JSON")
    parser.add_argument("--only", default="", help="comma-separated check IDs")
    args = parser.parse_args()

    if shutil.which("ollama") is None:
        print("error: ollama is not installed or not on PATH", file=sys.stderr)
        return 2

    setup = gather()
    chosen: HarnessClass = args.target or default_class(setup.accelerator_gb)
    findings = audit(setup, chosen)

    wanted = {
        item.strip().upper() for item in str(args.only).split(",") if item.strip()
    }
    if wanted:
        findings = [f for f in findings if f.check in wanted]

    if bool(args.json):
        payload: dict[str, Any] = {
            "target_class": chosen,
            "accelerator": setup.accelerator,
            "accelerator_gb": setup.accelerator_gb,
            "findings": [f.as_dict() for f in findings],
        }
        print(json.dumps(payload, indent=2))
    else:
        print(render(setup, findings, chosen))

    return 1 if any(f.status == "fail" for f in findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
