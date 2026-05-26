import json
from pathlib import Path

import pytest

from agentic_tools.agents_policy.constants import Constants
import agentic_tools.agents_policy.main as agents_policy_main
from agentic_tools.agents_policy.main import AgentsPolicyError
from agentic_tools.main import main as agentic_tools_main


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def test_ai_policy_defaults_to_all_services_without_serializing_defaults() -> None:
    policy = agents_policy_main.parse_ai_policy({}, context="Policy")

    assert policy.services == list(agents_policy_main.SupportedService)
    assert policy.to_json_object() == {}


def test_ai_policy_normalizes_service_aliases() -> None:
    policy = agents_policy_main.parse_ai_policy(
        {"services": ["github-copilot", "claude-code", "copilot"]},
        context="Policy",
    )

    assert policy.services == [
        agents_policy_main.SupportedService.COPILOT,
        agents_policy_main.SupportedService.CLAUDE,
    ]
    assert policy.to_json_object() == {"services": ["copilot", "claude"]}


def test_ai_policy_rejects_invalid_protected_files() -> None:
    with pytest.raises(AgentsPolicyError, match="protectedFiles"):
        agents_policy_main.parse_ai_policy(
            {"protectedFiles": ["*.env", 42]},
            context="Policy",
        )


def test_apply_policy_to_vscode_settings_replaces_managed_entries() -> None:
    policy = agents_policy_main.parse_ai_policy(
        {
            "protectedFiles": ["*.env"],
            "terminalAutoApprove": {"/^uv run poe lint$/": True},
            "editAutoApprove": {"**/*.py": True},
        },
        context="Policy",
    )
    vscode = agents_policy_main.VscodeSettings.model_validate(
        {
            "chat.tools.terminal.autoApprove": {"old": True},
            "chat.tools.edits.autoApprove": {"old": True},
            "files.associations": {
                "stale": Constants.RESTRICTED_FILE_FOR_COPILOT.value,
                "*.txt": "plaintext",
            },
            "github.copilot.enable": {"other-language": True},
        }
    )

    updated = agents_policy_main.apply_policy_to_vscode_settings(
        vscode,
        protected_files=policy.protected_files,
        terminal_auto_approve=policy.terminal_auto_approve,
        edit_auto_approve=policy.edit_auto_approve,
    )

    assert updated.terminal_auto_approve == {"/^uv run poe lint$/": True}
    assert updated.edit_auto_approve == {"**/*.py": True}
    assert updated.files_associations == {
        "*.txt": "plaintext",
        "*.env": Constants.RESTRICTED_FILE_FOR_COPILOT.value,
    }
    assert updated.copilot_enable == {
        "other-language": True,
        Constants.RESTRICTED_FILE_FOR_COPILOT.value: False,
    }


def test_apply_policy_to_claude_settings_replaces_managed_read_rules() -> None:
    claude = agents_policy_main.ClaudeSettings.model_validate(
        {
            "permissions": {
                "deny": [
                    "Read(old-secret)",
                    "Bash(rm -rf /)",
                ],
            },
        }
    )

    updated = agents_policy_main.apply_policy_to_claude_settings(
        claude, ["*.env", "secrets/"]
    )

    assert updated.permissions is not None
    assert updated.permissions.deny == [
        "Bash(rm -rf /)",
        "Read(*.env)",
        "Read(secrets/)",
    ]


def test_import_policy_from_vscode_replaces_policy_approval_maps(
    tmp_path: Path,
) -> None:
    policy = agents_policy_main.parse_ai_policy(
        {
            "terminalAutoApprove": {"stale": True},
            "editAutoApprove": {"old": False},
        },
        context="Policy",
    )
    vscode_settings_path = tmp_path / ".vscode" / "settings.json"
    write_json(
        vscode_settings_path,
        {
            "chat.tools.terminal.autoApprove": {"/^uv run poe test$/": True},
            "chat.tools.edits.autoApprove": {"**/*.py": True},
        },
    )

    updated = agents_policy_main.import_policy_from_vscode(policy, vscode_settings_path)

    assert updated.terminal_auto_approve == {"/^uv run poe test$/": True}
    assert updated.edit_auto_approve == {"**/*.py": True}


def test_import_policy_from_vscode_clears_missing_policy_approval_maps(
    tmp_path: Path,
) -> None:
    policy = agents_policy_main.parse_ai_policy(
        {
            "terminalAutoApprove": {"stale": True},
            "editAutoApprove": {"old": False},
        },
        context="Policy",
    )

    updated = agents_policy_main.import_policy_from_vscode(
        policy,
        tmp_path / ".vscode" / "settings.json",
    )

    assert updated.terminal_auto_approve == {}
    assert updated.edit_auto_approve == {}


