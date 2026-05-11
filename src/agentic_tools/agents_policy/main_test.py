import json
from pathlib import Path

import pytest

import agentic_tools.agents_policy.main as agents_policy_main
from agentic_tools.agents_policy.main import AgentsPolicyError


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def test_apply_policy_to_vscode_settings_replaces_managed_entries() -> None:
    policy = {
        "protectedFiles": ["*.env"],
        "terminalAutoApprove": {"/^uv run poe lint$/": True},
        "editAutoApprove": {"**/*.py": True},
    }
    vscode = {
        "chat.tools.terminal.autoApprove": {"old": True},
        "chat.tools.edits.autoApprove": {"old": True},
        "files.associations": {
            "stale": agents_policy_main.MANAGED_COPILOT_LANGUAGE_ID,
            "*.txt": "plaintext",
        },
        "github.copilot.enable": {"other-language": True},
    }

    updated = agents_policy_main.apply_policy_to_vscode_settings(vscode, policy)

    assert updated["chat.tools.terminal.autoApprove"] == {"/^uv run poe lint$/": True}
    assert updated["chat.tools.edits.autoApprove"] == {"**/*.py": True}
    assert updated["files.associations"] == {
        "*.txt": "plaintext",
        "*.env": agents_policy_main.MANAGED_COPILOT_LANGUAGE_ID,
    }
    assert updated["github.copilot.enable"] == {
        "other-language": True,
        agents_policy_main.MANAGED_COPILOT_LANGUAGE_ID: False,
    }


def test_apply_policy_to_claude_settings_replaces_managed_read_rules() -> None:
    policy = {"protectedFiles": ["*.env", "secrets/"]}
    claude = {
        "permissions": {
            "deny": [
                "Read(old-secret)",
                "Bash(rm -rf /)",
            ],
        },
    }

    updated = agents_policy_main.apply_policy_to_claude_settings(claude, policy)

    assert updated["permissions"]["deny"] == [
        "Bash(rm -rf /)",
        "Read(*.env)",
        "Read(secrets/)",
    ]


def test_import_policy_from_vscode_replaces_policy_approval_maps(
    tmp_path: Path,
) -> None:
    policy = {
        "terminalAutoApprove": {"stale": True},
        "editAutoApprove": {"old": False},
    }
    vscode_settings_path = tmp_path / ".vscode" / "settings.json"
    write_json(
        vscode_settings_path,
        {
            "chat.tools.terminal.autoApprove": {"/^uv run poe test$/": True},
            "chat.tools.edits.autoApprove": {"**/*.py": True},
        },
    )

    updated = agents_policy_main.import_policy_from_vscode(policy, vscode_settings_path)

    assert updated["terminalAutoApprove"] == {"/^uv run poe test$/": True}
    assert updated["editAutoApprove"] == {"**/*.py": True}


def test_import_policy_from_vscode_clears_missing_policy_approval_maps(
    tmp_path: Path,
) -> None:
    policy = {
        "terminalAutoApprove": {"stale": True},
        "editAutoApprove": {"old": False},
    }

    updated = agents_policy_main.import_policy_from_vscode(
        policy,
        tmp_path / ".vscode" / "settings.json",
    )

    assert updated["terminalAutoApprove"] == {}
    assert updated["editAutoApprove"] == {}


def test_get_services_rejects_unknown_service() -> None:
    with pytest.raises(AgentsPolicyError, match="Unsupported policy service"):
        agents_policy_main.get_services({"services": ["unknown"]})


