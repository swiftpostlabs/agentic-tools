#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = []
# ///
"""Report what local models the current machine can actually run.

Measures accelerator memory, system RAM, and CPU count, then sizes each locally
installed Ollama model against a target context window. Also computes the KV
cache for an arbitrary Hugging Face config, which is the arithmetic behind the
model cache table in the sibling reference folder.

Detection only: this script never pulls, loads, or modifies a model.

Usage:
    uv run local_model_fit.py [--context 65536] [--kv-bytes 2]
    uv run local_model_fit.py --config path/to/config.json
    uv run local_model_fit.py --json

Exit status: 0 always, unless arguments are unusable (2). The verdict is in the
output, not the exit code, because "this machine is too small" is a finding
rather than a failure.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import platform
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, cast

GB = 1_000_000_000
RUNTIME_OVERHEAD_GB = 1.0
# Mid-range dense model, 64K context, f16 cache. Scaled by estimated_kv_gb.
REFERENCE_KV_GB_AT_64K = 3.0

# Accelerator memory in GB -> what is honestly achievable. Mirrors the table in
# ../references/hardware.md; keep the two in step.
VERDICTS: tuple[tuple[float, str], ...] = (
    (6.0, "FIM completion only (inline autocomplete, commit messages). Not an agent."),
    (12.0, "FIM, or an edit-format assistant on bounded single-file work."),
    (24.0, "Edit-format assistant, or short agent runs at 64K."),
    (48.0, "Tool-calling agent: 27B to 35B class coding at long context."),
    (math.inf, "Tool-calling agent: long-horizon sessions, or several models loaded."),
)


@dataclass
class Machine:
    """What the host offers to a local inference runtime."""

    system: str
    ram_gb: float | None = None
    cpu_count: int | None = None
    accelerator: str | None = None
    accelerator_gb: float | None = None
    notes: list[str] = field(default_factory=list[str])

    @property
    def budget_gb(self) -> float:
        """Memory to size models against: accelerator if present, else RAM."""
        if self.accelerator_gb is not None:
            return self.accelerator_gb
        return self.ram_gb or 0.0

    def verdict(self) -> str:
        budget = self.budget_gb
        for ceiling, text in VERDICTS:
            if budget < ceiling:
                return text
        return VERDICTS[-1][1]

    def as_dict(self) -> dict[str, Any]:
        return {
            "system": self.system,
            "ram_gb": self.ram_gb,
            "cpu_count": self.cpu_count,
            "accelerator": self.accelerator,
            "accelerator_gb": self.accelerator_gb,
            "budget_gb": round(self.budget_gb, 1),
            "verdict": self.verdict(),
            "notes": self.notes,
        }


@dataclass
class InstalledModel:
    """An Ollama model present on this machine."""

    name: str
    weights_gb: float

    def needs_gb(self, kv_gb: float) -> float:
        return self.weights_gb + kv_gb + RUNTIME_OVERHEAD_GB


def _run(command: list[str]) -> str:
    """Run a command, returning stdout, or an empty string on any failure."""
    if shutil.which(command[0]) is None:
        return ""
    try:
        result = subprocess.run(
            command, capture_output=True, text=True, timeout=20, check=False
        )
    except OSError:
        return ""
    except subprocess.SubprocessError:
        return ""
    return result.stdout if result.returncode == 0 else ""


def detect_ram_gb() -> float | None:
    system = platform.system()
    if system == "Linux":
        meminfo = Path("/proc/meminfo")
        if meminfo.exists():
            match = re.search(r"MemTotal:\s+(\d+) kB", meminfo.read_text())
            if match:
                return int(match.group(1)) * 1024 / GB
    if system == "Darwin":
        out = _run(["sysctl", "-n", "hw.memsize"]).strip()
        if out.isdigit():
            return int(out) / GB
    # Windows RAM detection is deliberately absent: the portable options are
    # unreliable. The accelerator figure is what sizing depends on anyway.
    return None


def detect_accelerator() -> tuple[str | None, float | None, list[str]]:
    """Return (name, memory in GB, notes) for the primary accelerator."""
    notes: list[str] = []

    nvidia = _run(
        [
            "nvidia-smi",
            "--query-gpu=name,memory.total,driver_version,compute_cap",
            "--format=csv,noheader,nounits",
        ]
    )
    if nvidia.strip():
        first = nvidia.strip().splitlines()[0]
        parts = [p.strip() for p in first.split(",")]
        if len(parts) >= 4:
            name, mib, driver, cap = parts[0], parts[1], parts[2], parts[3]
            gb = (
                float(mib) * 1024 * 1024 / GB
                if mib.replace(".", "").isdigit()
                else None
            )
            try:
                if float(driver.split(".")[0]) < 550:
                    notes.append(
                        f"NVIDIA driver {driver} is below Ollama's 550 floor; "
                        "the GPU may be unused."
                    )
                if float(cap) < 5.0:
                    notes.append(
                        f"Compute capability {cap} is below Ollama's 5.0 floor; "
                        "this is effectively a CPU-only machine."
                    )
            except ValueError:
                pass
            return name, gb, notes

    if platform.system() == "Darwin":
        chip = ""
        for line in _run(["system_profiler", "SPHardwareDataType"]).splitlines():
            if "Chip" in line:
                chip = line.split(":", 1)[-1].strip()
                break
        if chip:
            notes.append(
                "Apple Silicon: unified memory is shared with the OS. "
                "Budget roughly 75% of total RAM for the model."
            )
            ram = detect_ram_gb()
            return chip, (ram * 0.75 if ram else None), notes

    rocm = _run(["rocm-smi", "--showmeminfo", "vram"])
    if rocm.strip():
        notes.append("AMD GPU detected; confirm ROCm v7 is installed.")
        return "AMD (ROCm)", None, notes

    notes.append("No supported accelerator detected. Expect CPU-only inference.")
    return None, None, notes


def detect_machine() -> Machine:
    name, gb, notes = detect_accelerator()
    return Machine(
        system=f"{platform.system()} {platform.machine()}",
        ram_gb=detect_ram_gb(),
        cpu_count=os.cpu_count(),
        accelerator=name,
        accelerator_gb=gb,
        notes=notes,
    )


def installed_models() -> list[InstalledModel]:
    """Parse `ollama list` into models with their on-disk weight size."""
    out = _run(["ollama", "list"])
    models: list[InstalledModel] = []
    for line in out.splitlines()[1:]:
        match = re.match(r"^(\S+)\s+\S+\s+([\d.]+)\s*(GB|MB)", line)
        if not match:
            continue
        size = float(match.group(2))
        if match.group(3) == "MB":
            size /= 1000
        models.append(InstalledModel(name=match.group(1), weights_gb=size))
    return models


def _int_field(data: dict[str, Any], key: str) -> int | None:
    """Read an int from an untyped config mapping, or None if it is absent."""
    value: Any = data.get(key)
    return value if isinstance(value, int) else None


def _layer_types(data: dict[str, Any]) -> list[str]:
    """Per-layer attention kinds, or an empty list when the config omits them."""
    value: Any = data.get("layer_types")
    if not isinstance(value, list):
        return []
    return [entry for entry in cast(list[Any], value) if isinstance(entry, str)]


def kv_cache_gb(
    config: dict[str, Any], context: int, bytes_per_element: int
) -> float | None:
    """KV cache size in GB, honouring sliding-window and KV-shared layers.

    Returns None when the config lacks the fields needed to compute it, which is
    a real outcome worth reporting rather than papering over with a guess.
    """
    nested: Any = config.get("text_config")
    text: dict[str, Any] = (
        cast(dict[str, Any], nested) if isinstance(nested, dict) else config
    )

    layers = _int_field(text, "num_hidden_layers")
    kv_heads = _int_field(text, "num_key_value_heads")
    head_dim = _int_field(text, "head_dim")
    if head_dim is None:
        hidden = _int_field(text, "hidden_size")
        heads = _int_field(text, "num_attention_heads")
        if hidden is not None and heads:
            head_dim = hidden // heads
    if layers is None or kv_heads is None or head_dim is None:
        return None

    window = _int_field(text, "sliding_window")
    types = _layer_types(text)
    if types:
        full = sum(1 for entry in types if entry == "full_attention")
        sliding = sum(1 for entry in types if entry == "sliding_attention")
        capped = min(context, window) if window is not None else context
        cached_tokens = full * context + sliding * capped
    else:
        cached_tokens = layers * context

    shared = _int_field(text, "num_kv_shared_layers")
    if shared and layers > shared:
        cached_tokens = int(cached_tokens * (layers - shared) / layers)

    return 2 * kv_heads * head_dim * bytes_per_element * cached_tokens / GB


def estimated_kv_gb(context: int, bytes_per_element: int) -> float:
    """Rough KV cache size when no model config is available.

    Anchored on a mid-range dense model needing about 3 GB at 64K context in
    f16, then scaled linearly, since cache size is linear in both context and
    element width. Per-model shape varies by an order of magnitude, so this is
    only a placeholder: pass --config for a figure that means something.
    """
    return REFERENCE_KV_GB_AT_64K * (context / 65536) * (bytes_per_element / 2)


def render(
    machine: Machine, models: list[InstalledModel], context: int, kv_gb: float
) -> str:
    lines: list[str] = []
    lines.append("Machine")
    lines.append(f"  System          {machine.system}")
    lines.append(f"  CPU cores       {machine.cpu_count or 'unknown'}")
    ram = f"{machine.ram_gb:.1f} GB" if machine.ram_gb else "unknown"
    lines.append(f"  System RAM      {ram}")
    accel = machine.accelerator or "none detected"
    accel_gb = f" ({machine.accelerator_gb:.1f} GB)" if machine.accelerator_gb else ""
    lines.append(f"  Accelerator     {accel}{accel_gb}")
    lines.append(f"  Budget          {machine.budget_gb:.1f} GB")
    lines.append(f"  Verdict         {machine.verdict()}")
    for note in machine.notes:
        lines.append(f"  ! {note}")

    lines.append("")
    lines.append(f"Installed Ollama models, sized at {context} context")
    lines.append(
        f"  (estimated KV cache {kv_gb:.1f} GB; pass --config for a real figure)"
    )
    if not models:
        lines.append("  none found (is ollama installed and are any models pulled?)")
    budget = machine.budget_gb
    for model in sorted(models, key=lambda m: m.weights_gb):
        needs = model.needs_gb(kv_gb)
        fits = "fits" if needs <= budget else "TOO BIG"
        lines.append(
            f"  {model.name:28s} {model.weights_gb:6.1f} GB weights  "
            f"-> {needs:6.1f} GB needed  [{fits}]"
        )

    lines.append("")
    lines.append(
        "Confirm with `ollama ps` after loading: PROCESSOR should read 100% GPU"
    )
    lines.append("and CONTEXT should match what you configured.")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Report what local models the current machine can run."
    )
    parser.add_argument(
        "--context",
        type=int,
        default=65536,
        help="target context window (default 65536)",
    )
    parser.add_argument(
        "--kv-bytes",
        type=int,
        default=2,
        choices=[1, 2],
        help="bytes per cache element: 2 for f16 (default), 1 for q8_0",
    )
    parser.add_argument(
        "--config", type=Path, help="a model config.json, for an exact KV cache figure"
    )
    parser.add_argument("--json", action="store_true", help="emit JSON instead of text")
    args = parser.parse_args()

    context: int = args.context
    kv_bytes: int = args.kv_bytes

    kv_gb = estimated_kv_gb(context, kv_bytes)
    config_path: Path | None = args.config
    if config_path is not None:
        if not config_path.is_file():
            print(f"error: no such config: {config_path}", file=sys.stderr)
            return 2
        try:
            config = json.loads(config_path.read_text())
        except (OSError, json.JSONDecodeError) as exc:
            print(f"error: could not read config: {exc}", file=sys.stderr)
            return 2
        computed = kv_cache_gb(config, context, kv_bytes)
        if computed is None:
            print(
                "error: config lacks the layer and head fields needed to size the cache",
                file=sys.stderr,
            )
            return 2
        kv_gb = computed

    machine = detect_machine()
    models = installed_models()

    if bool(args.json):
        payload = {
            "machine": machine.as_dict(),
            "context": context,
            "kv_cache_gb": round(kv_gb, 2),
            "models": [
                {
                    "name": m.name,
                    "weights_gb": m.weights_gb,
                    "needs_gb": round(m.needs_gb(kv_gb), 1),
                    "fits": m.needs_gb(kv_gb) <= machine.budget_gb,
                }
                for m in models
            ],
        }
        print(json.dumps(payload, indent=2))
    else:
        print(render(machine, models, context, kv_gb))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
