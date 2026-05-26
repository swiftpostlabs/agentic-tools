"""Policy command handler used by the grouped agentic-tools CLI."""

from dataclasses import dataclass
from pathlib import Path

from agentic_tools.agents_policy.claude import apply_policy_to_claude_settings
from agentic_tools.agents_policy.gemini import (
    build_ai_exclude_content as build_gemini_ai_exclude_content,
)
from agentic_tools.agents_policy.policy import (
    AgentsConfig,
    AgentsPolicyError,
    AiPolicy,
    ClaudeSettings,
    VscodeSettings,
    parse_ai_policy,
)
from agentic_tools.agents_policy.vscode import (
    apply_policy_to_vscode_settings,
    extract_policy_approval_maps,
)
from agentic_tools.utils.paths import (
    AgenticToolsPaths,
    ClaudePaths,
    GeminiPaths,
    VscodePaths,
)
from agentic_tools.utils.services import SupportedService


@dataclass(frozen=True)
class PolicyPaths:
    repo_root: Path
    policy_file: Path
    ai_exclude: Path
    vscode_settings: Path
    claude_settings: Path


def _format_relative(path: Path, repo_root: Path) -> str:
    try:
        return path.relative_to(repo_root).as_posix()
    except ValueError:
        return str(path)


@dataclass(frozen=True)
class PolicyDocument:
    config: AgentsConfig
    is_unified: bool


def load_policy_document(path: Path) -> PolicyDocument:
    """Load a policy file. Detects whether it's a unified config or a bare policy."""
    config = AgentsConfig.load_file(path, context="Policy file")
    if config.policy is not None:
        return PolicyDocument(config=config, is_unified=True)
    # No ``policy`` key: treat the whole file as a raw AiPolicy.
    policy = AiPolicy.load_file(path, context="Policy file")
    return PolicyDocument(config=AgentsConfig(policy=policy), is_unified=False)


def write_policy_document(
    path: Path, document: PolicyDocument, policy: AiPolicy
) -> None:
    """Persist *policy* into *path*, preserving sibling sections when unified."""
    if document.is_unified:
        document.config.model_copy(update={"policy": policy}).write_or_remove(path)
    else:
        policy.write_or_remove(path)


def agents_config_has_policy(path: Path) -> bool:
    """Return True if *path* looks like a unified config that owns a policy section."""
    try:
        config = AgentsConfig.load_file(path, context="Agents config")
    except AgentsPolicyError:
        return True
    return config.policy is not None


def import_policy_from_vscode(policy: AiPolicy, vscode_settings_path: Path) -> AiPolicy:
    vscode = VscodeSettings.load_file(vscode_settings_path, context="VS Code settings")
    merged = {**policy.to_json_object(), **extract_policy_approval_maps(vscode)}
    return parse_ai_policy(merged, context="Imported policy")


def build_ai_exclude_content(policy: AiPolicy, policy_label: str) -> str:
    return build_gemini_ai_exclude_content(
        protected_files=policy.protected_files,
        excluded_files=policy.excluded_files,
        policy_label=policy_label,
    )


def discover_policy_path(start_path: Path) -> Path | None:
    for candidate_root in [start_path, *start_path.parents]:
        agents_config_path = candidate_root / AgenticToolsPaths.config_path()
        if agents_config_path.is_file() and agents_config_has_policy(
            agents_config_path
        ):
            return agents_config_path.resolve()

        canonical_path = candidate_root / AgenticToolsPaths.policy_path()
        if canonical_path.is_file():
            return canonical_path.resolve()

        legacy_path = candidate_root / AgenticToolsPaths.legacy_policy_path()
        if legacy_path.is_file():
            return legacy_path.resolve()

    return None


def resolve_policy_path(raw_config: str | None) -> Path | None:
    if raw_config is not None:
        config_path = Path(raw_config).expanduser().resolve()
        if not config_path.is_file():
            raise AgentsPolicyError(f"Could not find policy file at {config_path}")
        return config_path

    return discover_policy_path(Path.cwd().resolve())


def resolve_policy_paths(policy_file: Path) -> PolicyPaths:
    resolved_policy = policy_file.expanduser().resolve()

    if (
        resolved_policy.name
        in {AgenticToolsPaths.CONFIG.value, AgenticToolsPaths.POLICY.value}
        and resolved_policy.parent.name == AgenticToolsPaths.ROOT.value
    ):
        repo_root = resolved_policy.parent.parent
    elif resolved_policy.name == AgenticToolsPaths.LEGACY_POLICY.value:
        repo_root = resolved_policy.parent
    else:
        repo_root = resolved_policy.parent

    return PolicyPaths(
        repo_root=repo_root,
        policy_file=resolved_policy,
        ai_exclude=repo_root / GeminiPaths.ai_exclude_path(),
        vscode_settings=repo_root / VscodePaths.settings_path(),
        claude_settings=repo_root / ClaudePaths.project_settings_path(),
    )


def build_check_mode_error(paths: PolicyPaths, drift_paths: list[Path]) -> str:
    drift_summary = ", ".join(
        _format_relative(path, paths.repo_root) for path in drift_paths
    )
    return (
        f"Managed policy files are out of sync: {drift_summary}. "
        "Run `uv run agentic-tools policy sync` to sync them. "
        "If you intended to keep VS Code approval edits instead, run "
        "`uv run agentic-tools policy import-vscode`."
    )


