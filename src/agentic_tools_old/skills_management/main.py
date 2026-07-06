"""Manage skills between repositories by listing, linking, and unlinking skill directories.

Canonical usage:
- List skills in the current repository: `uv run agentic-tools skills list`
- Link one skill to the global skills directory: `uv run agentic-tools skills link ref-skills-authoring --global`
- Link one skill from another repo into the current repo: `uv run agentic-tools skills link ref-skills-authoring --from ../python-uv-template`
- Sync all skills declared in `.agents/config.json` into the current repo: `uv run agentic-tools skills sync`

"""

from collections.abc import Collection
import json
from json import JSONDecodeError
from dataclasses import dataclass
from importlib.util import find_spec
import os
from pathlib import Path
import subprocess
from typing import Any
from typing import Sequence

from agentic_tools_old.utils.paths import AgenticToolsPaths

DEFAULT_GLOBAL_SKILLS_DIR = Path.home() / AgenticToolsPaths.skills_path()
EXPORTABLE_VISIBILITY = frozenset({"public", "organization"})
SHAREABILITY_WIZARD = "tool-sp-make-skill-shareable"
PACKAGE_SOURCE_PREFIX = "package:"
PACKAGED_SKILLS_DIRNAME = "shareable_skills"
PACKAGE_INSTALL_BOUNDARY_DIRS = frozenset({"site-packages", "dist-packages"})
SKILLS_CONFIG_SECTION = "skills"
SKILL_ALIAS_REGISTRY_PATH = (
    "ref-sp-agents-shareable-skills",
    "references",
    "registry.json",
)
GITIGNORE_FILENAME = ".gitignore"
AGENTIC_TOOLS_REPO_URL = "https://github.com/swiftpostlabs/agentic-tools"


class SkillsManagementError(Exception):
    """Raised when a skills-management action cannot be completed safely."""


@dataclass(frozen=True)
class SkillManifest:
    name: str
    directory: Path
    domain: str | None
    visibility: str | None
    requires: tuple[str, ...]
    reason: str | None


@dataclass(frozen=True)
class ConfiguredSkillSource:
    source: str
    skills: tuple[str, ...]
    url: str | None = None


def strip_yaml_string(value: str) -> str:
    trimmed = value.strip()
    if len(trimmed) >= 2 and trimmed[0] == trimmed[-1] and trimmed[0] in {'"', "'"}:
        return trimmed[1:-1]
    return trimmed


def parse_frontmatter(text: str) -> dict[str, str | dict[str, str]]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise SkillsManagementError("Skill file is missing YAML frontmatter.")

    frontmatter: dict[str, str | dict[str, str]] = {}
    current_mapping: dict[str, str] | None = None

    for line in lines[1:]:
        if line.strip() == "---":
            return frontmatter

        if not line.strip():
            continue

        indent = len(line) - len(line.lstrip(" "))
        if indent == 0:
            key, separator, raw_value = line.partition(":")
            if separator == "":
                raise SkillsManagementError(f"Invalid frontmatter line: {line}")

            key = key.strip()
            raw_value = raw_value.strip()
            if raw_value == "":
                current_mapping = {}
                frontmatter[key] = current_mapping
                continue

            frontmatter[key] = strip_yaml_string(raw_value)
            current_mapping = None
            continue

        if current_mapping is None:
            continue

        nested_key, separator, raw_value = line.strip().partition(":")
        if separator == "":
            raise SkillsManagementError(f"Invalid nested frontmatter line: {line}")

        current_mapping[nested_key.strip()] = strip_yaml_string(raw_value.strip())

    raise SkillsManagementError(
        "Skill file is missing the closing frontmatter delimiter."
    )


def split_requires(value: str | None) -> tuple[str, ...]:
    if value is None:
        return ()

    # Match the sharing spec and validator: requires is whitespace- or
    # comma-delimited, so both "a b" and "a, b" yield the same dependencies.
    return tuple(entry for entry in value.replace(",", " ").split() if entry)


def is_skills_root(path: Path) -> bool:
    return (
        path.name == AgenticToolsPaths.SKILLS.value
        and path.parent.name == AgenticToolsPaths.ROOT.value
    )


def to_skills_root(path: Path) -> Path:
    return path if is_skills_root(path) else path / AgenticToolsPaths.skills_path()


