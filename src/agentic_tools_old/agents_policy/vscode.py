"""VS Code / GitHub Copilot policy settings transformation."""

from agentic_tools_old.agents_policy.constants import Constants
from agentic_tools_old.agents_policy.policy import (
    TerminalApprovalValue,
    VscodeSettings,
)


def _merge_managed_associations(
    existing: dict[str, str] | None, protected_files: list[str]
) -> dict[str, str] | None:
    restricted = Constants.RESTRICTED_FILE_FOR_COPILOT.value
    preserved = {
        pattern: language
        for pattern, language in (existing or {}).items()
        if language != restricted
    }
    managed = {pattern: restricted for pattern in protected_files}
    merged = preserved | managed
    return merged or None


def _merge_copilot_enable(
    existing: dict[str, bool] | None, protected_files: list[str]
) -> dict[str, bool] | None:
    restricted = Constants.RESTRICTED_FILE_FOR_COPILOT.value
    enable = {
        key: value for key, value in (existing or {}).items() if key != restricted
    }
    if protected_files:
        enable[restricted] = False
    return enable or None


def apply_policy_to_vscode_settings(
    vscode: VscodeSettings,
    *,
    protected_files: list[str],
    terminal_auto_approve: dict[str, TerminalApprovalValue],
    edit_auto_approve: dict[str, bool],
) -> VscodeSettings:
    return vscode.model_copy(
        update={
            "files_associations": _merge_managed_associations(
                vscode.files_associations, protected_files
            ),
            "copilot_enable": _merge_copilot_enable(
                vscode.copilot_enable, protected_files
            ),
            "terminal_auto_approve": terminal_auto_approve or None,
            "edit_auto_approve": edit_auto_approve or None,
        }
    )


def extract_policy_approval_maps(vscode: VscodeSettings) -> dict[str, object]:
    return {
        "terminalAutoApprove": dict(vscode.terminal_auto_approve or {}),
        "editAutoApprove": dict(vscode.edit_auto_approve or {}),
    }