def _read_text_or_none(path: Path) -> str | None:
    return path.read_text(encoding="utf-8") if path.exists() else None


def _write_or_remove_text(path: Path, content: str | None) -> None:
    if content is not None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    elif path.exists():
        path.unlink()


def sync_policy_file(
    policy_file: Path, *, import_vscode: bool, check: bool = False
) -> list[str]:
    if import_vscode and check:
        raise AgentsPolicyError(
            "`--check` cannot be combined with `--import-vscode`. "
            "Run `uv run agentic-tools policy import-vscode` instead."
        )

    paths = resolve_policy_paths(policy_file)
    document = load_policy_document(paths.policy_file)
    assert document.config.policy is not None
    effective = (
        import_policy_from_vscode(document.config.policy, paths.vscode_settings)
        if import_vscode
        else document.config.policy
    )

    policy_label = _format_relative(paths.policy_file, paths.repo_root)
    messages: list[str] = []
    if import_vscode:
        write_policy_document(paths.policy_file, document, effective)
        messages.append(f"Imported: VS Code approvals into {policy_label}")

    services = effective.services
    messages.append(
        f"Loaded {len(services)} services, "
        f"{len(effective.protected_files)} protected patterns and "
        f"{len(effective.excluded_files)} excluded patterns"
    )

    expected_ai_exclude = (
        build_ai_exclude_content(effective, policy_label)
        if SupportedService.GEMINI in services
        and (effective.protected_files or effective.excluded_files)
        else None
    )

    claude_policy = (
        effective
        if SupportedService.CLAUDE in services
        else AiPolicy(protectedFiles=[])
    )
    claude_existing = ClaudeSettings.load_file(
        paths.claude_settings, context="Claude settings"
    )
    updated_claude = apply_policy_to_claude_settings(
        claude_existing, claude_policy.protected_files
    )
    expected_claude_text = updated_claude.dump_text()

    copilot_policy = (
        effective
        if SupportedService.COPILOT in services
        else AiPolicy(protectedFiles=[], terminalAutoApprove={}, editAutoApprove={})
    )
    vscode_existing = VscodeSettings.load_file(
        paths.vscode_settings, context="VS Code settings"
    )
    updated_vscode = apply_policy_to_vscode_settings(
        vscode_existing,
        protected_files=copilot_policy.protected_files,
        terminal_auto_approve=copilot_policy.terminal_auto_approve,
        edit_auto_approve=copilot_policy.edit_auto_approve,
    )
    expected_vscode_text = updated_vscode.dump_text()

    if check:
        drift_paths = [
            path
            for path, expected in (
                (paths.ai_exclude, expected_ai_exclude),
                (paths.claude_settings, expected_claude_text),
                (paths.vscode_settings, expected_vscode_text),
            )
            if _read_text_or_none(path) != expected
        ]
        if drift_paths:
            raise AgentsPolicyError(build_check_mode_error(paths, drift_paths))

        messages.append("Checked: generated policy files are up to date.")
        messages.append("Done.")
        return messages

    gemini_label = GeminiPaths.ai_exclude_path().as_posix()
    had_gemini_file = paths.ai_exclude.exists()
    _write_or_remove_text(paths.ai_exclude, expected_ai_exclude)
    if expected_ai_exclude is not None:
        messages.append(f"Synced: Gemini ({gemini_label})")
    elif had_gemini_file:
        messages.append(f"Removed: Gemini ({gemini_label})")

    claude_label = ClaudePaths.project_settings_path().as_posix()
    claude_existing_had_content = bool(
        claude_existing.model_dump(exclude_none=True, exclude_defaults=True)
    )
    updated_claude.write_or_remove(paths.claude_settings)
    if SupportedService.CLAUDE in services:
        messages.append(f"Synced: Claude Code ({claude_label})")
    elif claude_existing_had_content:
        messages.append(f"Cleaned: Claude Code ({claude_label})")

    vscode_label = VscodePaths.settings_path().as_posix()
    vscode_existing_had_content = bool(
        vscode_existing.model_dump(exclude_none=True, exclude_defaults=True)
    )
    updated_vscode.write_or_remove(paths.vscode_settings)
    if SupportedService.COPILOT in services:
        messages.append(f"Synced: Copilot local policy ({vscode_label})")
    elif vscode_existing_had_content:
        messages.append(f"Cleaned: Copilot local policy ({vscode_label})")

    messages.append("Done.")
    return messages


def execute_policy_command(
    *, config: str | None = None, import_vscode: bool = False, check: bool = False
) -> int:
    try:
        policy_path = resolve_policy_path(config)
        if policy_path is None:
            print(
                f"No {AgenticToolsPaths.config_path().as_posix()} policy, "
                f"{AgenticToolsPaths.policy_path().as_posix()}, or legacy "
                f"{AgenticToolsPaths.legacy_policy_path().as_posix()} found. "
                "Nothing to sync."
            )
            return 0

        for message in sync_policy_file(
            policy_path,
            import_vscode=import_vscode,
            check=check,
        ):
            print(message)
        return 0
    except AgentsPolicyError as error:
        print(error)
        return 1
