from collections.abc import Callable
from pathlib import Path

from swiftpost_shareable_skills.shareable_skills.main import SkillLinkError
from swiftpost_shareable_skills.shareable_skills.main import discover_skill_manifests
from swiftpost_shareable_skills.shareable_skills.main import link_skill_directory
from swiftpost_shareable_skills.shareable_skills.main import resolve_selected_skills


def write_skill(
    repo_root: Path,
    name: str,
    *,
    metadata: dict[str, str] | None = None,
) -> None:
    skill_dir = repo_root / ".agents" / "skills" / name
    skill_dir.mkdir(parents=True, exist_ok=True)

    lines = [
        "---",
        f"name: {name}",
        'description: "Test skill."',
    ]

    if metadata is not None:
        lines.append("metadata:")
        for key, value in metadata.items():
            lines.append(f'  {key}: "{value}"')

    lines.extend(["---", "", "# Test Skill", ""])
    (skill_dir / "SKILL.md").write_text("\n".join(lines), encoding="utf-8")


def assert_skill_link_error_contains(
    action: Callable[[], object], expected_text: str
) -> None:
    try:
        action()
    except SkillLinkError as error:
        assert expected_text in str(error)
        return

    raise AssertionError("Expected SkillLinkError was not raised")


def test_discover_skill_manifests_reads_shareability_metadata(tmp_path: Path) -> None:
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={
            "shareable-skills.visibility": "shareable",
            "shareable-skills.requires": "ref-beta ref-gamma",
        },
    )

    manifests = discover_skill_manifests(tmp_path)

    alpha = manifests["ref-alpha"]
    assert alpha.visibility == "shareable"
    assert alpha.requires == ("ref-beta", "ref-gamma")


def test_resolve_selected_skills_includes_dependencies_first(tmp_path: Path) -> None:
    write_skill(
        tmp_path,
        "ref-beta",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={
            "shareable-skills.visibility": "shareable",
            "shareable-skills.requires": "ref-beta",
        },
    )

    manifests = discover_skill_manifests(tmp_path)
    resolved = resolve_selected_skills(manifests, ["ref-alpha"])

    assert [manifest.name for manifest in resolved] == ["ref-beta", "ref-alpha"]


def test_resolve_selected_skills_rejects_missing_metadata_with_wizard_recommendation(
    tmp_path: Path,
) -> None:
    write_skill(tmp_path, "ref-alpha")
    manifests = discover_skill_manifests(tmp_path)

    assert_skill_link_error_contains(
        lambda: resolve_selected_skills(manifests, ["ref-alpha"]),
        "tool-make-skill-shareable",
    )


def test_resolve_selected_skills_rejects_repo_local_dependency(tmp_path: Path) -> None:
    write_skill(
        tmp_path,
        "ref-beta",
        metadata={
            "shareable-skills.visibility": "repo-local",
            "shareable-skills.reason": "Relies on a repo-only helper.",
        },
    )
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={
            "shareable-skills.visibility": "shareable",
            "shareable-skills.requires": "ref-beta",
        },
    )

    manifests = discover_skill_manifests(tmp_path)

    assert_skill_link_error_contains(
        lambda: resolve_selected_skills(manifests, ["ref-alpha"]),
        "which is not shareable",
    )


def test_link_skill_directory_dry_run_does_not_create_target_directory(
    tmp_path: Path,
) -> None:
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    manifests = discover_skill_manifests(tmp_path)

    message = link_skill_directory(
        manifests["ref-alpha"],
        tmp_path / "global-skills",
        dry_run=True,
        force=False,
    )

    assert "Would link ref-alpha" in message
    assert not (tmp_path / "global-skills").exists()
