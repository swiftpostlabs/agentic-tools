#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = []
# ///
"""Audit a repository against the shared agent baseline in one pass.

Detects the local agent workspaces, the skills root and how it is materialized,
the instruction files (root and nested AGENTS.md, leftover bridge files), which
agent clients the repo shows
traces of, and which stack markers imply extra skills. Reports findings as
check IDs so the calling skill can map each one to a fix.

Detection only: this script never writes to the audited repo.

Usage:
    uv run audit_agent_repo.py [--repo PATH] [--json] [--only ID[,ID...]]

Exit status: 0 when no check failed, 1 when at least one check failed, 2 on a
usage or environment error. Warnings alone do not change the exit status.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Literal

Status = Literal["pass", "warn", "fail", "info"]

CORE_SKILLS: tuple[str, ...] = (
    "ref-sp-agents-skills-authoring",
    "ref-sp-agents-instructions-authoring",
    "tool-sp-maintain-skills",
    "ref-sp-agents-retro",
    "ref-sp-agents-local-tasks",
)

WORKSPACE_DIRS: tuple[str, ...] = (
    ".agents/tasks",
    ".agents/retro",
    ".agents/playground",
)

SKILL_ROOTS: tuple[str, ...] = (
    ".agents/skills",
    ".claude/skills",
    ".github/skills",
    ".gemini/skills",
    "skills",
)

# Repo-local evidence that a client is in use. A hit means "wire this client up",
# not "this client is installed".
CLIENT_TRACES: dict[str, tuple[str, ...]] = {
    "claude": (".claude", "CLAUDE.md", ".claude/CLAUDE.md", ".claude-plugin"),
    "copilot": (
        ".github/copilot-instructions.md",
        ".github/instructions",
        ".github/prompts",
        ".vscode/settings.json",
    ),
    "gemini": ("GEMINI.md", ".gemini", ".aiexclude"),
    "cursor": (".cursor", ".cursorrules"),
    "codex": (".codex", "codex.md"),
    "hermes": (".hermes.md", ".hermes"),
    "openclaw": (".openclaw", "openclaw.json"),
}

# Client-specific instruction files that should not exist next to AGENTS.md.
# Claude Code reads AGENTS.md natively but only when no CLAUDE.md, .claude/CLAUDE.md,
# or CLAUDE.local.md is on the path, so these suppress AGENTS.md rather than bridge
# to it. Matched by file name at any depth.
BRIDGE_NAMES: tuple[str, ...] = (
    "CLAUDE.md",
    "CLAUDE.local.md",
    "GEMINI.md",
    "AGENT.md",
    ".cursorrules",
    "copilot-instructions.md",
)

# A leftover file this small that only points at AGENTS.md is a bridge to delete;
# anything larger carries its own guidance that must be merged first.
BRIDGE_MAX_LINES = 25

# Codex stops reading AGENTS.md files once their combined size from the git root
# down to the working directory reaches project_doc_max_bytes (32 KiB default).
CODEX_MAX_BYTES = 32 * 1024

# Claude Code recommends under 200 lines per instruction file.
AGENTS_MD_MAX_LINES = 200

# Directories never worth scanning for instruction files.
SCAN_SKIP_DIRS: frozenset[str] = frozenset(
    {".git", "node_modules", ".venv", "venv", "dist", "build", ".next", "__pycache__"}
)

# path marker -> stack label. The calling skill maps labels to skills.
STACK_MARKERS: tuple[tuple[str, str], ...] = (
    ("package.json", "node"),
    ("tsconfig.json", "typescript"),
    ("deno.json", "deno"),
    ("deno.jsonc", "deno"),
    ("next.config.js", "next"),
    ("next.config.mjs", "next"),
    ("next.config.ts", "next"),
    ("pyproject.toml", "python"),
    ("requirements.txt", "python"),
    ("supabase", "supabase"),
    ("wp-content", "wordpress"),
    ("style.css", "maybe-wordpress-theme"),
    (".github/workflows", "github-actions"),
    (".github/dependabot.yml", "dependabot"),
    ("playwright.config.ts", "playwright"),
    ("playwright.config.js", "playwright"),
    ("CHANGELOG.md", "release-notes"),
)


def no_detail() -> list[str]:
    return []


@dataclass
class Finding:
    check: str
    status: Status
    message: str
    detail: list[str] = field(default_factory=no_detail)

    def as_dict(self) -> dict[str, Any]:
        return {
            "check": self.check,
            "status": self.status,
            "message": self.message,
            "detail": self.detail,
        }


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".git").exists():
            return candidate
    return current


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def is_directory_junction(path: Path) -> bool:
    """A Windows junction is a link, but not a symlink to Python.

    Without symlink privileges (Administrator or Developer Mode) Windows falls
    back to a directory junction, which `Path.is_symlink()` reports as False.
    `os.path.isjunction` arrived in 3.12, so it is probed rather than imported.
    """
    isjunction = getattr(os.path, "isjunction", None)
    return bool(callable(isjunction) and isjunction(path))


def link_target(path: Path) -> str | None:
    try:
        if path.is_symlink() or is_directory_junction(path):
            return os.readlink(path)
        return None
    except OSError:
        return None


def is_ignored(repo: Path, relative: str, has_git: bool) -> bool | None:
    """True/False when it can be decided, None when it cannot.

    Uses --no-index so the answer is about the ignore patterns alone. Without it
    git reports a directory as not-ignored as soon as one file inside it is
    tracked, which misreads the common "commit a placeholder .gitignore to keep
    the directory" setup as a missing rule. Tracked content is checked
    separately by tracked_paths().
    """
    if has_git:
        try:
            result = subprocess.run(
                ["git", "check-ignore", "-q", "--no-index", "--", relative],
                cwd=repo,
                capture_output=True,
                timeout=10,
                check=False,
            )
        # Parenthesized on purpose: PEP 758's bare form is 3.14+, and this script
        # targets whatever python3 the audited repo's machine happens to have.
        except OSError, subprocess.SubprocessError:
            return None
        if result.returncode in (0, 1):
            return result.returncode == 0
        return None
    gitignore = read_text(repo / ".gitignore")
    if not gitignore:
        return None
    stem = relative.rstrip("/")
    for raw in gitignore.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.strip("/") == stem:
            return True
    return None


def tracked_paths(repo: Path, relative: str, has_git: bool) -> list[str]:
    """Files git actually tracks under a path, ignore rules notwithstanding."""
    if not has_git:
        return []
    try:
        result = subprocess.run(
            ["git", "ls-files", "--", relative],
            cwd=repo,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except OSError, subprocess.SubprocessError:
        return []
    if result.returncode != 0:
        return []
    return [line for line in result.stdout.splitlines() if line.strip()]


def repo_files_named(repo: Path, names: Iterable[str], has_git: bool) -> list[str]:
    """Repo-relative paths whose file name is one of names, at any depth.

    Uses git's tracked and untracked-but-not-ignored files when available, so
    ignored local files (a personal CLAUDE.local.md) are only reported when
    git is absent.
    """
    wanted = set(names)
    if has_git:
        try:
            result = subprocess.run(
                ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
                cwd=repo,
                capture_output=True,
                text=True,
                timeout=20,
                check=False,
            )
        except OSError, subprocess.SubprocessError:
            result = None
        if result is not None and result.returncode == 0:
            return sorted(
                {
                    line
                    for line in result.stdout.splitlines()
                    if line.rsplit("/", 1)[-1] in wanted
                }
            )
    found: list[str] = []
    for dirpath, dirnames, filenames in os.walk(repo):
        dirnames[:] = [d for d in dirnames if d not in SCAN_SKIP_DIRS]
        for filename in filenames:
            if filename in wanted:
                found.append(Path(dirpath, filename).relative_to(repo).as_posix())
    return sorted(found)


def list_skills(root: Path) -> list[str]:
    if not root.is_dir():
        return []
    names: list[str] = []
    for entry in sorted(root.iterdir()):
        if entry.is_dir() and (entry / "SKILL.md").is_file():
            names.append(entry.name)
    return names


def check_workspaces(repo: Path, has_git: bool) -> list[Finding]:
    findings: list[Finding] = []
    missing = [d for d in WORKSPACE_DIRS if not (repo / d).is_dir()]
    if missing:
        findings.append(
            Finding("W1", "fail", "local agent workspaces missing", sorted(missing))
        )
    else:
        findings.append(Finding("W1", "pass", "local agent workspaces present"))

    not_ignored: list[str] = []
    undecided: list[str] = []
    for directory in WORKSPACE_DIRS:
        verdict = is_ignored(repo, directory + "/", has_git)
        if verdict is False:
            not_ignored.append(directory)
        elif verdict is None:
            undecided.append(directory)
    if not_ignored:
        findings.append(
            Finding("W2", "fail", "agent workspaces are not gitignored", not_ignored)
        )
    elif undecided:
        findings.append(
            Finding(
                "W2",
                "warn",
                "could not confirm agent workspaces are gitignored",
                undecided,
            )
        )
    else:
        findings.append(Finding("W2", "pass", "agent workspaces are gitignored"))

    leaked: list[str] = []
    for directory in WORKSPACE_DIRS:
        tracked = [
            path
            for path in tracked_paths(repo, directory, has_git)
            if Path(path).name != ".gitignore"
        ]
        if tracked:
            leaked.append(
                f"{directory}: {len(tracked)} tracked file(s), e.g. {tracked[0]}"
            )
    if leaked:
        findings.append(
            Finding("W3", "fail", "local workspace content is committed", leaked)
        )
    else:
        findings.append(Finding("W3", "pass", "no committed workspace content"))
    return findings


def check_skills(repo: Path) -> tuple[list[Finding], list[str]]:
    findings: list[Finding] = []
    canonical = repo / ".agents/skills"
    skills = list_skills(canonical)

    if not canonical.exists():
        findings.append(Finding("S1", "fail", "no .agents/skills directory"))
    elif not skills:
        findings.append(
            Finding("S1", "warn", ".agents/skills exists but holds no skills")
        )
    else:
        findings.append(
            Finding("S1", "pass", f".agents/skills holds {len(skills)} skill(s)")
        )

    strays: list[str] = []
    for candidate in SKILL_ROOTS[1:]:
        path = repo / candidate
        target = link_target(path)
        if target is not None:
            continue  # a symlink here is the wanted shape, reported by C2
        found = list_skills(path)
        if found:
            strays.append(f"{candidate} ({len(found)} skill(s), real directory)")
    if strays:
        findings.append(
            Finding("S3", "fail", "skills live outside .agents/skills", strays)
        )
    else:
        findings.append(Finding("S3", "pass", "no stray skill roots"))

    missing_core = [name for name in CORE_SKILLS if name not in skills]
    if not skills:
        findings.append(
            Finding(
                "S2",
                "fail",
                "core skills absent from the repo",
                list(CORE_SKILLS),
            )
        )
    elif missing_core:
        findings.append(Finding("S2", "fail", "core skills missing", missing_core))
    else:
        findings.append(Finding("S2", "pass", "core skills present"))
    return findings, skills


def check_distribution(repo: Path, skills: Iterable[str]) -> list[Finding]:
    modes: list[str] = []
    config_path = repo / ".agents/config.json"
    if config_path.is_file():
        try:
            config: Any = json.loads(read_text(config_path))
        except json.JSONDecodeError:
            return [
                Finding("S4", "fail", ".agents/config.json is not valid JSON"),
            ]
        if isinstance(config, dict) and "skills" in config:
            modes.append("sync (.agents/config.json skills.sources)")
        if isinstance(config, dict) and "plugin" in config:
            modes.append("publishes a plugin (.agents/config.json plugin)")

    settings_blob = ""
    for name in (".claude/settings.json", ".claude/settings.local.json"):
        settings_blob += read_text(repo / name)
    if re.search(r'"[^"]*plugin[^"]*"\s*:', settings_blob, re.IGNORECASE):
        modes.append("marketplace plugin (plugin key in .claude/settings*.json)")

    linked = 0
    vendored = 0
    for name in skills:
        path = repo / ".agents/skills" / name
        if link_target(path) is not None:
            linked += 1
        else:
            vendored += 1
    if linked:
        modes.append(f"{linked} linked skill(s)")
    if vendored:
        modes.append(f"{vendored} in-repo skill directory(ies)")

    if not modes:
        return [
            Finding(
                "S4",
                "warn",
                "no shared-skill distribution detected",
                ["pick vendoring, sync, or a marketplace plugin"],
            )
        ]
    return [Finding("S4", "info", "skill distribution", modes)]


def check_instructions(repo: Path, has_git: bool) -> list[Finding]:
    findings: list[Finding] = []
    agents_md = repo / "AGENTS.md"
    root_body = ""
    if not agents_md.is_file():
        findings.append(Finding("I1", "fail", "no root AGENTS.md"))
    else:
        root_body = read_text(agents_md)
        lines = len([line for line in root_body.splitlines() if line.strip()])
        size = len(root_body.encode("utf-8"))
        gaps: list[str] = []
        if lines < 20:
            gaps.append(f"only {lines} non-empty lines")
        for heading, label in (
            (r"^#+ .*person", "no personality/voice section"),
            (r"^#+ .*(rule|polic)", "no always-on rules section"),
            (r"^#+ .*(workflow|command)", "no workflow or commands section"),
            (r"^#+ .*skill", "no skill routing section"),
        ):
            if not re.search(heading, root_body, re.IGNORECASE | re.MULTILINE):
                gaps.append(label)
        if size > CODEX_MAX_BYTES:
            findings.append(
                Finding(
                    "I1",
                    "fail",
                    "AGENTS.md exceeds the Codex size cap",
                    [f"{size} bytes > {CODEX_MAX_BYTES}; Codex drops the rest"],
                )
            )
        elif lines > AGENTS_MD_MAX_LINES:
            gaps.append(
                f"{lines} lines; Claude Code recommends under {AGENTS_MD_MAX_LINES}"
            )
        if gaps:
            findings.append(Finding("I1", "warn", "AGENTS.md needs work", gaps))
        elif size <= CODEX_MAX_BYTES:
            findings.append(
                Finding("I1", "pass", "AGENTS.md covers the baseline sections")
            )

    bridges: list[str] = []
    bodies: list[str] = []
    for name in repo_files_named(repo, BRIDGE_NAMES, has_git):
        path = repo / name
        if (
            name.endswith("copilot-instructions.md")
            and name != ".github/copilot-instructions.md"
        ):
            continue
        target = link_target(path)
        if target is not None:
            bridges.append(f"{name} -> {target}")
            continue
        body = read_text(path)
        lines = len([line for line in body.splitlines() if line.strip()])
        if "AGENTS.md" in body and lines <= BRIDGE_MAX_LINES:
            bridges.append(f"{name} ({lines} lines, points at AGENTS.md): delete")
        else:
            bodies.append(
                f"{name} ({lines} lines): merge into the AGENTS.md in its folder, then delete"
            )
    if bodies:
        findings.append(
            Finding(
                "I2", "fail", "instruction files outside AGENTS.md", bodies + bridges
            )
        )
    elif bridges:
        findings.append(
            Finding(
                "I2",
                "warn",
                "leftover bridge files; a CLAUDE.md stops Claude Code reading AGENTS.md",
                bridges,
            )
        )
    else:
        findings.append(
            Finding("I2", "pass", "no bridge or client-specific instruction files")
        )

    nested = [
        path
        for path in repo_files_named(repo, ("AGENTS.md", "AGENTS.override.md"), has_git)
        if path != "AGENTS.md"
    ]
    if not nested:
        findings.append(Finding("I3", "info", "no nested AGENTS.md files"))
        return findings
    problems: list[str] = []
    listed: list[str] = []
    for path in nested:
        if path.endswith("AGENTS.override.md"):
            problems.append(
                f"{path}: override files are Codex-only; fold into AGENTS.md"
            )
            continue
        folder = path.rsplit("/", 1)[0]
        listed.append(path)
        if folder not in root_body:
            problems.append(
                f"{path}: root AGENTS.md does not mention {folder}/; agents launched at the "
                "root in Codex or Copilot CLI never load it"
            )
        chain = [repo / "AGENTS.md"]
        parts = folder.split("/")
        for depth in range(1, len(parts) + 1):
            chain.append(repo / "/".join(parts[:depth]) / "AGENTS.md")
        total = sum(
            len(read_text(item).encode("utf-8")) for item in chain if item.is_file()
        )
        if total > CODEX_MAX_BYTES:
            problems.append(
                f"{path}: {total} bytes with its parents > {CODEX_MAX_BYTES}; Codex truncates"
            )
    if problems:
        findings.append(Finding("I3", "warn", "nested AGENTS.md issues", problems))
    else:
        findings.append(
            Finding("I3", "pass", "nested AGENTS.md files are reachable", listed)
        )
    return findings


def check_clients(repo: Path) -> list[Finding]:
    findings: list[Finding] = []
    detected: list[str] = []
    for client, traces in CLIENT_TRACES.items():
        hits = [trace for trace in traces if (repo / trace).exists()]
        if hits:
            detected.append(f"{client}: {', '.join(hits)}")
    findings.append(
        Finding(
            "C1",
            "info" if detected else "warn",
            "client traces found" if detected else "no client traces found",
            detected,
        )
    )

    claude_dir = repo / ".claude"
    if claude_dir.exists():
        link = repo / ".claude/skills"
        target = link_target(link)
        if target is None and link.exists():
            findings.append(
                Finding(
                    "C2", "fail", ".claude/skills is a real directory, not a symlink"
                )
            )
        elif target is None:
            findings.append(
                Finding("C2", "fail", "no .claude/skills symlink to ../.agents/skills")
            )
        elif ".agents/skills" not in target.replace("\\", "/"):
            findings.append(
                Finding("C2", "fail", ".claude/skills points elsewhere", [target])
            )
        else:
            claude_ignore = read_text(repo / ".claude/.gitignore")
            root_verdict = "skills" in {
                line.strip().strip("/") for line in claude_ignore.splitlines()
            }
            if root_verdict:
                findings.append(
                    Finding("C2", "pass", ".claude/skills symlink present and ignored")
                )
            else:
                findings.append(
                    Finding(
                        "C2",
                        "warn",
                        ".claude/skills symlink present but not gitignored",
                        ["add 'skills' to .claude/.gitignore"],
                    )
                )

    vscode_settings = repo / ".vscode/settings.json"
    copilot_in_use = any((repo / trace).exists() for trace in CLIENT_TRACES["copilot"])
    has_nested = any(
        path != "AGENTS.md"
        for path in repo_files_named(repo, ("AGENTS.md",), (repo / ".git").exists())
    )
    if vscode_settings.is_file():
        body = read_text(vscode_settings)
        missing: list[str] = []
        if "chat.useAgentsMdFile" not in body:
            missing.append("chat.useAgentsMdFile is unset")
        if has_nested and "chat.useNestedAgentsMdFiles" not in body:
            missing.append(
                "chat.useNestedAgentsMdFiles is unset; VS Code ignores nested AGENTS.md by default"
            )
        if missing:
            findings.append(
                Finding(
                    "C3",
                    "warn",
                    "VS Code settings do not fully enable AGENTS.md",
                    missing,
                )
            )
        else:
            findings.append(Finding("C3", "pass", "VS Code AGENTS.md settings present"))
    elif copilot_in_use:
        findings.append(
            Finding(
                "C3",
                "warn",
                "Copilot in use but no .vscode/settings.json",
                ["VS Code users need chat.useAgentsMdFile enabled"],
            )
        )
    return findings


def check_stack(repo: Path) -> list[Finding]:
    labels: list[str] = []
    for marker, label in STACK_MARKERS:
        if (repo / marker).exists() and label not in labels:
            labels.append(label)
    return [
        Finding(
            "R1",
            "info",
            "stack markers detected" if labels else "no stack markers detected",
            labels,
        )
    ]


def render_text(repo: Path, findings: list[Finding]) -> str:
    symbols: dict[str, str] = {
        "pass": "ok  ",
        "warn": "warn",
        "fail": "FAIL",
        "info": "info",
    }
    lines = [f"agent baseline audit: {repo}", ""]
    for finding in findings:
        lines.append(f"[{symbols[finding.status]}] {finding.check} {finding.message}")
        for item in finding.detail:
            lines.append(f"         - {item}")
    failed = sum(1 for f in findings if f.status == "fail")
    warned = sum(1 for f in findings if f.status == "warn")
    lines.append("")
    lines.append(f"{failed} failed, {warned} warning(s), {len(findings)} checks")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="audit_agent_repo.py",
        description="Audit a repository against the shared agent baseline.",
        epilog=(
            "Examples:\n"
            "  python3 audit_agent_repo.py\n"
            "  python3 audit_agent_repo.py --repo ../other-repo --json\n"
            "  python3 audit_agent_repo.py --only W1,W2,I1"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--repo", default=".", help="repo path to audit (default: cwd)")
    parser.add_argument("--json", action="store_true", help="emit JSON on stdout")
    parser.add_argument("--only", default="", help="comma-separated check IDs to keep")
    args = parser.parse_args(argv)

    start = Path(str(args.repo)).expanduser()
    if not start.is_dir():
        print(f"not a directory: {start}", file=sys.stderr)
        return 2
    repo = find_repo_root(start)
    has_git = (repo / ".git").exists()
    if not has_git:
        print(
            f"warning: {repo} is not a git repo; ignore checks are best-effort",
            file=sys.stderr,
        )

    findings: list[Finding] = []
    findings += check_workspaces(repo, has_git)
    skill_findings, skills = check_skills(repo)
    findings += skill_findings
    findings += check_distribution(repo, skills)
    findings += check_instructions(repo, has_git)
    findings += check_clients(repo)
    findings += check_stack(repo)

    wanted = {
        item.strip().upper() for item in str(args.only).split(",") if item.strip()
    }
    if wanted:
        findings = [f for f in findings if f.check in wanted]

    if bool(args.json):
        payload = {
            "repo": str(repo),
            "findings": [f.as_dict() for f in findings],
        }
        print(json.dumps(payload, indent=2))
    else:
        print(render_text(repo, findings))

    return 1 if any(f.status == "fail" for f in findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
