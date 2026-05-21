#!/usr/bin/env python3
"""Validate Agent Skills folders using stdlib-only checks."""

import argparse
import json
import re
import sys
from dataclasses import asdict
from dataclasses import dataclass
from pathlib import Path
from typing import cast

ALLOWED_TOP_LEVEL_KEYS = {
    "allowed-tools",
    "argument-hint",
    "compatibility",
    "description",
    "license",
    "metadata",
    "name",
}
INTERNAL_REFERENCE_PATTERN = re.compile(
    r"(?:`|\()(?P<path>\./(?:assets|evals|references|scripts)/[^`)\s#]+)"
)
NAME_PATTERN = re.compile(r"^[a-z0-9-]{1,64}$")
VALID_RESOURCE_DIRS = {"assets", "evals", "references", "scripts"}


@dataclass(frozen=True)
class Finding:
    skill: str
    severity: str
    message: str


def strip_yaml_string(value: str) -> str:
    trimmed = value.strip()
    if len(trimmed) >= 2 and trimmed[0] == trimmed[-1] and trimmed[0] in {"'", '"'}:
        return trimmed[1:-1]
    return trimmed


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("SKILL.md is missing opening YAML frontmatter delimiter")

    end_index = None
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end_index = index
            break

    if end_index is None:
        raise ValueError("SKILL.md is missing closing YAML frontmatter delimiter")

    frontmatter_lines = lines[1:end_index]
    frontmatter: dict[str, object] = {}
    current_mapping: dict[str, str] | None = None
    index = 0

    while index < len(frontmatter_lines):
        line = frontmatter_lines[index]
        if not line.strip():
            index += 1
            continue

        indent = len(line) - len(line.lstrip(" "))
        if indent == 0:
            key, separator, raw_value = line.partition(":")
            if not separator:
                raise ValueError(f"Invalid frontmatter line: {line}")

            key = key.strip()
            raw_value = raw_value.strip()
            if raw_value == "":
                current_mapping = {}
                frontmatter[key] = current_mapping
                index += 1
                continue

            if raw_value in {">", "|", ">-", "|-"}:
                block_lines: list[str] = []
                index += 1
                while index < len(frontmatter_lines):
                    continuation = frontmatter_lines[index]
                    continuation_indent = len(continuation) - len(
                        continuation.lstrip(" ")
                    )
                    if continuation.strip() and continuation_indent == 0:
                        break
                    block_lines.append(continuation.strip())
                    index += 1
                frontmatter[key] = (
                    "\n".join(block_lines)
                    if raw_value.startswith("|")
                    else " ".join(line for line in block_lines if line)
                )
                current_mapping = None
                continue

            frontmatter[key] = strip_yaml_string(raw_value)
            current_mapping = None
            index += 1
            continue

        if current_mapping is None:
            index += 1
            continue

        nested_key, separator, raw_value = line.strip().partition(":")
        if not separator:
            raise ValueError(f"Invalid nested frontmatter line: {line}")
        current_mapping[nested_key.strip()] = strip_yaml_string(raw_value.strip())
        index += 1

    body = "\n".join(lines[end_index + 1 :])
    return frontmatter, body


def add(findings: list[Finding], skill_name: str, severity: str, message: str) -> None:
    findings.append(Finding(skill=skill_name, severity=severity, message=message))


def validate_name(
    skill_dir: Path, frontmatter: dict[str, object], findings: list[Finding]
) -> str:
    raw_name = frontmatter.get("name")
    skill_label = skill_dir.name
    if not isinstance(raw_name, str) or not raw_name.strip():
        add(
            findings,
            skill_label,
            "error",
            "frontmatter must include non-empty string 'name'",
        )
        return skill_label

    name = raw_name.strip()
    skill_label = name
    if not NAME_PATTERN.fullmatch(name):
        add(
            findings,
            skill_label,
            "error",
            "name must be 1-64 chars of lowercase letters, digits, and hyphens",
        )
    if name.startswith("-") or name.endswith("-") or "--" in name:
        add(
            findings,
            skill_label,
            "error",
            "name cannot start or end with a hyphen or contain consecutive hyphens",
        )
    if name != skill_dir.name:
        add(
            findings,
            skill_label,
            "error",
            f"name must match folder name '{skill_dir.name}'",
        )
    if not (name.startswith("ref-") or name.startswith("tool-")):
        add(
            findings,
            skill_label,
            "warning",
            "repo convention expects skill names to start with ref- or tool-",
        )
    return skill_label


