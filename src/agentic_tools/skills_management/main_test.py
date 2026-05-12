import json
from collections.abc import Callable
from importlib.machinery import ModuleSpec
from pathlib import Path

import pytest

import agentic_tools.skills_management.main as skills_management_main
from agentic_tools.skills_management.main import SkillsManagementError
from agentic_tools.skills_management.main import discover_skill_manifests
from agentic_tools.skills_management.main import link_skill_directory
from agentic_tools.skills_management.main import resolve_selected_skills


def write_skill(
    repo_root: Path,
    name: str,
    *,
    metadata: dict[str, str] | None = None,
) -> None:
    write_skill_in_root(
        repo_root / ".agents" / "skills",
        name,
        metadata=metadata,
    )


def write_skill_in_root(
    skills_root: Path,
    name: str,
    *,
    metadata: dict[str, str] | None = None,
) -> None:
    skill_dir = skills_root / name
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


def assert_skills_management_error_contains(
    action: Callable[[], object], expected_text: str
) -> None:
    try:
        action()
    except SkillsManagementError as error:
        assert expected_text in str(error)
        return

    raise AssertionError("Expected SkillsManagementError was not raised")


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


def test_discover_skill_manifests_accepts_skills_root_path(tmp_path: Path) -> None:
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )

    manifests = discover_skill_manifests(tmp_path / ".agents" / "skills")

    assert list(manifests) == ["ref-alpha"]


def test_discover_skill_manifests_accepts_packaged_skills_root_path(
    tmp_path: Path,
) -> None:
    packaged_skills_root = tmp_path / "agentic_tools" / "shareable_skills"
    write_skill_in_root(
        packaged_skills_root,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )

    manifests = discover_skill_manifests(packaged_skills_root)

    assert list(manifests) == ["ref-alpha"]


