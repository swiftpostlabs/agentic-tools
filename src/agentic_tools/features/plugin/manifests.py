"""Build the Claude Code plugin and marketplace manifests from the skills catalog.

Claude has no concept of skill-level visibility: a plugin publishes exactly the
skill directories its manifest enumerates. The enumeration produced here is
therefore the only thing keeping a `repo-local` skill out of a published plugin,
which is why it is generated from `shareable-skills.visibility` rather than
hand-maintained. See the `ref-sp-agents-claude-marketplaces` skill.
"""

import json
from pathlib import Path
import re

import json5
from pydantic import BaseModel, ConfigDict, Field

CONFIG_PATH = Path(".agents") / "config.json"
VERSION_PATH = Path("VERSION")
PLUGIN_MANIFEST_PATH = Path(".claude-plugin") / "plugin.json"
MARKETPLACE_MANIFEST_PATH = Path(".claude-plugin") / "marketplace.json"

SKILL_FILE_NAME = "SKILL.md"
VISIBILITY_KEY = "shareable-skills.visibility"
FRONTMATTER_DELIMITER = "---"

_FRONTMATTER_FIELD = re.compile(r"^\s*(?P<key>[A-Za-z0-9_.-]+):\s*(?P<value>.*)$")


class Owner(BaseModel):
    """Marketplace owner block."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    email: str | None = None
    url: str | None = None


class MarketplaceConfig(BaseModel):
    """Catalog-level configuration."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    owner: Owner


class PluginConfig(BaseModel):
    """The `plugin` section of `.agents/config.json`."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    display_name: str = Field(alias="displayName")
    description: str
    marketplace: MarketplaceConfig
    category: str | None = None
    license: str | None = None
    repository: str | None = None
    keywords: list[str] = Field(default_factory=list)
    skills_root: str = Field(alias="skillsRoot", default=".agents/skills")
    publish_visibility: list[str] = Field(
        alias="publishVisibility", default_factory=lambda: ["public"]
    )


class PublishableSkill(BaseModel):
    """A skill selected for publication."""

    name: str
    visibility: str
    path: str


class ManifestSet(BaseModel):
    """The generated manifests, keyed by their repo-relative path."""

    plugin: str
    marketplace: str


def parse_frontmatter(text: str) -> dict[str, str]:
    """Read a SKILL.md YAML frontmatter block into a flat key/value mapping.

    Skill frontmatter is a flat scalar map (the Agent Skills spec treats
    `metadata` as a string-to-string mapping, and its keys are already dotted),
    so nested keys are recorded under their bare name and no YAML parser is
    needed.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != FRONTMATTER_DELIMITER:
        raise ValueError("missing opening frontmatter delimiter")

    fields: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == FRONTMATTER_DELIMITER:
            return fields

        match = _FRONTMATTER_FIELD.match(line)
        if match is None:
            continue

        value = match.group("value").strip()
        if value:
            fields[match.group("key")] = value.strip('"').strip("'")

    raise ValueError("missing closing frontmatter delimiter")


def read_version(root: Path) -> str:
    """Read the repo-wide version that every manifest derives from."""
    return (root / VERSION_PATH).read_text(encoding="utf-8").strip()


