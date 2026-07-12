"""Tests for plugin manifest generation."""

import json
from pathlib import Path

import pytest

from agentic_tools.features.plugin.manifests import (
    MARKETPLACE_MANIFEST_PATH,
    PLUGIN_MANIFEST_PATH,
    build_manifests,
    collect_publishable_skills,
    find_drifted_manifests,
    parse_frontmatter,
    read_plugin_config,
    write_manifests,
)

CONFIG = {
    "plugin": {
        "name": "example-plugin",
        "displayName": "Example Plugin",
        "description": "Example skills.",
        "category": "productivity",
        "license": "MIT",
        "repository": "https://example.test/acme/skills",
        "keywords": ["skills"],
        "skillsRoot": ".agents/skills",
        "publishVisibility": ["public"],
        "marketplace": {
            "name": "acme",
            "owner": {"name": "Acme"},
        },
    }
}


def write_skill(root: Path, name: str, visibility: str) -> None:
    """Create a minimal skill folder with the given visibility."""
    skill_directory = root / ".agents" / "skills" / name
    skill_directory.mkdir(parents=True)
    (skill_directory / "SKILL.md").write_text(
        "---\n"
        f"name: {name}\n"
        'description: "Example."\n'
        "license: MIT\n"
        "metadata:\n"
        '  shareable-skills.owner-prefix: "acme"\n'
        f'  shareable-skills.visibility: "{visibility}"\n'
        "---\n\n# Example\n",
        encoding="utf-8",
    )


@pytest.fixture(name="repository")
def repository_fixture(tmp_path: Path) -> Path:
    """Build a miniature repository with one skill per visibility tier."""
    (tmp_path / ".agents").mkdir()
    (tmp_path / ".agents" / "config.json").write_text(
        json.dumps(CONFIG), encoding="utf-8"
    )
    (tmp_path / "VERSION").write_text("1.2.3\n", encoding="utf-8")

    write_skill(tmp_path, "ref-acme-dev-public-one", "public")
    write_skill(tmp_path, "ref-acme-dev-public-two", "public")
    write_skill(tmp_path, "ref-acme-dev-internal", "organization")
    write_skill(tmp_path, "ref-acme-dev-private", "repo-local")

    return tmp_path


def test_parse_frontmatter_flattens_metadata_keys() -> None:
    fields = parse_frontmatter(
        '---\nname: demo\nmetadata:\n  shareable-skills.visibility: "public"\n---\nbody\n'
    )

    assert fields["name"] == "demo"
    assert fields["shareable-skills.visibility"] == "public"


def test_parse_frontmatter_rejects_missing_delimiter() -> None:
    with pytest.raises(ValueError, match="opening frontmatter delimiter"):
        parse_frontmatter("name: demo\n")


def test_collect_publishable_skills_excludes_lower_visibility(repository: Path) -> None:
    config = read_plugin_config(repository)

    published = collect_publishable_skills(repository, config)

    assert [skill.name for skill in published] == [
        "ref-acme-dev-public-one",
        "ref-acme-dev-public-two",
    ]


def test_collect_publishable_skills_honors_configured_visibility(
    repository: Path,
) -> None:
    config = read_plugin_config(repository)
    config.publish_visibility = ["public", "organization"]

    published = collect_publishable_skills(repository, config)

    assert "ref-acme-dev-internal" in [skill.name for skill in published]
    assert "ref-acme-dev-private" not in [skill.name for skill in published]


def test_collect_publishable_skills_rejects_missing_visibility(
    repository: Path,
) -> None:
    broken = repository / ".agents" / "skills" / "ref-acme-dev-broken"
    broken.mkdir()
    (broken / "SKILL.md").write_text("---\nname: x\n---\n", encoding="utf-8")

    with pytest.raises(ValueError, match="missing shareable-skills.visibility"):
        collect_publishable_skills(repository, read_plugin_config(repository))


def test_build_manifests_enumerates_only_publishable_skills(repository: Path) -> None:
    manifests = build_manifests(repository)

    plugin = json.loads(manifests.plugin)
    assert plugin["version"] == "1.2.3"
    assert plugin["skills"] == [
        "./.agents/skills/ref-acme-dev-public-one",
        "./.agents/skills/ref-acme-dev-public-two",
    ]


def test_marketplace_entry_omits_version_to_avoid_masking_plugin_json(
    repository: Path,
) -> None:
    marketplace = json.loads(build_manifests(repository).marketplace)

    entry = marketplace["plugins"][0]
    assert entry["source"] == "./"
    assert "version" not in entry


def test_check_reports_drift_after_a_skill_is_added(repository: Path) -> None:
    write_manifests(repository, build_manifests(repository))
    assert find_drifted_manifests(repository, build_manifests(repository)) == []

    write_skill(repository, "ref-acme-dev-public-three", "public")

    assert find_drifted_manifests(repository, build_manifests(repository)) == [
        PLUGIN_MANIFEST_PATH
    ]


def test_check_reports_drift_when_manifests_are_absent(repository: Path) -> None:
    drifted = find_drifted_manifests(repository, build_manifests(repository))

    assert drifted == [PLUGIN_MANIFEST_PATH, MARKETPLACE_MANIFEST_PATH]
