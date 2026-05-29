from enum import StrEnum


class SupportedService(StrEnum):
    GEMINI = "gemini"
    CLAUDE = "claude"
    COPILOT = "copilot"


SERVICE_ALIASES: dict[str, SupportedService] = {
    SupportedService.GEMINI.value: SupportedService.GEMINI,
    SupportedService.CLAUDE.value: SupportedService.CLAUDE,
    "claude-code": SupportedService.CLAUDE,
    SupportedService.COPILOT.value: SupportedService.COPILOT,
    "github-copilot": SupportedService.COPILOT,
}
