"""Synchronize the shared agents policy into agent-specific config files.

Canonical usage:
- Sync policy-managed files: `uv run agents-policy`
- Import VS Code approvals first: `uv run agents-policy-import-vscode`

Compatibility aliases:
- `uv run sync-ai-policy`
- `uv run sync-ai-policy-import-vscode`
"""

from __future__ import annotations

from argparse import ArgumentParser
from collections.abc import Callable
from dataclasses import dataclass
from importlib import import_module
from json import JSONDecodeError
import json
import re
from pathlib import Path
from typing import Any, TypeAlias, cast

CANONICAL_POLICY_PATH = Path(".agents") / "policy.json"
LEGACY_POLICY_PATH = Path(".ai-policy.json")
AI_EXCLUDE_PATH = Path(".aiexclude")
VSCODE_SETTINGS_PATH = Path(".vscode") / "settings.json"
CLAUDE_SETTINGS_PATH = Path(".claude") / "settings.json"
MANAGED_COPILOT_LANGUAGE_ID = "copilot-restricted-file"

SERVICE_GEMINI = "gemini"
SERVICE_CLAUDE = "claude"
SERVICE_COPILOT = "copilot"
SUPPORTED_SERVICES = (SERVICE_GEMINI, SERVICE_CLAUDE, SERVICE_COPILOT)
SERVICE_ALIASES = {
    SERVICE_GEMINI: SERVICE_GEMINI,
    SERVICE_CLAUDE: SERVICE_CLAUDE,
    "claude-code": SERVICE_CLAUDE,
    SERVICE_COPILOT: SERVICE_COPILOT,
    "github-copilot": SERVICE_COPILOT,
}

TerminalApprovalSetting: TypeAlias = bool | dict[str, Any]
AiPolicy: TypeAlias = dict[str, Any]
VscodeSettings: TypeAlias = dict[str, Any]
JsonLoader: TypeAlias = Callable[[str], Any]


class AgentsPolicyError(Exception):
    """Raised when the policy file or sync workflow is invalid."""


@dataclass(frozen=True)
class PolicyPaths:
    repo_root: Path
    policy_file: Path
    ai_exclude: Path
    vscode_settings: Path
    claude_settings: Path


def load_optional_json5_loader() -> JsonLoader | None:
    try:
        json5_module = import_module("json5")
    except ModuleNotFoundError:
        return None

    loads = getattr(json5_module, "loads", None)
    return loads if callable(loads) else None


JSON5_LOADS = load_optional_json5_loader()


def build_default_policy() -> AiPolicy:
    return {
        "services": list(SUPPORTED_SERVICES),
        "protectedFiles": [],
        "excludedFiles": [],
        "terminalAutoApprove": {},
        "editAutoApprove": {},
    }


