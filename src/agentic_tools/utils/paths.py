from enum import StrEnum
from pathlib import Path


class AgenticToolsPaths(StrEnum):
    ROOT = ".agents"
    TASKS = "tasks"
    PLAYGROUND = "playground"
    CONFIG = "config.json"
    POLICY = "policy.json"
    LEGACY_POLICY = ".ai-policy.json"
    SKILLS = "skills"
    SKILLS_CONFIG = "skills.json"

    @classmethod
    def root_path(cls) -> Path:
        return Path(cls.ROOT.value)

    @classmethod
    def tasks_path(cls) -> Path:
        return cls.root_path() / cls.TASKS.value

    @classmethod
    def playground_path(cls) -> Path:
        return cls.root_path() / cls.PLAYGROUND.value

    @classmethod
    def config_path(cls) -> Path:
        return cls.root_path() / cls.CONFIG.value

    @classmethod
    def policy_path(cls) -> Path:
        return cls.root_path() / cls.POLICY.value

    @classmethod
    def legacy_policy_path(cls) -> Path:
        return Path(cls.LEGACY_POLICY.value)

    @classmethod
    def skills_path(cls) -> Path:
        return cls.root_path() / cls.SKILLS.value

    @classmethod
    def skills_config_path(cls) -> Path:
        return cls.root_path() / cls.SKILLS_CONFIG.value


class GeminiPaths(StrEnum):
    AI_EXCLUDE = ".aiexclude"

    @classmethod
    def ai_exclude_path(cls) -> Path:
        return Path(cls.AI_EXCLUDE.value)


class ClaudePaths(StrEnum):
    PROJECT_ROOT = ".claude"
    HOME_ROOT = ".claude"
    SETTINGS = "settings.json"
    SKILLS = "skills"

    @classmethod
    def project_root_path(cls) -> Path:
        return Path(cls.PROJECT_ROOT.value)

    @classmethod
    def home_root_path(cls) -> Path:
        return Path(cls.HOME_ROOT.value)

    @classmethod
    def project_settings_path(cls) -> Path:
        return cls.project_root_path() / cls.SETTINGS.value

    @classmethod
    def home_settings_path(cls) -> Path:
        return cls.home_root_path() / cls.SETTINGS.value

    @classmethod
    def skills_path(cls) -> Path:
        return cls.project_root_path() / cls.SKILLS.value


class CopilotPaths(StrEnum):
    PROJECT_ROOT = ".github"
    PROJECT_INSTRUCTIONS = "copilot-instructions.md"
    HOME_ROOT = ".copilot"
    INSTRUCTIONS = "default.instructions.md"

    @classmethod
    def project_root_path(cls) -> Path:
        return Path(cls.PROJECT_ROOT.value)

    @classmethod
    def home_root_path(cls) -> Path:
        return Path(cls.HOME_ROOT.value)

    @classmethod
    def project_instructions_path(cls) -> Path:
        return cls.project_root_path() / cls.PROJECT_INSTRUCTIONS.value

    @classmethod
    def instructions_path(cls) -> Path:
        return cls.home_root_path() / cls.INSTRUCTIONS.value


class VscodePaths(StrEnum):
    ROOT = ".vscode"
    SETTINGS = "settings.json"

    @classmethod
    def root_path(cls) -> Path:
        return Path(cls.ROOT.value)

    @classmethod
    def settings_path(cls) -> Path:
        return cls.root_path() / cls.SETTINGS.value
