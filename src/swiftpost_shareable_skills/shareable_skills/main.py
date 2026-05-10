"""Link selected shareable skills into a global skills directory.

Usage:
- List shareable skills: `uv run link-shareable-skills --list`
- Dry-run a link plan: `uv run link-shareable-skills ref-git-commits --dry-run`
"""

from __future__ import annotations

from argparse import ArgumentParser
from dataclasses import dataclass
import os
from pathlib import Path
from typing import Sequence

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_GLOBAL_SKILLS_DIR = Path.home() / ".agents" / "skills"
SHAREABLE_VISIBILITY = "shareable"
REPO_LOCAL_VISIBILITY = "repo-local"
SHAREABILITY_WIZARD = "tool-make-skill-shareable"


class SkillLinkError(Exception):
    """Raised when a skill cannot be linked safely."""


@dataclass(frozen=True)
class SkillManifest:
    name: str
    directory: Path
    visibility: str | None
    requires: tuple[str, ...]
    reason: str | None


def strip_yaml_string(value: str) -> str:
    trimmed = value.strip()
    if len(trimmed) >= 2 and trimmed[0] == trimmed[-1] and trimmed[0] in {'"', "'"}:
        return trimmed[1:-1]
    return trimmed


def parse_frontmatter(text: str) -> dict[str, str | dict[str, str]]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise SkillLinkError("Skill file is missing YAML frontmatter.")

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
                raise SkillLinkError(f"Invalid frontmatter line: {line}")

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
            raise SkillLinkError(f"Invalid nested frontmatter line: {line}")

        current_mapping[nested_key.strip()] = strip_yaml_string(raw_value.strip())

    raise SkillLinkError("Skill file is missing the closing frontmatter delimiter.")


def split_requires(value: str | None) -> tuple[str, ...]:
    if value is None:
        return ()

    return tuple(entry for entry in value.split() if entry)


def read_skill_manifest(skill_directory: Path) -> SkillManifest:
    skill_file = skill_directory / "SKILL.md"
    frontmatter = parse_frontmatter(skill_file.read_text(encoding="utf-8"))

    raw_name = frontmatter.get("name")
    if not isinstance(raw_name, str) or raw_name == "":
        raise SkillLinkError(f"Skill at {skill_directory} is missing a valid name.")

    if raw_name != skill_directory.name:
        raise SkillLinkError(
            f"Skill name '{raw_name}' does not match directory '{skill_directory.name}'."
        )

    metadata = frontmatter.get("metadata", {})
    metadata_mapping = metadata if isinstance(metadata, dict) else {}
    visibility = metadata_mapping.get("shareable-skills.visibility")
    requires = split_requires(metadata_mapping.get("shareable-skills.requires"))
    reason = metadata_mapping.get("shareable-skills.reason")

    return SkillManifest(
        name=raw_name,
        directory=skill_directory,
        visibility=visibility,
        requires=requires,
        reason=reason,
    )


def discover_skill_manifests(repo_root: Path) -> dict[str, SkillManifest]:
    skills_root = repo_root / ".agents" / "skills"
    if not skills_root.exists():
        raise SkillLinkError(f"Could not find skills directory at {skills_root}")

    manifests: dict[str, SkillManifest] = {}
    for child in sorted(skills_root.iterdir(), key=lambda path: path.name):
        if not child.is_dir() or not (child / "SKILL.md").exists():
            continue

        manifest = read_skill_manifest(child)
        manifests[manifest.name] = manifest

    return manifests


def build_make_shareable_recommendation(skill_name: str) -> str:
    return (
        f"Recommended next step: use /{SHAREABILITY_WIZARD} on '{skill_name}' to decide "
        "whether it should be shareable or repo-local and to add "
        "shareable-skills.visibility, shareable-skills.requires, and "
        "shareable-skills.reason if needed."
    )


def ensure_shareable_manifest(
    manifest: SkillManifest,
    manifests: dict[str, SkillManifest],
) -> None:
    if manifest.visibility is None:
        raise SkillLinkError(
            f"Skill '{manifest.name}' is missing shareability metadata. "
            f"{build_make_shareable_recommendation(manifest.name)}"
        )

    if manifest.visibility not in {SHAREABLE_VISIBILITY, REPO_LOCAL_VISIBILITY}:
        raise SkillLinkError(
            f"Skill '{manifest.name}' has an unsupported visibility value "
            f"'{manifest.visibility}'."
        )

    if manifest.visibility == REPO_LOCAL_VISIBILITY:
        reason = manifest.reason or "No shareable-skills.reason was provided."
        raise SkillLinkError(
            f"Skill '{manifest.name}' is marked repo-local and cannot be linked. {reason}"
        )

    for dependency_name in manifest.requires:
        dependency = manifests.get(dependency_name)
        if dependency is None:
            raise SkillLinkError(
                f"Skill '{manifest.name}' depends on unknown skill '{dependency_name}'."
            )

        if dependency.visibility is None:
            raise SkillLinkError(
                f"Skill '{manifest.name}' depends on '{dependency_name}', but that skill is "
                "missing shareability metadata. "
                f"{build_make_shareable_recommendation(dependency_name)}"
            )

        if dependency.visibility != SHAREABLE_VISIBILITY:
            raise SkillLinkError(
                f"Skill '{manifest.name}' depends on '{dependency_name}', which is not shareable."
            )