def test_sync_policy_file_respects_selected_services(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    policy_path = repo_root / ".agents" / "policy.json"
    write_json(
        policy_path,
        {
            "services": ["copilot", "claude"],
            "protectedFiles": ["*.env"],
            "excludedFiles": ["dist/"],
            "terminalAutoApprove": {"/^uv run agents-policy$/": True},
            "editAutoApprove": {"**/*.py": True},
        },
    )
    (repo_root / ".aiexclude").write_text("stale\n", encoding="utf-8")

    messages = agents_policy_main.sync_policy_file(policy_path, import_vscode=False)

    assert not (repo_root / ".aiexclude").exists()
    assert "Synced: Claude Code (.claude/settings.json)" in messages
    assert "Synced: Copilot local policy (.vscode/settings.json)" in messages
    assert "Removed: Gemini (.aiexclude)" in messages

    claude_settings = read_json(repo_root / ".claude" / "settings.json")
    assert claude_settings == {"permissions": {"deny": ["Read(*.env)"]}}

    vscode_settings = read_json(repo_root / ".vscode" / "settings.json")
    assert vscode_settings["chat.tools.terminal.autoApprove"] == {
        "/^uv run agents-policy$/": True
    }
    assert vscode_settings["chat.tools.edits.autoApprove"] == {"**/*.py": True}
    assert vscode_settings["files.associations"] == {
        "*.env": agents_policy_main.MANAGED_COPILOT_LANGUAGE_ID
    }


def test_sync_policy_file_cleans_disabled_copilot_settings(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    policy_path = repo_root / ".agents" / "policy.json"
    write_json(
        policy_path,
        {
            "services": ["claude"],
            "protectedFiles": ["*.env"],
        },
    )
    write_json(
        repo_root / ".vscode" / "settings.json",
        {
            "chat.tools.terminal.autoApprove": {"stale": True},
            "chat.tools.edits.autoApprove": {"stale": False},
            "files.associations": {
                "*.txt": "plaintext",
                "*.env": agents_policy_main.MANAGED_COPILOT_LANGUAGE_ID,
            },
            "github.copilot.enable": {
                "other-language": True,
                agents_policy_main.MANAGED_COPILOT_LANGUAGE_ID: False,
            },
        },
    )

    messages = agents_policy_main.sync_policy_file(policy_path, import_vscode=False)

    assert "Cleaned: Copilot local policy (.vscode/settings.json)" in messages
    vscode_settings = read_json(repo_root / ".vscode" / "settings.json")
    assert "chat.tools.terminal.autoApprove" not in vscode_settings
    assert "chat.tools.edits.autoApprove" not in vscode_settings
    assert vscode_settings["files.associations"] == {"*.txt": "plaintext"}
    assert vscode_settings["github.copilot.enable"] == {"other-language": True}


def test_sync_policy_file_check_detects_drift(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    policy_path = repo_root / ".agents" / "policy.json"
    write_json(
        policy_path,
        {
            "services": ["gemini", "claude", "copilot"],
            "protectedFiles": ["*.env"],
            "terminalAutoApprove": {"/^uv run agents-policy$/": True},
        },
    )

    with pytest.raises(
        AgentsPolicyError, match="Managed policy files are out of sync"
    ) as error:
        agents_policy_main.sync_policy_file(
            policy_path,
            import_vscode=False,
            check=True,
        )

    message = str(error.value)
    assert ".aiexclude" in message
    assert ".claude/settings.json" in message
    assert ".vscode/settings.json" in message
    assert "uv run agents-policy" in message
    assert "uv run agents-policy-import-vscode" in message


def test_sync_policy_file_check_passes_when_outputs_are_current(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    policy_path = repo_root / ".agents" / "policy.json"
    write_json(
        policy_path,
        {
            "services": ["gemini", "claude", "copilot"],
            "protectedFiles": ["*.env"],
            "terminalAutoApprove": {"/^uv run agents-policy$/": True},
        },
    )

    agents_policy_main.sync_policy_file(policy_path, import_vscode=False)

    messages = agents_policy_main.sync_policy_file(
        policy_path,
        import_vscode=False,
        check=True,
    )

    assert "Checked: generated policy files are up to date." in messages


def test_run_rejects_check_and_import_vscode_together(
    capsys: pytest.CaptureFixture[str],
) -> None:
    exit_code = agents_policy_main.run(["--check", "--import-vscode"])

    assert exit_code == 1
    assert "cannot be combined" in capsys.readouterr().out
