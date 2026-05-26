"""Claude Code policy settings transformation."""

from agentic_tools.agents_policy.policy import ClaudePermissions, ClaudeSettings


def _build_managed_deny_rules(protected_files: list[str]) -> list[str]:
    return [f"Read({pattern})" for pattern in protected_files]


def apply_policy_to_claude_settings(
    claude: ClaudeSettings, protected_files: list[str]
) -> ClaudeSettings:
    existing = claude.permissions or ClaudePermissions()
    preserved = [entry for entry in existing.deny if not entry.startswith("Read(")]
    new_deny = preserved + _build_managed_deny_rules(protected_files)

    new_permissions = existing.model_copy(update={"deny": new_deny})
    permissions: ClaudePermissions | None = (
        new_permissions if new_permissions.has_content() else None
    )

    return claude.model_copy(update={"permissions": permissions})
