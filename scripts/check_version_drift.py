#!/usr/bin/env python3
"""Validate repository version drift across metadata files."""

import argparse
from collections.abc import Sequence
import json
from pathlib import Path
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE_NAME = "VERSION"
PYPROJECT_FILE_NAME = "pyproject.toml"
PACKAGE_JSON_FILE_NAME = "package.json"
UV_LOCK_FILE_NAME = "uv.lock"

SEMVER_PATTERN = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$"
)


def read_text(path: Path) -> str:
    """Read text from a UTF-8 file."""
    return path.read_text(encoding="utf-8")


def validate_semver(version: str) -> str:
    """Validate and normalize a semantic version string."""
    normalized_version = version.strip()
    if SEMVER_PATTERN.fullmatch(normalized_version) is None:
        raise ValueError(f"Invalid semantic version: {version}")

    return normalized_version


def read_version_file(root: Path) -> str:
    """Read the source-of-truth version from VERSION."""
    return validate_semver(read_text(root / VERSION_FILE_NAME))


def read_pyproject_project_name(root: Path) -> str:
    """Read the project name from pyproject.toml."""
    parsed = tomllib.loads(read_text(root / PYPROJECT_FILE_NAME))
    project = parsed.get("project")
    if not isinstance(project, dict):
        raise ValueError("pyproject.toml is missing a [project] table")

    project_name = project.get("name")
    if not isinstance(project_name, str) or not project_name:
        raise ValueError("pyproject.toml is missing project.name")

    return project_name


def read_pyproject_version(root: Path) -> str:
    """Read project.version from pyproject.toml."""
    parsed = tomllib.loads(read_text(root / PYPROJECT_FILE_NAME))
    project = parsed.get("project")
    if not isinstance(project, dict):
        raise ValueError("pyproject.toml is missing a [project] table")

    version = project.get("version")
    if not isinstance(version, str):
        raise ValueError("pyproject.toml is missing project.version")

    return validate_semver(version)


def read_package_json_version(root: Path) -> str:
    """Read version from package.json."""
    parsed = json.loads(read_text(root / PACKAGE_JSON_FILE_NAME))
    version = parsed.get("version")
    if not isinstance(version, str):
        raise ValueError("package.json is missing version")

    return validate_semver(version)


def read_uv_lock_version(root: Path, package_name: str) -> str:
    """Read the root package version from uv.lock."""
    match = re.search(
        rf'\[\[package\]\]\r?\nname = "{re.escape(package_name)}"\r?\nversion = "([^"]+)"',
        read_text(root / UV_LOCK_FILE_NAME),
    )
    if match is None:
        raise ValueError(
            f'uv.lock is missing the root package entry for "{package_name}"'
        )

    return validate_semver(match.group(1))


def read_version_state(root: Path) -> dict[str, str]:
    """Read every version-bearing surface in the repository."""
    package_name = read_pyproject_project_name(root)
    return {
        VERSION_FILE_NAME: read_version_file(root),
        PYPROJECT_FILE_NAME: read_pyproject_version(root),
        PACKAGE_JSON_FILE_NAME: read_package_json_version(root),
        UV_LOCK_FILE_NAME: read_uv_lock_version(root, package_name),
    }


def check_repository_version(root: Path) -> str:
    """Ensure all version-bearing files agree with VERSION."""
    version_state = read_version_state(root)
    expected_version = version_state[VERSION_FILE_NAME]
    mismatches = [
        f"{file_name}={actual_version}"
        for file_name, actual_version in version_state.items()
        if actual_version != expected_version
    ]
    if mismatches:
        mismatch_summary = ", ".join(mismatches)
        raise ValueError(
            f"Version drift detected. Expected {expected_version} from {VERSION_FILE_NAME}, got {mismatch_summary}"
        )

    return expected_version


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Validate repository version drift across VERSION, pyproject.toml, package.json, and uv.lock."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser(
        "check", help="Fail if VERSION and derived metadata files drift"
    )

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the CLI."""
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        print(check_repository_version(ROOT))
    except (
        FileNotFoundError,
        ValueError,
        json.JSONDecodeError,
        tomllib.TOMLDecodeError,
    ) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())