def read_plugin_config(root: Path) -> PluginConfig:
    """Read the `plugin` section of the agents config."""
    parsed: object = json5.loads((root / CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(parsed, dict):
        raise ValueError(f"{CONFIG_PATH} must contain a JSON object")

    section = parsed.get("plugin")
    if section is None:
        raise ValueError(f"{CONFIG_PATH} is missing the 'plugin' section")

    return PluginConfig.model_validate(section)


def collect_publishable_skills(
    root: Path, config: PluginConfig
) -> list[PublishableSkill]:
    """Select the skills whose visibility permits publication."""
    skills_root = root / config.skills_root
    if not skills_root.is_dir():
        raise ValueError(f"skills root not found: {config.skills_root}")

    allowed = set(config.publish_visibility)
    published: list[PublishableSkill] = []
    for skill_directory in sorted(skills_root.iterdir()):
        skill_file = skill_directory / SKILL_FILE_NAME
        if not skill_file.is_file():
            continue

        try:
            fields = parse_frontmatter(skill_file.read_text(encoding="utf-8"))
        except ValueError as error:
            raise ValueError(f"{skill_directory.name}: {error}") from error

        visibility = fields.get(VISIBILITY_KEY)
        if visibility is None:
            raise ValueError(f"{skill_directory.name}: missing {VISIBILITY_KEY}")

        if visibility in allowed:
            published.append(
                PublishableSkill(
                    name=skill_directory.name,
                    visibility=visibility,
                    path=f"./{config.skills_root}/{skill_directory.name}",
                )
            )

    if not published:
        raise ValueError("no skills matched the configured publish visibility")

    return published


def build_plugin_manifest(
    config: PluginConfig, version: str, skills: list[PublishableSkill]
) -> dict[str, object]:
    """Build `.claude-plugin/plugin.json`.

    `version` lives here and *only* here: Claude resolves plugin.json's version
    ahead of the marketplace entry's and silently ignores the latter, so
    declaring it in both would let a stale value mask the real one.
    """
    manifest: dict[str, object] = {
        "name": config.name,
        "displayName": config.display_name,
        "version": version,
        "description": config.description,
    }
    if config.license is not None:
        manifest["license"] = config.license
    if config.repository is not None:
        manifest["repository"] = config.repository
    if config.keywords:
        manifest["keywords"] = config.keywords

    manifest["skills"] = [skill.path for skill in skills]
    return manifest


def build_marketplace_manifest(config: PluginConfig, version: str) -> dict[str, object]:
    """Build `.claude-plugin/marketplace.json`.

    The plugin entry's source is the marketplace root, so the plugin root is the
    repo root and the enumerated skill paths never traverse outside it.
    """
    entry: dict[str, object] = {
        "name": config.name,
        "source": "./",
        "description": config.description,
    }
    if config.category is not None:
        entry["category"] = config.category
    if config.keywords:
        entry["keywords"] = config.keywords

    return {
        "name": config.marketplace.name,
        "owner": config.marketplace.owner.model_dump(exclude_none=True),
        "metadata": {"description": config.description, "version": version},
        "plugins": [entry],
    }


def serialize(manifest: dict[str, object]) -> str:
    """Render a manifest as the exact text written to disk."""
    return json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"


def build_manifests(root: Path) -> ManifestSet:
    """Build both manifests from the current config, version, and skills catalog."""
    config = read_plugin_config(root)
    version = read_version(root)
    skills = collect_publishable_skills(root, config)

    return ManifestSet(
        plugin=serialize(build_plugin_manifest(config, version, skills)),
        marketplace=serialize(build_marketplace_manifest(config, version)),
    )


def manifest_targets(root: Path) -> dict[Path, Path]:
    """Map each manifest's repo-relative path to its absolute path."""
    return {
        PLUGIN_MANIFEST_PATH: root / PLUGIN_MANIFEST_PATH,
        MARKETPLACE_MANIFEST_PATH: root / MARKETPLACE_MANIFEST_PATH,
    }


def write_manifests(root: Path, manifests: ManifestSet) -> list[Path]:
    """Write both manifests, returning the repo-relative paths written."""
    contents = {
        PLUGIN_MANIFEST_PATH: manifests.plugin,
        MARKETPLACE_MANIFEST_PATH: manifests.marketplace,
    }
    targets = manifest_targets(root)

    written: list[Path] = []
    for relative_path, content in contents.items():
        target = targets[relative_path]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        written.append(relative_path)

    return written


def find_drifted_manifests(root: Path, manifests: ManifestSet) -> list[Path]:
    """Return the manifests on disk that differ from a freshly generated build."""
    contents = {
        PLUGIN_MANIFEST_PATH: manifests.plugin,
        MARKETPLACE_MANIFEST_PATH: manifests.marketplace,
    }
    targets = manifest_targets(root)

    drifted: list[Path] = []
    for relative_path, expected in contents.items():
        target = targets[relative_path]
        if not target.is_file() or target.read_text(encoding="utf-8") != expected:
            drifted.append(relative_path)

    return drifted