def resolve_selected_skills(
    manifests: dict[str, SkillManifest],
    requested_names: Sequence[str],
) -> list[SkillManifest]:
    resolved: list[SkillManifest] = []
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(skill_name: str) -> None:
        if skill_name in visited:
            return
        if skill_name in visiting:
            raise SkillLinkError(
                f"Circular skill dependency detected at '{skill_name}'."
            )

        manifest = manifests.get(skill_name)
        if manifest is None:
            raise SkillLinkError(f"Unknown skill '{skill_name}'.")

        ensure_shareable_manifest(manifest, manifests)

        visiting.add(skill_name)
        for dependency_name in manifest.requires:
            visit(dependency_name)
        visiting.remove(skill_name)

        visited.add(skill_name)
        resolved.append(manifest)

    for requested_name in requested_names:
        visit(requested_name)

    return resolved


def list_shareable_skill_names(manifests: dict[str, SkillManifest]) -> list[str]:
    return sorted(
        skill_name
        for skill_name, manifest in manifests.items()
        if manifest.visibility == SHAREABLE_VISIBILITY
    )


def describe_shareable_skills(manifests: dict[str, SkillManifest]) -> str:
    names = list_shareable_skill_names(manifests)
    if not names:
        return "No shareable skills found."

    lines: list[str] = []
    for skill_name in names:
        manifest = manifests[skill_name]
        requires = " ".join(manifest.requires) if manifest.requires else "-"
        lines.append(f"{manifest.name}: requires {requires}")

    return "\n".join(lines)


def resolve_existing_symlink_target(path: Path) -> Path:
    target = path.readlink()
    if target.is_absolute():
        return target.resolve(strict=False)

    return (path.parent / target).resolve(strict=False)


def link_skill_directory(
    manifest: SkillManifest,
    global_skills_dir: Path,
    *,
    dry_run: bool,
    force: bool,
) -> str:
    destination = global_skills_dir / manifest.name
    target = manifest.directory.resolve()

    if dry_run:
        return f"Would link {manifest.name} -> {target}"

    global_skills_dir.mkdir(parents=True, exist_ok=True)

    if destination.is_symlink():
        existing_target = resolve_existing_symlink_target(destination)
        if existing_target == target:
            return f"Already linked {manifest.name} -> {target}"
        if not force:
            raise SkillLinkError(
                f"Destination '{destination}' already points to '{existing_target}'. Use --force to replace it."
            )
        destination.unlink()
    elif destination.exists():
        raise SkillLinkError(
            f"Destination '{destination}' already exists and is not a symlink. Remove it manually before linking."
        )

    try:
        destination.symlink_to(target, target_is_directory=True)
    except OSError as error:
        if os.name == "nt" and getattr(error, "winerror", None) == 1314:
            raise SkillLinkError(
                "Windows refused to create the symlink. Enable Developer Mode or rerun the command from an elevated shell."
            ) from error
        raise SkillLinkError(
            f"Could not create symlink '{destination}' -> '{target}': {error}"
        ) from error

    return f"Linked {manifest.name} -> {target}"


def build_parser() -> ArgumentParser:
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("skills", nargs="*", help="Skill names to link")
    parser.add_argument(
        "--repo",
        default=str(ROOT),
        help="Repository root containing .agents/skills",
    )
    parser.add_argument(
        "--global-dir",
        default=str(DEFAULT_GLOBAL_SKILLS_DIR),
        help="Global skills directory to populate with symlinks",
    )
    parser.add_argument(
        "--all-shareable",
        action="store_true",
        help="Link every skill marked shareable",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List skills currently marked shareable",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the link plan without creating any symlinks",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace existing symlinks that point somewhere else",
    )
    return parser


def deduplicate_preserving_order(items: Sequence[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        ordered.append(item)
    return ordered


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        repo_root = Path(args.repo).expanduser().resolve()
        manifests = discover_skill_manifests(repo_root)

        if args.list:
            print(describe_shareable_skills(manifests))
            return 0

        requested_names = list(args.skills)
        if args.all_shareable:
            requested_names.extend(list_shareable_skill_names(manifests))

        requested_names = deduplicate_preserving_order(requested_names)
        if not requested_names:
            parser.error(
                "provide one or more skill names, or use --all-shareable or --list"
            )

        manifests_to_link = resolve_selected_skills(manifests, requested_names)
        global_skills_dir = Path(args.global_dir).expanduser()

        for manifest in manifests_to_link:
            print(
                link_skill_directory(
                    manifest,
                    global_skills_dir,
                    dry_run=args.dry_run,
                    force=args.force,
                )
            )
        return 0
    except SkillLinkError as error:
        print(error)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
