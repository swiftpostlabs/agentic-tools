"""Policy schema, settings document models, and parsing helpers."""

import json
from pathlib import Path
from typing import Self, TypeAlias, cast

import json5
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
)

from agentic_tools_old.utils.services import SERVICE_ALIASES, SupportedService

# VS Code accepts either a boolean or an object such as
# {"approve": true, "matchCommandLine": true} per pattern.
TerminalApprovalValue: TypeAlias = bool | dict[str, bool]


class AgentsPolicyError(Exception):
    """Raised when the policy file or sync workflow is invalid."""


def normalize_service_name(raw_name: str) -> SupportedService:
    normalized = raw_name.strip().lower()
    service_name = SERVICE_ALIASES.get(normalized)
    if service_name is None:
        supported = ", ".join(sorted(SERVICE_ALIASES))
        raise AgentsPolicyError(
            f"Unsupported policy service '{raw_name}'. Supported values: {supported}."
        )
    return service_name


def _format_validation_error(context: str, error: ValidationError) -> str:
    errors = error.errors()
    if not errors:
        return f"{context} is invalid."

    first_error = errors[0]
    message = first_error["msg"]
    if message.startswith("Value error, "):
        message = message.removeprefix("Value error, ")

    location = first_error.get("loc", ())
    if location:
        field_path = ".".join(str(part) for part in location)
        return f"{context} is invalid at {field_path}: {message}"

    return f"{context} is invalid: {message}"


class PolicyModel(BaseModel):
    """Base class with shared JSON5 load / JSON dump helpers."""

    @classmethod
    def parse(cls, value: object, *, context: str) -> Self:
        try:
            return cls.model_validate(value)
        except ValidationError as error:
            raise AgentsPolicyError(_format_validation_error(context, error)) from error

    @classmethod
    def load_file(cls, path: Path, *, context: str) -> Self:
        """Decode a JSON or JSON5 file. Returns an empty instance when missing."""
        if not path.exists():
            return cls()
        try:
            data = json5.loads(path.read_text(encoding="utf-8"))
        except ValueError as error:
            raise AgentsPolicyError(
                f"{context} contains invalid JSON: {error}"
            ) from error
        return cls.parse(data, context=context)

    def dump_text(self) -> str | None:
        """Render the model as JSON text. Returns None when the payload is empty."""
        payload = self.model_dump(by_alias=True, exclude_none=True, mode="json")
        if not payload:
            return None
        return json.dumps(payload, indent=2) + "\n"

    def write_or_remove(self, path: Path) -> bool:
        """Write the rendered model to *path*, or delete the file when empty."""
        text = self.dump_text()
        if text is not None:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
            return True
        if path.exists():
            path.unlink()
        return False


class AiPolicy(PolicyModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    services: list[SupportedService] = Field(
        default_factory=lambda: list(SupportedService)
    )
    protected_files: list[str] = Field(default_factory=list, alias="protectedFiles")
    excluded_files: list[str] = Field(default_factory=list, alias="excludedFiles")
    terminal_auto_approve: dict[str, TerminalApprovalValue] = Field(
        default_factory=dict, alias="terminalAutoApprove"
    )
    edit_auto_approve: dict[str, bool] = Field(
        default_factory=dict, alias="editAutoApprove"
    )

    @field_validator("services", mode="before")
    @classmethod
    def _normalize_services(cls, value: object) -> list[SupportedService]:
        if value is None:
            return list(SupportedService)
        if not isinstance(value, list):
            raise ValueError("Policy 'services' must be an array of strings.")
        services: list[SupportedService] = []
        for entry in cast(list[object], value):
            if not isinstance(entry, str) or entry.strip() == "":
                raise ValueError(
                    "Policy 'services' must contain only non-empty strings."
                )
            try:
                service_name = normalize_service_name(entry)
            except AgentsPolicyError as error:
                raise ValueError(str(error)) from error
            if service_name not in services:
                services.append(service_name)
        return services

    @field_validator("protected_files", mode="before")
    @classmethod
    def _validate_protected_files(cls, value: object) -> list[str]:
        return _validate_string_list(value, "protectedFiles")

    @field_validator("excluded_files", mode="before")
    @classmethod
    def _validate_excluded_files(cls, value: object) -> list[str]:
        return _validate_string_list(value, "excludedFiles")

    def to_json_object(self) -> dict[str, object]:
        return self.model_dump(by_alias=True, exclude_unset=True, mode="json")

    def dump_text(self) -> str | None:
        payload = self.to_json_object()
        if not payload:
            return None
        return json.dumps(payload, indent=2) + "\n"


def _validate_string_list(value: object, field_name: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"Policy '{field_name}' must be an array of strings.")
    items = cast(list[object], value)
    if not all(isinstance(item, str) for item in items):
        raise ValueError(f"Policy '{field_name}' must contain only strings.")
    return cast(list[str], items)


class ClaudePermissions(PolicyModel):
    """Claude Code permissions block."""

    model_config = ConfigDict(extra="allow")

    deny: list[str] = Field(default_factory=list)

    def has_content(self) -> bool:
        return bool(self.deny) or bool(self.model_extra)


class ClaudeSettings(PolicyModel):
    """Claude Code project settings file."""

    model_config = ConfigDict(extra="allow")

    permissions: ClaudePermissions | None = None


class VscodeSettings(PolicyModel):
    """VS Code / Copilot settings file. Unknown keys round-trip via extras."""

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    files_associations: dict[str, str] | None = Field(
        default=None, alias="files.associations"
    )
    copilot_enable: dict[str, bool] | None = Field(
        default=None, alias="github.copilot.enable"
    )
    terminal_auto_approve: dict[str, TerminalApprovalValue] | None = Field(
        default=None, alias="chat.tools.terminal.autoApprove"
    )
    edit_auto_approve: dict[str, bool] | None = Field(
        default=None, alias="chat.tools.edits.autoApprove"
    )


class AgentsConfig(PolicyModel):
    """Unified ``.agents/config.json`` document. Extras are preserved."""

    model_config = ConfigDict(extra="allow")

    policy: AiPolicy | None = None

    def dump_text(self) -> str | None:
        payload: dict[str, object] = dict(self.model_extra or {})
        if self.policy is not None:
            payload["policy"] = self.policy.to_json_object()
        if not payload:
            return None
        return json.dumps(payload, indent=2) + "\n"


def parse_ai_policy(value: object, *, context: str) -> AiPolicy:
    """Module-level convenience wrapper around ``AiPolicy.parse``."""
    return AiPolicy.parse(value, context=context)