def require_json_object(value: Any, *, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise AgentsPolicyError(f"{context} must be a JSON object.")
    return value


def read_json_file(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback

    text = path.read_text(encoding="utf-8")
    if JSON5_LOADS is not None:
        try:
            return JSON5_LOADS(text)
        except Exception:
            pass

    try:
        return json.loads(text)
    except JSONDecodeError:
        cleaned = strip_jsonc(text)
        return json.loads(cleaned)


def strip_jsonc(text: str) -> str:
    def remove_comments(content: str) -> str:
        output: list[str] = []
        index = 0
        length = len(content)
        in_string = False
        quote_char = ""

        while index < length:
            char = content[index]

            if in_string:
                output.append(char)
                if char == "\\":
                    if index + 1 < length:
                        output.append(content[index + 1])
                        index += 2
                        continue
                elif char == quote_char:
                    in_string = False
                index += 1
                continue

            if char in {'"', "'"}:
                in_string = True
                quote_char = char
                output.append(char)
                index += 1
                continue

            if char == "/" and index + 1 < length and content[index + 1] == "/":
                index += 2
                while index < length and content[index] != "\n":
                    index += 1
                continue

            if char == "/" and index + 1 < length and content[index + 1] == "*":
                index += 2
                while index + 1 < length and not (
                    content[index] == "*" and content[index + 1] == "/"
                ):
                    index += 1
                index += 2 if index + 1 < length else 1
                continue

            output.append(char)
            index += 1

        return "".join(output)

    return re.sub(r",\s*(?=[}\]])", "", remove_comments(text))


def write_json_file(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file_handle:
        json.dump(data, file_handle, indent=2)
        file_handle.write("\n")


def write_text_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def sync_json_file(path: Path, data: dict[str, Any]) -> None:
    if data:
        write_json_file(path, data)
        return

    if path.exists():
        path.unlink()


def get_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    items = cast(list[Any], value)
    return [item for item in items if isinstance(item, str)]


def get_string_mapping(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}

    items = cast(dict[Any, Any], value)
    return {
        key: item
        for key, item in items.items()
        if isinstance(key, str) and isinstance(item, str)
    }


def get_boolean_mapping(value: Any) -> dict[str, bool]:
    if not isinstance(value, dict):
        return {}

    items = cast(dict[Any, Any], value)
    return {
        key: item
        for key, item in items.items()
        if isinstance(key, str) and isinstance(item, bool)
    }


def get_terminal_approval_mapping(value: Any) -> dict[str, TerminalApprovalSetting]:
    if not isinstance(value, dict):
        return {}

    items = cast(dict[Any, Any], value)
    return {key: item for key, item in items.items() if isinstance(key, str)}


def get_protected_files(policy: AiPolicy) -> list[str]:
    return get_string_list(policy.get("protectedFiles", []))


def get_excluded_files(policy: AiPolicy) -> list[str]:
    return get_string_list(policy.get("excludedFiles", []))


def normalize_service_name(raw_name: str) -> str:
    normalized = raw_name.strip().lower()
    service_name = SERVICE_ALIASES.get(normalized)
    if service_name is None:
        supported = ", ".join(sorted(SERVICE_ALIASES))
        raise AgentsPolicyError(
            f"Unsupported policy service '{raw_name}'. Supported values: {supported}."
        )
    return service_name


def get_services(policy: AiPolicy) -> list[str]:
    raw_services = policy.get("services")
    if raw_services is None:
        return list(SUPPORTED_SERVICES)

    if not isinstance(raw_services, list):
        raise AgentsPolicyError("Policy 'services' must be an array of strings.")

    services: list[str] = []
    for entry in raw_services:
        if not isinstance(entry, str) or entry.strip() == "":
            raise AgentsPolicyError(
                "Policy 'services' must contain only non-empty strings."
            )

        service_name = normalize_service_name(entry)
        if service_name not in services:
            services.append(service_name)

    return services


def build_protected_read_rules(protected_files: list[str]) -> list[str]:
    return [f"Read({pattern})" for pattern in protected_files]


def replace_managed_claude_deny_rules(
    existing: list[str], protected_files: list[str]
) -> list[str]:
    preserved_rules = [entry for entry in existing if not entry.startswith("Read(")]
    return preserved_rules + build_protected_read_rules(protected_files)


def apply_policy_to_claude_settings(
    claude: dict[str, Any], policy: AiPolicy
) -> dict[str, Any]:
    updated = dict(claude)
    permissions = (
        dict(claude.get("permissions", {}))
        if isinstance(claude.get("permissions"), dict)
        else {}
    )
    existing_deny = get_string_list(permissions.get("deny", []))
    deny_rules = replace_managed_claude_deny_rules(
        existing_deny,
        get_protected_files(policy),
    )

    if deny_rules:
        permissions["deny"] = deny_rules
    else:
        permissions.pop("deny", None)

    if permissions:
        updated["permissions"] = permissions
    else:
        updated.pop("permissions", None)

    return updated


def build_protected_file_associations(protected_files: list[str]) -> dict[str, str]:
    return {pattern: MANAGED_COPILOT_LANGUAGE_ID for pattern in protected_files}


def replace_managed_file_associations(
    existing: dict[str, str], protected_files: list[str]
) -> dict[str, str]:
    preserved_rules = {
        pattern: language
        for pattern, language in existing.items()
        if language != MANAGED_COPILOT_LANGUAGE_ID
    }
    return preserved_rules | build_protected_file_associations(protected_files)


def apply_policy_to_vscode_settings(
    vscode: VscodeSettings, policy: AiPolicy
) -> VscodeSettings:
    updated = dict(vscode)
    protected_files = get_protected_files(policy)
    associations = replace_managed_file_associations(
        get_string_mapping(updated.get("files.associations", {})),
        protected_files,
    )

    if associations:
        updated["files.associations"] = associations
    else:
        updated.pop("files.associations", None)

    copilot_enable = get_boolean_mapping(updated.get("github.copilot.enable", {}))
    if protected_files:
        copilot_enable[MANAGED_COPILOT_LANGUAGE_ID] = False
    else:
        copilot_enable.pop(MANAGED_COPILOT_LANGUAGE_ID, None)

    if copilot_enable:
        updated["github.copilot.enable"] = copilot_enable
    else:
        updated.pop("github.copilot.enable", None)

    terminal_auto_approve = get_terminal_approval_mapping(
        policy.get("terminalAutoApprove", {}),
    )
    if terminal_auto_approve:
        updated["chat.tools.terminal.autoApprove"] = terminal_auto_approve
    else:
        updated.pop("chat.tools.terminal.autoApprove", None)

    edit_auto_approve = get_boolean_mapping(policy.get("editAutoApprove", {}))
    if edit_auto_approve:
        updated["chat.tools.edits.autoApprove"] = edit_auto_approve
    else:
        updated.pop("chat.tools.edits.autoApprove", None)

    return updated


def build_ai_exclude_content(policy: AiPolicy, policy_label: str) -> str:
    lines: list[str] = [
        "# ==============================================================================",
        "# AI EXCLUSION FILE",
        f"# Generated from {policy_label}",
        "# Protected files are sensitive; excluded files are mostly noise or generated output.",
        "# ==============================================================================",
        "",
        "# --- 1. Protected files ---",
    ]

    lines.extend(get_protected_files(policy))
    lines.append("")
    lines.append("# --- 2. Excluded noise / generated output ---")
    lines.extend(get_excluded_files(policy))
    lines.append("")
    return "\n".join(lines)


def import_policy_from_vscode(policy: AiPolicy, vscode_settings_path: Path) -> AiPolicy:
    vscode: VscodeSettings = require_json_object(
        read_json_file(vscode_settings_path, {}),
        context="VS Code settings",
    )
    return {
        **policy,
        "terminalAutoApprove": get_terminal_approval_mapping(
            vscode.get("chat.tools.terminal.autoApprove", {})
        ),
        "editAutoApprove": get_boolean_mapping(
            vscode.get("chat.tools.edits.autoApprove", {})
        ),
    }


def discover_policy_path(start_path: Path) -> Path | None:
    search_roots = [start_path, *start_path.parents]
    for candidate_root in search_roots:
        canonical_path = candidate_root / CANONICAL_POLICY_PATH
        if canonical_path.is_file():
            return canonical_path.resolve()

        legacy_path = candidate_root / LEGACY_POLICY_PATH
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
        resolved_policy.name == CANONICAL_POLICY_PATH.name
        and resolved_policy.parent.name == CANONICAL_POLICY_PATH.parent.name
    ):
        repo_root = resolved_policy.parent.parent
    elif resolved_policy.name == LEGACY_POLICY_PATH.name:
        repo_root = resolved_policy.parent
    else:
        repo_root = resolved_policy.parent

    return PolicyPaths(
        repo_root=repo_root,
        policy_file=resolved_policy,
        ai_exclude=repo_root / AI_EXCLUDE_PATH,
        vscode_settings=repo_root / VSCODE_SETTINGS_PATH,
        claude_settings=repo_root / CLAUDE_SETTINGS_PATH,
    )


def format_policy_label(paths: PolicyPaths) -> str:
    try:
        return paths.policy_file.relative_to(paths.repo_root).as_posix()
    except ValueError:
        return str(paths.policy_file)


def sync_policy_file(policy_file: Path, *, import_vscode: bool) -> list[str]:
    paths = resolve_policy_paths(policy_file)
    policy = require_json_object(
        read_json_file(paths.policy_file, build_default_policy()),
        context="Policy file",
    )
    effective = (
        import_policy_from_vscode(policy, paths.vscode_settings)
        if import_vscode
        else policy
    )

    policy_label = format_policy_label(paths)
    messages: list[str] = []
    if import_vscode:
        write_json_file(paths.policy_file, effective)
        messages.append(f"Imported: VS Code approvals into {policy_label}")

    services = get_services(effective)
    protected_files = get_protected_files(effective)
    excluded_files = get_excluded_files(effective)

    messages.append(
        f"Loaded {len(services)} services, {len(protected_files)} protected patterns and {len(excluded_files)} excluded patterns"
    )

    gemini_enabled = SERVICE_GEMINI in services
    if gemini_enabled and (protected_files or excluded_files):
        write_text_file(
            paths.ai_exclude,
            build_ai_exclude_content(effective, policy_label),
        )
        messages.append("Synced: Gemini (.aiexclude)")
    elif paths.ai_exclude.exists():
        paths.ai_exclude.unlink()
        messages.append("Removed: Gemini (.aiexclude)")

    claude_policy = effective if SERVICE_CLAUDE in services else {"protectedFiles": []}
    claude_settings = require_json_object(
        read_json_file(paths.claude_settings, {}),
        context="Claude settings",
    )
    updated_claude_settings = apply_policy_to_claude_settings(
        claude_settings,
        claude_policy,
    )
    sync_json_file(paths.claude_settings, updated_claude_settings)
    if SERVICE_CLAUDE in services:
        messages.append("Synced: Claude Code (.claude/settings.json)")
    elif claude_settings:
        messages.append("Cleaned: Claude Code (.claude/settings.json)")

    copilot_policy = (
        effective
        if SERVICE_COPILOT in services
        else {
            "protectedFiles": [],
            "terminalAutoApprove": {},
            "editAutoApprove": {},
        }
    )
    vscode_settings = require_json_object(
        read_json_file(paths.vscode_settings, {}),
        context="VS Code settings",
    )
    updated_vscode_settings = apply_policy_to_vscode_settings(
        vscode_settings,
        copilot_policy,
    )
    sync_json_file(paths.vscode_settings, updated_vscode_settings)
    if SERVICE_COPILOT in services:
        messages.append("Synced: Copilot local policy (.vscode/settings.json)")
    elif vscode_settings:
        messages.append("Cleaned: Copilot local policy (.vscode/settings.json)")

    messages.append("Done.")
    return messages


def run(arguments: list[str] | None = None) -> int:
    parser = ArgumentParser(
        description="Sync .agents/policy.json into agent-specific configuration files."
    )
    parser.add_argument(
        "-c",
        "--config",
        dest="config",
        help=(
            "Path to the policy file. Defaults to the nearest .agents/policy.json, "
            "with legacy .ai-policy.json fallback."
        ),
    )
    parser.add_argument(
        "--import-vscode",
        action="store_true",
        help="Import VS Code approvals into the policy file first",
    )
    args = parser.parse_args(arguments)

    try:
        policy_path = resolve_policy_path(args.config)
        if policy_path is None:
            print(
                "No .agents/policy.json or legacy .ai-policy.json found. Nothing to sync."
            )
            return 0

        for message in sync_policy_file(
            policy_path,
            import_vscode=args.import_vscode,
        ):
            print(message)
        return 0
    except AgentsPolicyError as error:
        print(error)
        return 1


def main(arguments: list[str] | None = None) -> int:
    return run(arguments)


def import_vscode_main() -> int:
    return run(["--import-vscode"])


if __name__ == "__main__":
    raise SystemExit(main())