def validate_frontmatter(
    skill_dir: Path, frontmatter: dict[str, object], findings: list[Finding]
) -> str:
    skill_label = validate_name(skill_dir, frontmatter, findings)

    unexpected = sorted(set(frontmatter) - ALLOWED_TOP_LEVEL_KEYS)
    if unexpected:
        add(
            findings,
            skill_label,
            "warning",
            "unexpected frontmatter keys: " + ", ".join(unexpected),
        )

    description = frontmatter.get("description")
    if not isinstance(description, str) or not description.strip():
        add(
            findings,
            skill_label,
            "error",
            "frontmatter must include non-empty string 'description'",
        )
    elif len(description) > 1024:
        add(
            findings,
            skill_label,
            "error",
            "description must be 1024 characters or less",
        )
    elif "<" in description or ">" in description:
        add(
            findings,
            skill_label,
            "error",
            "description must not contain angle brackets",
        )

    metadata = frontmatter.get("metadata")
    if metadata is None:
        add(
            findings,
            skill_label,
            "warning",
            "metadata.agentic-tools-category is missing",
        )
    elif not isinstance(metadata, dict):
        add(
            findings,
            skill_label,
            "error",
            "metadata must be a string-to-string mapping",
        )
    else:
        metadata_mapping = cast(dict[object, object], metadata)
        for key, value in metadata_mapping.items():
            if not isinstance(key, str) or not isinstance(value, str):
                add(
                    findings,
                    skill_label,
                    "error",
                    "metadata keys and values must be strings",
                )
        if not isinstance(metadata_mapping.get("agentic-tools-category"), str):
            add(
                findings,
                skill_label,
                "warning",
                "metadata.agentic-tools-category is missing",
            )
        visibility = metadata_mapping.get("shareable-skills.visibility")
        if visibility is not None and visibility not in {"shareable", "repo-local"}:
            add(
                findings,
                skill_label,
                "error",
                "shareable-skills.visibility must be 'shareable' or 'repo-local'",
            )

    for key in ("compatibility", "license", "argument-hint"):
        value = frontmatter.get(key)
        if value is not None and not isinstance(value, str):
            add(findings, skill_label, "error", f"{key} must be a string when present")

    return skill_label


def validate_body(
    skill_dir: Path, skill_label: str, body: str, findings: list[Finding]
) -> None:
    lowered = body.lower()
    if "## purpose" not in lowered:
        add(
            findings,
            skill_label,
            "warning",
            "SKILL.md should include a Purpose section",
        )
    if "## when to use" not in lowered:
        add(
            findings,
            skill_label,
            "warning",
            "SKILL.md should include a When to use section",
        )
    if len(body.splitlines()) > 500:
        add(
            findings,
            skill_label,
            "warning",
            "SKILL.md is over 500 lines; consider progressive disclosure",
        )

    for match in INTERNAL_REFERENCE_PATTERN.finditer(body):
        raw_path = match.group("path").rstrip(".,;:")
        target = skill_dir / raw_path[2:]
        if not target.exists():
            add(
                findings,
                skill_label,
                "error",
                f"referenced support file does not exist: {raw_path}",
            )

    if "../" in body:
        add(
            findings,
            skill_label,
            "warning",
            "body contains '../'; prefer same-skill relative or repo-root-relative paths",
        )


def validate_resources(
    skill_dir: Path, skill_label: str, findings: list[Finding]
) -> None:
    for child in sorted(skill_dir.iterdir()):
        if child.name == "SKILL.md" or child.name.startswith("."):
            continue
        if child.is_dir() and child.name not in VALID_RESOURCE_DIRS:
            add(
                findings,
                skill_label,
                "warning",
                f"unrecognized resource directory '{child.name}'",
            )


def validate_skill(skill_dir: Path) -> list[Finding]:
    findings: list[Finding] = []
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        return [
            Finding(
                skill=skill_dir.name, severity="error", message="SKILL.md not found"
            )
        ]

    try:
        frontmatter, body = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, ValueError) as error:
        return [Finding(skill=skill_dir.name, severity="error", message=str(error))]

    skill_label = validate_frontmatter(skill_dir, frontmatter, findings)
    validate_body(skill_dir, skill_label, body, findings)
    validate_resources(skill_dir, skill_label, findings)
    return findings


def find_skill_dirs(target: Path, validate_all: bool) -> list[Path]:
    if validate_all:
        return sorted(
            child
            for child in target.iterdir()
            if child.is_dir() and (child / "SKILL.md").is_file()
        )
    return [target]


def print_text(findings: list[Finding], checked: int) -> None:
    errors = sum(1 for finding in findings if finding.severity == "error")
    warnings = sum(1 for finding in findings if finding.severity == "warning")
    if findings:
        for finding in findings:
            print(f"{finding.severity.upper()} {finding.skill}: {finding.message}")
    else:
        print("No findings.")
    print(f"Summary: checked={checked} errors={errors} warnings={warnings}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Agent Skills folders")
    parser.add_argument(
        "target", type=Path, help="Skill directory, or skills root with --all"
    )
    parser.add_argument(
        "--all", action="store_true", help="Validate every child skill directory"
    )
    parser.add_argument(
        "--format", choices={"text", "json"}, default="text", help="Output format"
    )
    parser.add_argument(
        "--warnings-as-errors", action="store_true", help="Exit non-zero on warnings"
    )
    args = parser.parse_args()

    target = args.target.resolve()
    if not target.exists():
        print(f"Target not found: {target}", file=sys.stderr)
        return 2

    skill_dirs = find_skill_dirs(target, args.all)
    findings: list[Finding] = []
    for skill_dir in skill_dirs:
        findings.extend(validate_skill(skill_dir))

    if args.format == "json":
        print(
            json.dumps(
                {
                    "checked": len(skill_dirs),
                    "findings": [asdict(finding) for finding in findings],
                },
                indent=2,
            )
        )
    else:
        print_text(findings, len(skill_dirs))

    has_errors = any(finding.severity == "error" for finding in findings)
    has_warnings = any(finding.severity == "warning" for finding in findings)
    return 1 if has_errors or (args.warnings_as_errors and has_warnings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