def resolve_path(raw_path: str | None) -> Path:
    base_path = Path.cwd() if raw_path is None else Path(raw_path)
    return base_path.expanduser().resolve()


def resolve_source_skills_root(path: Path) -> Path:
    skills_root = to_skills_root(path)
    if skills_root.exists():
        if not skills_root.is_dir():
            raise SkillsManagementError(
                f"Skills directory path is not a directory: {skills_root}"
            )
        return skills_root

    if (
        path.exists()
        and path.is_dir()
        and any(
            child.is_dir() and (child / "SKILL.md").is_file()
            for child in path.iterdir()
        )
    ):
        return path

    raise SkillsManagementError(f"Could not find skills directory at {skills_root}")


def resolve_packaged_skills_root(package_root: Path) -> Path | None:
    packaged_skills_root = package_root / PACKAGED_SKILLS_DIRNAME
    if not packaged_skills_root.is_dir():
        return None

    if any(
        child.is_dir() and (child / "SKILL.md").is_file()
        for child in packaged_skills_root.iterdir()
    ):
        return packaged_skills_root

    return None


def resolve_repo_skills_root(
    search_root: Path, *, stop_before: Collection[str] = ()
) -> Path | None:
    stop_names = set(stop_before)
    for possible_root in [search_root, *search_root.parents]:
        if possible_root.name in stop_names:
            break
        if (possible_root / AgenticToolsPaths.skills_path()).is_dir():
            return possible_root

    return None


def resolve_search_root(path: Path) -> Path:
    normalized_path = path.resolve()
    return normalized_path.parent if normalized_path.is_file() else normalized_path


def iter_package_search_roots(
    spec_origin: str | None,
    search_locations: Sequence[str] | None,
) -> tuple[Path, ...]:
    search_roots: list[Path] = []

    if search_locations is not None:
        search_roots.extend(Path(entry) for entry in search_locations)
    if spec_origin is not None:
        search_roots.append(Path(spec_origin))

    return tuple(search_roots)


def resolve_destination_skills_root(path: Path, *, use_global: bool) -> Path:
    if use_global:
        return DEFAULT_GLOBAL_SKILLS_DIR

    return to_skills_root(path)


def to_repo_root(path: Path) -> Path:
    return path.parent.parent if is_skills_root(path) else path


