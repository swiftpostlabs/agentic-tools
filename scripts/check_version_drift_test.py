"""Tests for repository version drift checking."""

from importlib import util
import json
from pathlib import Path

import pytest


def load_check_version_drift_module():
    module_path = Path(__file__).parent / "check_version_drift.py"
    spec = util.spec_from_file_location("check_version_drift", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load check_version_drift.py")

    module = util.module_from_spec(spec)
    loader = spec.loader
    exec_module = getattr(loader, "exec_module", None)
    if exec_module is None or not callable(exec_module):
        raise RuntimeError("check_version_drift.py loader cannot execute the module")

    exec_module(module)
    return module


def write_repo_files(
    root: Path,
    *,
    source_version: str = "0.1.0",
    metadata_version: str = "0.1.0",
) -> None:
    (root / "VERSION").write_text(f"{source_version}\n", encoding="utf-8")
    (root / "pyproject.toml").write_text(
        "[project]\n" 'name = "agentic-tools"\n' f'version = "{metadata_version}"\n',
        encoding="utf-8",
    )
    (root / "package.json").write_text(
        json.dumps(
            {
                "name": "agentic-tools",
                "version": metadata_version,
                "private": True,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (root / "uv.lock").write_text(
        "version = 1\n"
        "revision = 3\n"
        'requires-python = ">=3.14, <4.0"\n\n'
        "[[package]]\n"
        'name = "agentic-tools"\n'
        f'version = "{metadata_version}"\n'
        'source = {{ editable = "." }}\n',
        encoding="utf-8",
    )


def test_check_repository_version_accepts_aligned_metadata(tmp_path: Path) -> None:
    module = load_check_version_drift_module()
    write_repo_files(tmp_path, source_version="1.2.3", metadata_version="1.2.3")

    assert module.check_repository_version(tmp_path) == "1.2.3"


def test_check_repository_version_reports_drift(tmp_path: Path) -> None:
    module = load_check_version_drift_module()
    write_repo_files(tmp_path, source_version="0.1.0", metadata_version="0.2.0")

    with pytest.raises(ValueError, match="package.json=0.2.0"):
        module.check_repository_version(tmp_path)