def test_resolve_package_source_root_prefers_packaged_skills_root(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    package_root = tmp_path / "site-packages" / "agentic_tools"
    write_skill_in_root(
        package_root / "shareable_skills",
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    spec = ModuleSpec("agentic_tools", loader=None, is_package=True)
    spec.submodule_search_locations = [str(package_root)]

    monkeypatch.setattr(skills_management_main, "find_spec", lambda name: spec)

    resolved_path = skills_management_main.resolve_package_source_root("agentic-tools")

    assert resolved_path == package_root / "shareable_skills"


def test_resolve_package_source_root_prefers_repo_root_over_stale_packaged_copy(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    package_root = tmp_path / "site-packages" / "agentic_tools"
    write_skill_in_root(
        package_root / "shareable_skills",
        "ref-stale",
        metadata={"shareable-skills.visibility": "shareable"},
    )

    repo_root = tmp_path / "repo"
    write_skill(
        repo_root,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    source_root = repo_root / "src" / "agentic_tools"
    source_root.mkdir(parents=True)

    spec = ModuleSpec("agentic_tools", loader=None, is_package=True)
    spec.submodule_search_locations = [str(package_root), str(source_root)]

    monkeypatch.setattr(skills_management_main, "find_spec", lambda name: spec)

    resolved_path = skills_management_main.resolve_package_source_root("agentic-tools")

    assert resolved_path == repo_root


def test_resolve_package_source_root_ignores_consumer_repo_above_site_packages(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    consumer_repo = tmp_path / "consumer"
    (consumer_repo / ".agents" / "skills").mkdir(parents=True)

    package_root = consumer_repo / ".venv" / "Lib" / "site-packages" / "agentic_tools"
    write_skill_in_root(
        package_root / "shareable_skills",
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )

    spec = ModuleSpec("agentic_tools", loader=None, is_package=True)
    spec.submodule_search_locations = [str(package_root)]

    monkeypatch.setattr(skills_management_main, "find_spec", lambda name: spec)

    resolved_path = skills_management_main.resolve_package_source_root("agentic-tools")

    assert resolved_path == package_root / "shareable_skills"


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

    assert_skills_management_error_contains(
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

    assert_skills_management_error_contains(
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

    destination_skills_dir = tmp_path / "global-skills"
    message = link_skill_directory(
        manifests["ref-alpha"],
        destination_skills_dir,
        dry_run=True,
        force=False,
    )

    assert str(destination_skills_dir / "ref-alpha") in message
    assert not destination_skills_dir.exists()


def test_link_skill_directory_falls_back_to_windows_junction_when_needed(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    manifests = discover_skill_manifests(tmp_path)

    destination_skills_dir = tmp_path / "global-skills"
    junction_calls: list[tuple[Path, Path]] = []

    def raise_windows_symlink_error(
        self: Path, target: Path, *, target_is_directory: bool = False
    ) -> None:
        del self, target, target_is_directory
        error = OSError("privilege not held")
        error.winerror = 1314  # type: ignore[attr-defined]
        raise error

    monkeypatch.setattr(skills_management_main, "is_windows", lambda: True)
    monkeypatch.setattr(Path, "symlink_to", raise_windows_symlink_error)
    monkeypatch.setattr(
        skills_management_main,
        "create_windows_directory_junction",
        lambda destination, target: junction_calls.append((destination, target)),
    )

    message = link_skill_directory(
        manifests["ref-alpha"],
        destination_skills_dir,
        dry_run=False,
        force=False,
    )

    assert message == (
        f"Linked {destination_skills_dir / 'ref-alpha'} -> "
        f"{(tmp_path / '.agents' / 'skills' / 'ref-alpha').resolve()}"
    )
    assert junction_calls == [
        (
            destination_skills_dir / "ref-alpha",
            (tmp_path / ".agents" / "skills" / "ref-alpha").resolve(),
        )
    ]


def test_main_list_prints_all_skills_from_source(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    write_skill(tmp_path, "tool-beta")

    exit_code = skills_management_main.main(["list", "--from", str(tmp_path)])
    output = capsys.readouterr().out

    assert exit_code == 0
    assert "ref-alpha: visibility shareable; requires -" in output
    assert "tool-beta: visibility missing; requires -" in output


def test_main_link_dry_run_defaults_destination_to_current_repo(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_repo.mkdir()

    write_skill(
        source_repo,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    monkeypatch.chdir(destination_repo)

    exit_code = skills_management_main.main(
        ["link", "ref-alpha", "--from", str(source_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output
    assert str(source_repo / ".agents" / "skills" / "ref-alpha") in output


def test_main_link_dry_run_accepts_skills_root_source_path(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_repo.mkdir()

    write_skill(
        source_repo,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )

    exit_code = skills_management_main.main(
        [
            "link",
            "ref-alpha",
            "--from",
            str(source_repo / ".agents" / "skills"),
            "--to",
            str(destination_repo),
            "--dry-run",
        ]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output


def test_main_link_global_dry_run_uses_global_destination(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    global_skills_dir = tmp_path / "global-home" / ".agents" / "skills"

    write_skill(
        source_repo,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    monkeypatch.setattr(
        skills_management_main, "DEFAULT_GLOBAL_SKILLS_DIR", global_skills_dir
    )

    exit_code = skills_management_main.main(
        ["link", "ref-alpha", "--from", str(source_repo), "--global", "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(global_skills_dir / "ref-alpha") in output


def test_main_sync_dry_run_reads_relative_sources_from_repo_root(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_agents_dir = destination_repo / ".agents"
    destination_agents_dir.mkdir(parents=True)

    write_skill(
        source_repo,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    (destination_agents_dir / "skills.json").write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "from": "../source",
                        "skills": ["ref-alpha"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    exit_code = skills_management_main.main(
        ["sync", "--to", str(destination_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output
    assert str(source_repo / ".agents" / "skills" / "ref-alpha") in output


def test_main_sync_dry_run_supports_package_sources(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_agents_dir = destination_repo / ".agents"
    destination_agents_dir.mkdir(parents=True)

    write_skill(
        source_repo,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    (destination_agents_dir / "skills.json").write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "from": "package:agentic-tools",
                        "skills": ["ref-alpha"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        skills_management_main,
        "resolve_package_source_root",
        lambda package_name: source_repo,
    )

    exit_code = skills_management_main.main(
        ["sync", "--to", str(destination_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output
    assert str(source_repo / ".agents" / "skills" / "ref-alpha") in output


def test_main_unlink_dry_run_uses_expected_source_and_destination(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_repo.mkdir()

    write_skill(
        source_repo,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )

    exit_code = skills_management_main.main(
        [
            "unlink",
            "ref-alpha",
            "--from",
            str(source_repo),
            "--to",
            str(destination_repo),
            "--dry-run",
        ]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output
    assert str(source_repo / ".agents" / "skills" / "ref-alpha") in output


def test_main_sync_reports_missing_configured_skills_by_source(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_agents_dir = destination_repo / ".agents"
    destination_agents_dir.mkdir(parents=True)

    write_skill(
        source_repo,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    (destination_agents_dir / "skills.json").write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "from": "../source",
                        "skills": ["ref-alpha", "ref-missing", "ref-missing-too"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    exit_code = skills_management_main.main(
        ["sync", "--to", str(destination_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 1
    assert "Skills config references missing skills:" in output
    assert "source '../source': ref-missing, ref-missing-too" in output
    assert "Would link" not in output


def test_main_sync_dry_run_reports_dead_links_before_linking(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_agents_dir = destination_repo / ".agents"
    destination_agents_dir.mkdir(parents=True)

    write_skill(
        source_repo,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "shareable"},
    )
    (destination_agents_dir / "skills.json").write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "from": "../source",
                        "skills": ["ref-alpha"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    dead_target = tmp_path / "missing-source" / "ref-orphan"
    dead_destination = destination_repo / ".agents" / "skills" / "ref-orphan"
    monkeypatch.setattr(
        skills_management_main,
        "cleanup_dead_skill_links",
        lambda destination_skills_dir, *, dry_run: [
            f"Would remove dead link {dead_destination} -> {dead_target}"
        ],
    )

    exit_code = skills_management_main.main(
        ["sync", "--to", str(destination_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert f"Would remove dead link {dead_destination} -> {dead_target}" in output
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output


def test_cleanup_unconfigured_skill_links_reports_only_obsolete_links(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    destination_skills_dir = tmp_path / "destination" / ".agents" / "skills"
    destination_skills_dir.mkdir(parents=True)

    configured_link = destination_skills_dir / "ref-alpha"
    obsolete_link = destination_skills_dir / "ref-stale"
    local_directory = destination_skills_dir / "ref-project-setup"
    configured_link.mkdir()
    obsolete_link.mkdir()
    local_directory.mkdir()

    target_by_path = {
        configured_link: tmp_path / "targets" / "ref-alpha",
        obsolete_link: tmp_path / "targets" / "ref-stale",
    }

    monkeypatch.setattr(
        skills_management_main,
        "is_directory_link",
        lambda path: path in target_by_path,
    )
    monkeypatch.setattr(
        skills_management_main,
        "resolve_existing_link_target",
        lambda path: target_by_path[path],
    )

    messages = skills_management_main.cleanup_unconfigured_skill_links(
        destination_skills_dir,
        configured_skill_names={"ref-alpha"},
        dry_run=True,
    )

    assert messages == [
        f"Would remove unconfigured link {obsolete_link} -> {target_by_path[obsolete_link]}"
    ]


def test_cleanup_unconfigured_skill_links_removes_obsolete_links(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    destination_skills_dir = tmp_path / "destination" / ".agents" / "skills"
    destination_skills_dir.mkdir(parents=True)

    configured_link = destination_skills_dir / "ref-alpha"
    obsolete_link = destination_skills_dir / "ref-stale"
    configured_link.mkdir()
    obsolete_link.mkdir()

    target_by_path = {
        configured_link: tmp_path / "targets" / "ref-alpha",
        obsolete_link: tmp_path / "targets" / "ref-stale",
    }
    removed_paths: list[Path] = []

    monkeypatch.setattr(
        skills_management_main,
        "is_directory_link",
        lambda path: path in target_by_path,
    )
    monkeypatch.setattr(
        skills_management_main,
        "resolve_existing_link_target",
        lambda path: target_by_path[path],
    )
    monkeypatch.setattr(
        skills_management_main,
        "remove_directory_link",
        lambda path: removed_paths.append(path),
    )

    messages = skills_management_main.cleanup_unconfigured_skill_links(
        destination_skills_dir,
        configured_skill_names={"ref-alpha"},
        dry_run=False,
    )

    assert messages == [
        f"Removed unconfigured link {obsolete_link} -> {target_by_path[obsolete_link]}"
    ]
    assert removed_paths == [obsolete_link]
