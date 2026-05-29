import json
from pathlib import Path

import pytest

from agentic_tools_old.main import main


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def test_main_dispatches_policy_sync(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    policy_path = repo_root / ".agents" / "policy.json"
    write_json(
        policy_path,
        {
            "services": ["copilot"],
            "protectedFiles": ["*.env"],
        },
    )

    exit_code = main(["policy", "sync", "--config", str(policy_path)])

    assert exit_code == 0
    vscode_settings = read_json(repo_root / ".vscode" / "settings.json")
    assert vscode_settings["files.associations"] == {"*.env": "copilot-restricted-file"}


def test_main_dispatches_policy_sync_with_workspace(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    policy_path = repo_root / ".agents" / "policy.json"
    write_json(
        policy_path,
        {
            "services": ["copilot"],
            "protectedFiles": ["*.env"],
        },
    )

    exit_code = main(["--workspace", str(repo_root), "policy", "sync"])

    assert exit_code == 0
    vscode_settings = read_json(repo_root / ".vscode" / "settings.json")
    assert vscode_settings["files.associations"] == {"*.env": "copilot-restricted-file"}


def test_main_dispatches_policy_import_vscode(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    policy_path = repo_root / ".agents" / "policy.json"
    write_json(
        policy_path,
        {
            "services": ["copilot"],
            "terminalAutoApprove": {"stale": True},
        },
    )
    write_json(
        repo_root / ".vscode" / "settings.json",
        {
            "chat.tools.terminal.autoApprove": {"/^uv run poe test$/": True},
        },
    )

    exit_code = main(["policy", "import-vscode", "--config", str(policy_path)])

    assert exit_code == 0
    policy = read_json(policy_path)
    assert policy["terminalAutoApprove"] == {"/^uv run poe test$/": True}


def test_main_dispatches_skills_list(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    skills_root = tmp_path / ".agents" / "skills" / "ref-alpha"
    skills_root.mkdir(parents=True)
    (skills_root / "SKILL.md").write_text(
        "\n".join(
            [
                "---",
                "name: ref-alpha",
                'description: "Test skill."',
                "metadata:",
                '  shareable-skills.visibility: "shareable"',
                "---",
                "",
                "# Test Skill",
                "",
            ]
        ),
        encoding="utf-8",
    )

    exit_code = main(["skills", "list", "--from", str(tmp_path)])

    assert exit_code == 0
    assert "ref-alpha" in capsys.readouterr().out


def test_main_dispatches_skills_list_with_workspace(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    repo_root = tmp_path / "repo"
    skills_root = repo_root / ".agents" / "skills" / "ref-alpha"
    skills_root.mkdir(parents=True)
    (skills_root / "SKILL.md").write_text(
        "\n".join(
            [
                "---",
                "name: ref-alpha",
                'description: "Test skill."',
                "metadata:",
                '  shareable-skills.visibility: "shareable"',
                "---",
                "",
                "# Test Skill",
                "",
            ]
        ),
        encoding="utf-8",
    )

    exit_code = main(["--workspace", str(repo_root), "skills", "list"])

    assert exit_code == 0
    assert "ref-alpha" in capsys.readouterr().out


def test_main_without_arguments_prints_help(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main([])

    assert exit_code == 1
    assert "policy" in capsys.readouterr().out