def test_parse_ai_policy_rejects_unknown_service() -> None:
    with pytest.raises(AgentsPolicyError, match="Unsupported policy service"):
        agents_policy_main.parse_ai_policy({"services": ["unknown"]}, context="Policy")


def test_sync_policy_file_respects_selected_services(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    policy_path = repo_root / ".agents" / "policy.json"
    write_json(
        policy_path,
        {
            "services": ["copilot", "claude"],
            "protectedFiles": ["*.env"],
            "excludedFiles": ["dist/"],
            "terminalAutoApprove": {"/^uv run agentic-tools policy sync$/": True},
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
        "/^uv run agentic-tools policy sync$/": True
    }
    assert vscode_settings["chat.tools.edits.autoApprove"] == {"**/*.py": True}
    assert vscode_settings["files.associations"] == {
        "*.env": Constants.RESTRICTED_FILE_FOR_COPILOT.value
    }


def test_sync_policy_file_reads_unified_agents_config(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    config_path = repo_root / ".agents" / "config.json"
    write_json(
        config_path,
        {
            "policy": {
                "services": ["copilot"],
                "protectedFiles": ["*.env"],
                "terminalAutoApprove": {"uv run poe test": True},
            },
            "skills": {"sources": []},
        },
    )

    messages = agents_policy_main.sync_policy_file(config_path, import_vscode=False)

    assert "Synced: Copilot local policy (.vscode/settings.json)" in messages
    vscode_settings = read_json(repo_root / ".vscode" / "settings.json")
    assert vscode_settings["chat.tools.terminal.autoApprove"] == {
        "uv run poe test": True
    }


def test_import_policy_from_vscode_preserves_unified_agents_config_sections(
    tmp_path: Path,
) -> None:
    repo_root = tmp_path / "repo"
    config_path = repo_root / ".agents" / "config.json"
    write_json(
        config_path,
        {
            "policy": {
                "services": ["copilot"],
                "terminalAutoApprove": {"stale": True},
            },
            "skills": {
                "sources": [{"from": "package:agentic-tools", "skills": ["ref-alpha"]}]
            },
        },
    )
    write_json(
        repo_root / ".vscode" / "settings.json",
        {
            "chat.tools.terminal.autoApprove": {"uv run poe test": True},
            "chat.tools.edits.autoApprove": {"**/*.md": True},
        },
    )

    messages = agents_policy_main.sync_policy_file(config_path, import_vscode=True)

    assert "Imported: VS Code approvals into .agents/config.json" in messages
    config = read_json(config_path)
    policy = config["policy"]
    skills = config["skills"]
    assert isinstance(policy, dict)
    assert isinstance(skills, dict)
    assert policy["terminalAutoApprove"] == {"uv run poe test": True}
    assert policy["editAutoApprove"] == {"**/*.md": True}
    assert skills == {
        "sources": [{"from": "package:agentic-tools", "skills": ["ref-alpha"]}]
    }


def test_discover_policy_path_prefers_unified_agents_config(
    tmp_path: Path,
) -> None:
    repo_root = tmp_path / "repo"
    config_path = repo_root / ".agents" / "config.json"
    legacy_path = repo_root / ".agents" / "policy.json"
    write_json(config_path, {"policy": {"services": ["copilot"]}})
    write_json(legacy_path, {"services": ["claude"]})

    assert agents_policy_main.discover_policy_path(repo_root) == config_path.resolve()


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
                "*.env": Constants.RESTRICTED_FILE_FOR_COPILOT.value,
            },
            "github.copilot.enable": {
                "other-language": True,
                Constants.RESTRICTED_FILE_FOR_COPILOT.value: False,
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
            "terminalAutoApprove": {"/^uv run agentic-tools policy sync$/": True},
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
    assert "uv run agentic-tools policy sync" in message
    assert "uv run agentic-tools policy import-vscode" in message


def test_sync_policy_file_check_passes_when_outputs_are_current(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    policy_path = repo_root / ".agents" / "policy.json"
    write_json(
        policy_path,
        {
            "services": ["gemini", "claude", "copilot"],
            "protectedFiles": ["*.env"],
            "terminalAutoApprove": {"/^uv run agentic-tools policy sync$/": True},
        },
    )

    agents_policy_main.sync_policy_file(policy_path, import_vscode=False)

    messages = agents_policy_main.sync_policy_file(
        policy_path,
        import_vscode=False,
        check=True,
    )

    assert "Checked: generated policy files are up to date." in messages


def test_policy_scope_without_subcommand_prints_help(
    capsys: pytest.CaptureFixture[str],
) -> None:
    exit_code = agentic_tools_main(["policy"])

    assert exit_code == 1
    assert "sync" in capsys.readouterr().out