def require_json_object(value: Any, *, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise SkillsManagementError(f"{context} must be a JSON object.")
    return value


def require_string_list(value: Any, *, context: str) -> tuple[str, ...]:
    if not isinstance(value, list):
        raise SkillsManagementError(f"{context} must be an array of strings.")

    entries: list[str] = []
    for entry in value:
        if not isinstance(entry, str) or entry.strip() == "":
            raise SkillsManagementError(
                f"{context} must contain only non-empty strings."
            )
        entries.append(entry)

    if not entries:
        raise SkillsManagementError(f"{context} must not be empty.")

    return tuple(entries)


def parse_configured_skill_sources(text: str) -> tuple[ConfiguredSkillSource, ...]:
    try:
        parsed = json.loads(text)
    except JSONDecodeError as error:
        raise SkillsManagementError(
            f"Skills config is not valid JSON: {error}"
        ) from error

    config = require_json_object(parsed, context="Skills config")
    skills_config = (
        require_json_object(
            config[SKILLS_CONFIG_SECTION], context="Agents config skills"
        )
        if SKILLS_CONFIG_SECTION in config
        else config
    )
    raw_sources = skills_config.get("sources")
    if not isinstance(raw_sources, list) or not raw_sources:
        raise SkillsManagementError(
            "Skills config must define a non-empty 'sources' array."
        )

    configured_sources: list[ConfiguredSkillSource] = []
    for index, raw_source in enumerate(raw_sources, start=1):
        source_object = require_json_object(
            raw_source,
            context=f"Skills config source #{index}",
        )

        raw_from = source_object.get("from")
        if not isinstance(raw_from, str) or raw_from.strip() == "":
            raise SkillsManagementError(
                f"Skills config source #{index} is missing a non-empty 'from' value."
            )

        raw_url = source_object.get("url")
        source_url = (
            raw_url.strip()
            if isinstance(raw_url, str) and raw_url.strip() != ""
            else None
        )

        configured_sources.append(
            ConfiguredSkillSource(
                source=raw_from,
                skills=require_string_list(
                    source_object.get("skills"),
                    context=f"Skills config source '{raw_from}' skills",
                ),
                url=source_url,
            )
        )

    return tuple(configured_sources)


def agents_config_has_skills(config_path: Path) -> bool:
    try:
        parsed = json.loads(config_path.read_text(encoding="utf-8"))
    except OSError, JSONDecodeError:
        return True

    if not isinstance(parsed, dict):
        return True

    return isinstance(parsed.get(SKILLS_CONFIG_SECTION), dict)


def load_configured_skill_sources(
    config_path: Path,
) -> tuple[ConfiguredSkillSource, ...]:
    if not config_path.exists():
        raise SkillsManagementError(f"Could not find skills config at {config_path}")
    if not config_path.is_file():
        raise SkillsManagementError(f"Skills config path is not a file: {config_path}")

    return parse_configured_skill_sources(config_path.read_text(encoding="utf-8"))


def infer_config_base_root(config_path: Path) -> Path:
    if config_path.parent.name == AgenticToolsPaths.ROOT.value:
        return config_path.parent.parent
    return config_path.parent


def resolve_sync_config_path(
    destination_path: Path,
    *,
    use_global: bool,
    raw_config: str | None,
) -> Path:
    if raw_config is not None:
        return Path(raw_config).expanduser().resolve()

    if use_global:
        raise SkillsManagementError("sync with --global requires --config")

    agents_dir = to_repo_root(destination_path) / AgenticToolsPaths.root_path()
    agents_config = agents_dir / AgenticToolsPaths.CONFIG.value
    legacy_skills_config = agents_dir / AgenticToolsPaths.SKILLS_CONFIG.value
    if agents_config.is_file():
        if (
            agents_config_has_skills(agents_config)
            or not legacy_skills_config.is_file()
        ):
            return agents_config

    if legacy_skills_config.is_file():
        return legacy_skills_config

    return agents_config


def resolve_package_source_root(package_name: str) -> Path:
    candidate_names = [package_name]
    underscored_name = package_name.replace("-", "_")
    if underscored_name != package_name:
        candidate_names.append(underscored_name)
    legacy_underscored_name = f"{underscored_name}_old"
    if legacy_underscored_name not in candidate_names:
        candidate_names.append(legacy_underscored_name)

    for candidate_name in candidate_names:
        spec = find_spec(candidate_name)
        if spec is None:
            continue

        search_roots = iter_package_search_roots(
            spec.origin,
            (
                tuple(spec.submodule_search_locations)
                if spec.submodule_search_locations is not None
                else None
            ),
        )

        for search_root in search_roots:
            start_path = resolve_search_root(search_root)

            repo_root = resolve_repo_skills_root(
                start_path,
                stop_before=PACKAGE_INSTALL_BOUNDARY_DIRS,
            )
            if repo_root is not None:
                return repo_root

        for search_root in search_roots:
            start_path = resolve_search_root(search_root)

            packaged_skills_root = resolve_packaged_skills_root(start_path)
            if packaged_skills_root is not None:
                return packaged_skills_root

    attempted_names = ", ".join(candidate_names)
    raise SkillsManagementError(
        f"Could not resolve package source '{package_name}'. Checked module names: {attempted_names}."
    )


def resolve_configured_source_root(config_source: str, *, config_path: Path) -> Path:
    if config_source.startswith(PACKAGE_SOURCE_PREFIX):
        package_name = config_source.removeprefix(PACKAGE_SOURCE_PREFIX).strip()
        if package_name == "":
            raise SkillsManagementError(
                "Package skill sources must include a package name after 'package:'."
            )
        return resolve_package_source_root(package_name)

    source_path = Path(config_source).expanduser()
    if not source_path.is_absolute():
        source_path = infer_config_base_root(config_path) / source_path

    return source_path.resolve()


def read_skill_manifest(skill_directory: Path) -> SkillManifest:
    skill_file = skill_directory / "SKILL.md"
    frontmatter = parse_frontmatter(skill_file.read_text(encoding="utf-8"))

    raw_name = frontmatter.get("name")
    if not isinstance(raw_name, str) or raw_name == "":
        raise SkillsManagementError(
            f"Skill at {skill_directory} is missing a valid name."
        )

    if raw_name != skill_directory.name:
        raise SkillsManagementError(
            f"Skill name '{raw_name}' does not match directory '{skill_directory.name}'."
        )

    metadata = frontmatter.get("metadata", {})
    metadata_mapping = metadata if isinstance(metadata, dict) else {}
    # Portability fields live under the metadata.shareable-skills.* namespace
    # (see .agents/skills/ref-sp-agents-shareable-skills/references/spec.md).
    domain = metadata_mapping.get("shareable-skills.domain")
    visibility = metadata_mapping.get("shareable-skills.visibility")
    requires = split_requires(metadata_mapping.get("shareable-skills.requires"))
    reason = metadata_mapping.get("shareable-skills.reason")

    return SkillManifest(
        name=raw_name,
        directory=skill_directory,
        domain=domain,
        visibility=visibility,
        requires=requires,
        reason=reason,
    )


def discover_skill_manifests(source_path: Path) -> dict[str, SkillManifest]:
    skills_root = resolve_source_skills_root(source_path)
    manifests: dict[str, SkillManifest] = {}

    for child in sorted(skills_root.iterdir(), key=lambda path: path.name):
        if not child.is_dir() or not (child / "SKILL.md").exists():
            continue

        manifest = read_skill_manifest(child)
        manifests[manifest.name] = manifest

    return manifests


def load_skill_aliases(source_path: Path) -> dict[str, str]:
    """Read the source's rename registry so old skill names still resolve.

    Aliases map a pre-rename skill name to its current name. Missing or malformed
    registries degrade gracefully to an empty map, so aliasing never turns into a
    hard failure of its own.
    """
    registry_path = resolve_source_skills_root(source_path).joinpath(
        *SKILL_ALIAS_REGISTRY_PATH
    )
    if not registry_path.is_file():
        return {}

    try:
        parsed = json.loads(registry_path.read_text(encoding="utf-8"))
    except OSError, JSONDecodeError:
        return {}

    if not isinstance(parsed, dict):
        return {}

    raw_aliases = parsed.get("aliases")
    if not isinstance(raw_aliases, dict):
        return {}

    return {
        old_name: new_name
        for old_name, new_name in raw_aliases.items()
        if isinstance(old_name, str) and isinstance(new_name, str)
    }


def lookup_manifest(
    name: str,
    manifests: dict[str, SkillManifest],
    aliases: dict[str, str],
) -> SkillManifest | None:
    direct = manifests.get(name)
    if direct is not None:
        return direct

    canonical = aliases.get(name)
    if canonical is None:
        return None

    return manifests.get(canonical)


def collect_alias_renames(
    requested_names: Sequence[str],
    manifests: dict[str, SkillManifest],
    aliases: dict[str, str],
) -> dict[str, str]:
    """Map each requested pre-rename name to the canonical skill it resolves to."""
    renames: dict[str, str] = {}
    for name in deduplicate_preserving_order(requested_names):
        if name in manifests:
            continue

        canonical = aliases.get(name)
        if canonical is not None and canonical in manifests:
            renames[name] = canonical

    return renames


def describe_alias_redirects(
    requested_names: Sequence[str],
    manifests: dict[str, SkillManifest],
    aliases: dict[str, str],
) -> list[str]:
    return [
        f"Note: skill '{old_name}' was renamed to '{new_name}'; "
        "update your configuration to use the new name."
        for old_name, new_name in collect_alias_renames(
            requested_names, manifests, aliases
        ).items()
    ]


def select_config_skills_section(raw_config: Any) -> dict[str, Any]:
    if isinstance(raw_config, dict) and isinstance(
        raw_config.get(SKILLS_CONFIG_SECTION), dict
    ):
        return raw_config[SKILLS_CONFIG_SECTION]
    return raw_config


def apply_config_alias_renames(
    config_path: Path,
    renames_by_index: dict[int, dict[str, str]],
    *,
    dry_run: bool,
) -> list[str]:
    """Rewrite pre-rename skill names in the sync config to their aliases.

    Keeps the config self-healing: once a renamed skill is synced, the stored
    name converges to the canonical one instead of relying on the alias forever.
    """
    if not renames_by_index:
        return []

    raw_config = json.loads(config_path.read_text(encoding="utf-8"))
    sources = select_config_skills_section(raw_config)["sources"]

    messages: list[str] = []
    changed = False
    for index, renames in renames_by_index.items():
        source = sources[index]
        original_skills: list[str] = source["skills"]
        updated_skills = deduplicate_preserving_order(
            [renames.get(name, name) for name in original_skills]
        )
        if updated_skills == original_skills:
            continue

        for old_name, new_name in renames.items():
            verb = "Would update" if dry_run else "Updated"
            messages.append(f"{verb} config: '{old_name}' -> '{new_name}'")

        if not dry_run:
            source["skills"] = updated_skills
            changed = True

    if changed:
        config_path.write_text(
            json.dumps(raw_config, indent=2) + "\n", encoding="utf-8"
        )

    return messages


def build_make_shareable_recommendation(skill_name: str) -> str:
    return (
        f"Recommended next step: use /{SHAREABILITY_WIZARD} on '{skill_name}' to decide "
        "whether it should be shareable or repo-local and to add "
        "domain, visibility, requires, and reason if needed."
    )


def ensure_shareable_manifest(
    manifest: SkillManifest,
    manifests: dict[str, SkillManifest],
    aliases: dict[str, str] | None = None,
) -> None:
    aliases = aliases or {}
    if manifest.visibility is None:
        raise SkillsManagementError(
            f"Skill '{manifest.name}' is missing shareability metadata. "
            f"{build_make_shareable_recommendation(manifest.name)}"
        )

    if manifest.visibility not in EXPORTABLE_VISIBILITY:
        reason = manifest.reason or "No reason was provided."
        raise SkillsManagementError(
            f"Skill '{manifest.name}' is not shareable. {reason} "
            f"{build_make_shareable_recommendation(manifest.name)}"
        )

    for dependency_name in manifest.requires:
        dependency = lookup_manifest(dependency_name, manifests, aliases)
        if dependency is None:
            raise SkillsManagementError(
                f"Skill '{manifest.name}' depends on unknown skill '{dependency_name}'."
            )

        if dependency.visibility is None:
            raise SkillsManagementError(
                f"Skill '{manifest.name}' depends on '{dependency_name}', but that skill is "
                "missing shareability metadata. "
                f"{build_make_shareable_recommendation(dependency_name)}"
            )

        if dependency.visibility not in EXPORTABLE_VISIBILITY:
            raise SkillsManagementError(
                f"Skill '{manifest.name}' depends on '{dependency_name}', which is not shareable."
            )


def resolve_selected_skills(
    manifests: dict[str, SkillManifest],
    requested_names: Sequence[str],
    aliases: dict[str, str] | None = None,
) -> list[SkillManifest]:
    aliases = aliases or {}
    resolved: list[SkillManifest] = []
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(skill_name: str) -> None:
        manifest = lookup_manifest(skill_name, manifests, aliases)
        if manifest is None:
            raise SkillsManagementError(f"Unknown skill '{skill_name}'.")

        canonical_name = manifest.name
        if canonical_name in visited:
            return
        if canonical_name in visiting:
            raise SkillsManagementError(
                f"Circular skill dependency detected at '{canonical_name}'."
            )

        ensure_shareable_manifest(manifest, manifests, aliases)

        visiting.add(canonical_name)
        for dependency_name in manifest.requires:
            visit(dependency_name)
        visiting.remove(canonical_name)

        visited.add(canonical_name)
        resolved.append(manifest)

    for requested_name in requested_names:
        visit(requested_name)

    return resolved


def describe_skills(manifests: dict[str, SkillManifest]) -> str:
    if not manifests:
        return "No skills found."

    lines: list[str] = []
    for skill_name in sorted(manifests):
        manifest = manifests[skill_name]
        domain = manifest.domain or "missing"
        visibility = manifest.visibility or "missing"
        requires = " ".join(manifest.requires) if manifest.requires else "-"
        line = (
            f"{manifest.name}: domain {domain}; "
            f"visibility {visibility}; requires {requires}"
        )
        if manifest.reason:
            line = f"{line}; reason {manifest.reason}"
        lines.append(line)

    return "\n".join(lines)


def resolve_existing_symlink_target(path: Path) -> Path:
    target = path.readlink()
    if target.is_absolute():
        return target.resolve(strict=False)

    return (path.parent / target).resolve(strict=False)


def is_windows() -> bool:
    return os.name == "nt"


def is_directory_junction(path: Path) -> bool:
    isjunction = getattr(os.path, "isjunction", None)
    return bool(callable(isjunction) and isjunction(path))


def is_directory_link(path: Path) -> bool:
    return path.is_symlink() or (is_windows() and is_directory_junction(path))


def resolve_existing_link_target(path: Path) -> Path:
    if path.is_symlink():
        return resolve_existing_symlink_target(path)
    if is_windows() and is_directory_junction(path):
        return path.resolve(strict=False)
    raise SkillsManagementError(f"Path '{path}' is not a supported directory link.")


def remove_directory_link(path: Path) -> None:
    if path.is_symlink():
        path.unlink()
        return
    if is_windows() and is_directory_junction(path):
        path.rmdir()
        return
    raise SkillsManagementError(f"Path '{path}' is not a supported directory link.")


def create_windows_directory_junction(destination: Path, target: Path) -> None:
    result = subprocess.run(
        ["cmd", "/c", "mklink", "/J", str(destination), str(target)],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return

    details = result.stderr.strip() or result.stdout.strip() or "unknown error"
    raise SkillsManagementError(
        f"Could not create directory junction '{destination}' -> '{target}': {details}"
    )


def link_skill_directory(
    manifest: SkillManifest,
    destination_skills_dir: Path,
    *,
    dry_run: bool,
    force: bool,
) -> str:
    destination = destination_skills_dir / manifest.name
    target = manifest.directory.resolve()

    if dry_run:
        return f"Would link {destination} -> {target}"

    destination_skills_dir.mkdir(parents=True, exist_ok=True)

    if is_directory_link(destination):
        existing_target = resolve_existing_link_target(destination)
        if existing_target == target:
            return f"Already linked {destination} -> {target}"
        if not force:
            raise SkillsManagementError(
                f"Destination '{destination}' already points to '{existing_target}'. Use --force to replace it."
            )
        remove_directory_link(destination)
    elif destination.exists():
        raise SkillsManagementError(
            f"Destination '{destination}' already exists and is not a symlink. Remove it manually before linking."
        )

    try:
        destination.symlink_to(target, target_is_directory=True)
    except OSError as error:
        if is_windows() and getattr(error, "winerror", None) == 1314:
            create_windows_directory_junction(destination, target)
            return f"Linked {destination} -> {target}"
        raise SkillsManagementError(
            f"Could not create symlink '{destination}' -> '{target}': {error}"
        ) from error

    return f"Linked {destination} -> {target}"


def resolve_source_skill_directory(source_path: Path, skill_name: str) -> Path:
    skill_directory = resolve_source_skills_root(source_path) / skill_name
    if not (skill_directory / "SKILL.md").exists():
        raise SkillsManagementError(
            f"Could not find source skill '{skill_name}' at {skill_directory}"
        )
    return skill_directory.resolve(strict=False)


def unlink_skill_directory(
    skill_name: str,
    destination_skills_dir: Path,
    *,
    dry_run: bool,
    expected_target: Path | None,
) -> str:
    destination = destination_skills_dir / skill_name

    if dry_run:
        if expected_target is None:
            return f"Would unlink {destination}"
        return f"Would unlink {destination} -> {expected_target}"

    if not is_directory_link(destination):
        if destination.exists():
            raise SkillsManagementError(
                f"Destination '{destination}' exists and is not a symlink. Remove it manually if that is intended."
            )
        raise SkillsManagementError(
            f"Skill '{skill_name}' is not linked at '{destination}'."
        )

    existing_target = resolve_existing_link_target(destination)
    if expected_target is not None and existing_target != expected_target.resolve(
        strict=False
    ):
        raise SkillsManagementError(
            f"Destination '{destination}' points to '{existing_target}', not '{expected_target}'."
        )

    remove_directory_link(destination)
    return f"Unlinked {destination} -> {existing_target}"


def deduplicate_preserving_order(items: Sequence[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        ordered.append(item)
    return ordered


def find_missing_requested_skills(
    manifests: dict[str, SkillManifest],
    requested_names: Sequence[str],
    aliases: dict[str, str] | None = None,
) -> tuple[str, ...]:
    aliases = aliases or {}
    return tuple(
        skill_name
        for skill_name in deduplicate_preserving_order(requested_names)
        if lookup_manifest(skill_name, manifests, aliases) is None
    )


def describe_missing_configured_skills(
    missing_by_source: Sequence[tuple[str, Sequence[str]]],
) -> str:
    lines = ["Skills config references missing skills:"]
    for source, missing_names in missing_by_source:
        lines.append(f"- source '{source}': {', '.join(missing_names)}")
    return "\n".join(lines)


def cleanup_dead_skill_links(
    destination_skills_dir: Path,
    *,
    dry_run: bool,
) -> list[str]:
    if not destination_skills_dir.exists():
        return []
    if not destination_skills_dir.is_dir():
        raise SkillsManagementError(
            f"Destination skills path is not a directory: {destination_skills_dir}"
        )

    messages: list[str] = []
    for child in sorted(destination_skills_dir.iterdir(), key=lambda path: path.name):
        if not is_directory_link(child):
            continue

        target = resolve_existing_link_target(child)
        if target.exists():
            continue

        if dry_run:
            messages.append(f"Would remove dead link {child} -> {target}")
            continue

        remove_directory_link(child)
        messages.append(f"Removed dead link {child} -> {target}")

    return messages


def cleanup_unconfigured_skill_links(
    destination_skills_dir: Path,
    *,
    configured_skill_names: Collection[str],
    dry_run: bool,
) -> list[str]:
    if not destination_skills_dir.exists():
        return []
    if not destination_skills_dir.is_dir():
        raise SkillsManagementError(
            f"Destination skills path is not a directory: {destination_skills_dir}"
        )

    configured_names = set(configured_skill_names)
    messages: list[str] = []
    for child in sorted(destination_skills_dir.iterdir(), key=lambda path: path.name):
        if child.name in configured_names or not is_directory_link(child):
            continue

        target = resolve_existing_link_target(child)
        if dry_run:
            messages.append(f"Would remove unconfigured link {child} -> {target}")
            continue

        remove_directory_link(child)
        messages.append(f"Removed unconfigured link {child} -> {target}")

    return messages


def build_synced_skills_gitignore(
    skill_names: Collection[str],
    source_urls: Sequence[str] = (),
) -> str:
    lines = [
        "# Generated by agentic-tools `skills sync` — do not edit by hand.",
        f"# {AGENTIC_TOOLS_REPO_URL}",
    ]

    ordered_urls = deduplicate_preserving_order(source_urls)
    if ordered_urls:
        lines.append("# Skills synced from:")
        lines.extend(f"#   {url}" for url in ordered_urls)

    lines.append("# Ignores skill symlinks synced into this directory.")
    lines.extend(sorted(skill_names))
    return "\n".join(lines) + "\n"


def write_synced_skills_gitignore(
    destination_skills_dir: Path,
    skill_names: Collection[str],
    source_urls: Sequence[str] = (),
    *,
    dry_run: bool,
) -> list[str]:
    gitignore_path = destination_skills_dir / GITIGNORE_FILENAME
    content = build_synced_skills_gitignore(skill_names, source_urls)

    existing = (
        gitignore_path.read_text(encoding="utf-8") if gitignore_path.is_file() else None
    )
    if existing == content:
        return []

    if dry_run:
        return [f"Would update {gitignore_path}"]

    destination_skills_dir.mkdir(parents=True, exist_ok=True)
    gitignore_path.write_text(content, encoding="utf-8")
    return [f"Updated {gitignore_path}"]


def validate_destination_flags(*, use_global: bool, destination: str | None) -> None:
    if use_global and destination is not None:
        raise SkillsManagementError("cannot combine --global with --to")


def handle_list_command(source: str | None) -> int:
    manifests = discover_skill_manifests(resolve_path(source))
    print(describe_skills(manifests))
    return 0


def handle_link_command(
    *,
    skills: Sequence[str],
    source: str | None,
    destination: str | None,
    use_global: bool,
    dry_run: bool,
    force: bool,
) -> int:
    validate_destination_flags(use_global=use_global, destination=destination)

    source_path = resolve_path(source)
    manifests = discover_skill_manifests(source_path)
    aliases = load_skill_aliases(source_path)
    destination_skills_dir = resolve_destination_skills_root(
        resolve_path(destination),
        use_global=use_global,
    )

    requested_skills = deduplicate_preserving_order(skills)
    for message in describe_alias_redirects(requested_skills, manifests, aliases):
        print(message)

    for manifest in resolve_selected_skills(manifests, requested_skills, aliases):
        print(
            link_skill_directory(
                manifest,
                destination_skills_dir,
                dry_run=dry_run,
                force=force,
            )
        )

    return 0


def handle_sync_command(
    *,
    destination: str | None,
    use_global: bool,
    config: str | None,
    dry_run: bool,
    force: bool,
) -> int:
    validate_destination_flags(use_global=use_global, destination=destination)

    destination_path = resolve_path(destination)
    config_path = resolve_sync_config_path(
        destination_path,
        use_global=use_global,
        raw_config=config,
    )
    destination_skills_dir = resolve_destination_skills_root(
        destination_path,
        use_global=use_global,
    )

    missing_by_source: list[tuple[str, Sequence[str]]] = []
    manifests_to_link: list[SkillManifest] = []
    renames_by_index: dict[int, dict[str, str]] = {}
    source_urls: list[str] = []
    linked_skill_names: set[str] = set()
    for index, configured_source in enumerate(
        load_configured_skill_sources(config_path)
    ):
        source_root = resolve_configured_source_root(
            configured_source.source,
            config_path=config_path,
        )
        manifests = discover_skill_manifests(source_root)
        aliases = load_skill_aliases(source_root)

        requested_skill_names = deduplicate_preserving_order(configured_source.skills)
        missing_requested_skills = find_missing_requested_skills(
            manifests,
            requested_skill_names,
            aliases,
        )
        if missing_requested_skills:
            missing_by_source.append(
                (configured_source.source, missing_requested_skills)
            )
            continue

        renames = collect_alias_renames(requested_skill_names, manifests, aliases)
        if renames:
            renames_by_index[index] = renames

        if configured_source.url is not None:
            source_urls.append(configured_source.url)

        for manifest in resolve_selected_skills(
            manifests, requested_skill_names, aliases
        ):
            if manifest.name in linked_skill_names:
                raise SkillsManagementError(
                    f"Skill '{manifest.name}' is configured more than once across sync sources."
                )

            manifests_to_link.append(manifest)
            linked_skill_names.add(manifest.name)

    if missing_by_source:
        raise SkillsManagementError(
            describe_missing_configured_skills(missing_by_source)
        )

    for message in apply_config_alias_renames(
        config_path,
        renames_by_index,
        dry_run=dry_run,
    ):
        print(message)

    for message in cleanup_dead_skill_links(
        destination_skills_dir,
        dry_run=dry_run,
    ):
        print(message)

    for message in cleanup_unconfigured_skill_links(
        destination_skills_dir,
        configured_skill_names=linked_skill_names,
        dry_run=dry_run,
    ):
        print(message)

    for manifest in manifests_to_link:
        print(
            link_skill_directory(
                manifest,
                destination_skills_dir,
                dry_run=dry_run,
                force=force,
            )
        )

    for message in write_synced_skills_gitignore(
        destination_skills_dir,
        linked_skill_names,
        source_urls,
        dry_run=dry_run,
    ):
        print(message)

    return 0


def handle_unlink_command(
    *,
    skills: Sequence[str],
    source: str | None,
    destination: str | None,
    use_global: bool,
    dry_run: bool,
) -> int:
    validate_destination_flags(use_global=use_global, destination=destination)

    source_path = resolve_path(source)
    destination_skills_dir = resolve_destination_skills_root(
        resolve_path(destination),
        use_global=use_global,
    )

    for skill_name in deduplicate_preserving_order(skills):
        expected_target = resolve_source_skill_directory(source_path, skill_name)
        print(
            unlink_skill_directory(
                skill_name,
                destination_skills_dir,
                dry_run=dry_run,
                expected_target=expected_target,
            )
        )

    return 0
