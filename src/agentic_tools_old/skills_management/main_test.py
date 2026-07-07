import json
from collections.abc import Callable
from importlib.machinery import ModuleSpec
from pathlib import Path

import pytest

from agentic_tools_old.main import main as agentic_tools_main
import agentic_tools_old.skills_management.main as skills_management_main
from agentic_tools_old.skills_management.main import SkillsManagementError
from agentic_tools_old.skills_management.main import apply_config_alias_renames
from agentic_tools_old.skills_management.main import describe_alias_redirects
from agentic_tools_old.skills_management.main import discover_skill_manifests
from agentic_tools_old.skills_management.main import find_missing_requested_skills
from agentic_tools_old.skills_management.main import handle_list_command
from agentic_tools_old.skills_management.main import legacy_metadata_warning
from agentic_tools_old.skills_management.main import link_skill_directory
from agentic_tools_old.skills_management.main import load_skill_aliases
from agentic_tools_old.skills_management.main import resolve_selected_skills


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


def write_alias_registry(skills_root: Path, aliases: dict[str, str]) -> None:
    registry_path = (
        skills_root / "ref-sp-agents-shareable-skills" / "references" / "registry.json"
    )
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    registry_path.write_text(json.dumps({"aliases": aliases}), encoding="utf-8")


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
            "shareable-skills.domain": "agents",
            "shareable-skills.visibility": "public",
            "shareable-skills.requires": "ref-beta ref-gamma",
        },
    )

    manifests = discover_skill_manifests(tmp_path)

    alpha = manifests["ref-alpha"]
    assert alpha.domain == "agents"
    assert alpha.visibility == "public"
    assert alpha.requires == ("ref-beta", "ref-gamma")


def test_discover_skill_manifests_reads_legacy_bare_metadata_keys(
    tmp_path: Path,
) -> None:
    # A skill authored against the previous (pre-namespace) schema still resolves.
    write_skill(
        tmp_path,
        "ref-legacy",
        metadata={
            "scope": "agents",
            "visibility": "organization",
            "requires": "ref-beta",
            "reason": "Legacy note.",
        },
    )

    manifest = discover_skill_manifests(tmp_path)["ref-legacy"]

    assert manifest.domain == "agents"
    assert manifest.visibility == "organization"
    assert manifest.requires == ("ref-beta",)
    assert manifest.reason == "Legacy note."
    assert manifest.uses_legacy_metadata is True


def test_namespaced_metadata_takes_precedence_over_legacy_keys(
    tmp_path: Path,
) -> None:
    write_skill(
        tmp_path,
        "ref-both",
        metadata={
            "scope": "old",
            "shareable-skills.domain": "agents",
            "shareable-skills.visibility": "public",
        },
    )

    manifest = discover_skill_manifests(tmp_path)["ref-both"]

    assert manifest.domain == "agents"
    assert manifest.uses_legacy_metadata is False


def test_legacy_shareable_visibility_normalized_to_organization(
    tmp_path: Path,
) -> None:
    write_skill(tmp_path, "ref-old-vis", metadata={"visibility": "shareable"})

    manifest = discover_skill_manifests(tmp_path)["ref-old-vis"]

    assert manifest.visibility == "organization"
    assert manifest.uses_legacy_metadata is True


def test_export_rejects_public_skill_on_legacy_schema(tmp_path: Path) -> None:
    write_skill(tmp_path, "ref-alpha", metadata={"visibility": "public"})
    manifests = discover_skill_manifests(tmp_path)

    assert_skills_management_error_contains(
        lambda: resolve_selected_skills(manifests, ["ref-alpha"]),
        "legacy metadata schema",
    )


def test_export_tolerates_organization_skill_on_legacy_schema(
    tmp_path: Path,
) -> None:
    write_skill(tmp_path, "ref-alpha", metadata={"visibility": "organization"})
    manifests = discover_skill_manifests(tmp_path)

    resolved = resolve_selected_skills(manifests, ["ref-alpha"])

    assert [manifest.name for manifest in resolved] == ["ref-alpha"]
    assert legacy_metadata_warning(resolved[0]) is not None


def test_list_annotates_own_legacy_skill(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    write_skill(tmp_path, "ref-legacy", metadata={"visibility": "organization"})

    handle_list_command(str(tmp_path))

    output = capsys.readouterr().out
    assert "ref-legacy" in output
    assert "legacy metadata" in output


def test_symlinked_legacy_skill_is_our_burden_not_the_consumers(
    tmp_path: Path,
) -> None:
    # A symlinked skill points at a source we own; even if its target is on the
    # legacy schema it must not warn or block the consumer.
    source_root = tmp_path / "source"
    write_skill_in_root(
        source_root, "ref-linked", metadata={"visibility": "public"}
    )
    skills_root = tmp_path / ".agents" / "skills"
    skills_root.mkdir(parents=True)
    (skills_root / "ref-linked").symlink_to(
        source_root / "ref-linked", target_is_directory=True
    )

    manifests = discover_skill_manifests(tmp_path)
    manifest = manifests["ref-linked"]

    assert manifest.is_symlink is True
    assert manifest.uses_legacy_metadata is True
    assert legacy_metadata_warning(manifest) is None
    # The public-legacy export error is skipped for symlinked skills.
    assert [m.name for m in resolve_selected_skills(manifests, ["ref-linked"])] == [
        "ref-linked"
    ]


def test_discover_skill_manifests_accepts_skills_root_path(tmp_path: Path) -> None:
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "public"},
    )

    manifests = discover_skill_manifests(tmp_path / ".agents" / "skills")

    assert list(manifests) == ["ref-alpha"]


def test_discover_skill_manifests_accepts_packaged_skills_root_path(
    tmp_path: Path,
) -> None:
    packaged_skills_root = tmp_path / "agentic_tools_old" / "shareable_skills"
    write_skill_in_root(
        packaged_skills_root,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "public"},
    )

    manifests = discover_skill_manifests(packaged_skills_root)

    assert list(manifests) == ["ref-alpha"]


def test_resolve_package_source_root_prefers_packaged_skills_root(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    package_root = tmp_path / "site-packages" / "agentic_tools_old"
    write_skill_in_root(
        package_root / "shareable_skills",
        "ref-alpha",
        metadata={"shareable-skills.visibility": "public"},
    )
    spec = ModuleSpec("agentic_tools_old", loader=None, is_package=True)
    spec.submodule_search_locations = [str(package_root)]

    monkeypatch.setattr(skills_management_main, "find_spec", lambda name: spec)

    resolved_path = skills_management_main.resolve_package_source_root("agentic-tools")

    assert resolved_path == package_root / "shareable_skills"


def test_resolve_package_source_root_falls_back_to_legacy_module_name(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    legacy_package_root = tmp_path / "site-packages" / "agentic_tools_old"
    write_skill_in_root(
        legacy_package_root / "shareable_skills",
        "ref-alpha",
        metadata={"shareable-skills.visibility": "public"},
    )

    modern_spec = ModuleSpec("agentic_tools", loader=None, is_package=True)
    modern_spec.submodule_search_locations = [
        str(tmp_path / "site-packages" / "agentic_tools")
    ]

    legacy_spec = ModuleSpec("agentic_tools_old", loader=None, is_package=True)
    legacy_spec.submodule_search_locations = [str(legacy_package_root)]

    def fake_find_spec(name: str) -> ModuleSpec | None:
        if name == "agentic_tools":
            return modern_spec
        if name == "agentic_tools_old":
            return legacy_spec
        return None

    monkeypatch.setattr(skills_management_main, "find_spec", fake_find_spec)

    resolved_path = skills_management_main.resolve_package_source_root("agentic-tools")

    assert resolved_path == legacy_package_root / "shareable_skills"


def test_resolve_package_source_root_prefers_repo_root_over_stale_packaged_copy(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    package_root = tmp_path / "site-packages" / "agentic_tools_old"
    write_skill_in_root(
        package_root / "shareable_skills",
        "ref-stale",
        metadata={"shareable-skills.visibility": "public"},
    )

    repo_root = tmp_path / "repo"
    write_skill(
        repo_root,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "public"},
    )
    source_root = repo_root / "src" / "agentic_tools_old"
    source_root.mkdir(parents=True)

    spec = ModuleSpec("agentic_tools_old", loader=None, is_package=True)
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

    package_root = (
        consumer_repo / ".venv" / "Lib" / "site-packages" / "agentic_tools_old"
    )
    write_skill_in_root(
        package_root / "shareable_skills",
        "ref-alpha",
        metadata={"shareable-skills.visibility": "public"},
    )

    spec = ModuleSpec("agentic_tools_old", loader=None, is_package=True)
    spec.submodule_search_locations = [str(package_root)]

    monkeypatch.setattr(skills_management_main, "find_spec", lambda name: spec)

    resolved_path = skills_management_main.resolve_package_source_root("agentic-tools")

    assert resolved_path == package_root / "shareable_skills"


def test_resolve_selected_skills_includes_dependencies_first(tmp_path: Path) -> None:
    write_skill(
        tmp_path,
        "ref-beta",
        metadata={"shareable-skills.visibility": "public"},
    )
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={
            "shareable-skills.visibility": "public",
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
        "tool-sp-make-skill-shareable",
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
            "shareable-skills.visibility": "public",
            "shareable-skills.requires": "ref-beta",
        },
    )

    manifests = discover_skill_manifests(tmp_path)

    assert_skills_management_error_contains(
        lambda: resolve_selected_skills(manifests, ["ref-alpha"]),
        "which is not shareable",
    )


def test_discover_skill_manifests_parses_comma_delimited_requires(
    tmp_path: Path,
) -> None:
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={
            "shareable-skills.visibility": "public",
            "shareable-skills.requires": "ref-beta, ref-gamma",
        },
    )

    manifests = discover_skill_manifests(tmp_path)

    assert manifests["ref-alpha"].requires == ("ref-beta", "ref-gamma")


def test_load_skill_aliases_reads_registry(tmp_path: Path) -> None:
    write_skill(tmp_path, "ref-new", metadata={"shareable-skills.visibility": "public"})
    write_alias_registry(
        tmp_path / ".agents" / "skills",
        {"ref-old": "ref-new"},
    )

    assert load_skill_aliases(tmp_path) == {"ref-old": "ref-new"}


def test_load_skill_aliases_missing_registry_returns_empty(tmp_path: Path) -> None:
    write_skill(tmp_path, "ref-new", metadata={"shareable-skills.visibility": "public"})

    assert load_skill_aliases(tmp_path) == {}


def test_resolve_selected_skills_resolves_renamed_skill_through_alias(
    tmp_path: Path,
) -> None:
    write_skill(tmp_path, "ref-new", metadata={"shareable-skills.visibility": "public"})
    manifests = discover_skill_manifests(tmp_path)
    aliases = {"ref-old": "ref-new"}

    resolved = resolve_selected_skills(manifests, ["ref-old"], aliases)

    assert [manifest.name for manifest in resolved] == ["ref-new"]


def test_resolve_selected_skills_dedupes_old_and_new_name(tmp_path: Path) -> None:
    write_skill(tmp_path, "ref-new", metadata={"shareable-skills.visibility": "public"})
    manifests = discover_skill_manifests(tmp_path)
    aliases = {"ref-old": "ref-new"}

    resolved = resolve_selected_skills(manifests, ["ref-old", "ref-new"], aliases)

    assert [manifest.name for manifest in resolved] == ["ref-new"]


def test_resolve_selected_skills_reports_unknown_non_alias(tmp_path: Path) -> None:
    write_skill(tmp_path, "ref-new", metadata={"shareable-skills.visibility": "public"})
    manifests = discover_skill_manifests(tmp_path)

    assert_skills_management_error_contains(
        lambda: resolve_selected_skills(
            manifests, ["ref-unknown"], {"ref-old": "ref-new"}
        ),
        "Unknown skill 'ref-unknown'",
    )


def test_find_missing_requested_skills_treats_alias_as_present(tmp_path: Path) -> None:
    write_skill(tmp_path, "ref-new", metadata={"shareable-skills.visibility": "public"})
    manifests = discover_skill_manifests(tmp_path)

    missing = find_missing_requested_skills(
        manifests,
        ["ref-old", "ref-absent"],
        {"ref-old": "ref-new"},
    )

    assert missing == ("ref-absent",)


def test_describe_alias_redirects_notes_renamed_skill(tmp_path: Path) -> None:
    write_skill(tmp_path, "ref-new", metadata={"shareable-skills.visibility": "public"})
    manifests = discover_skill_manifests(tmp_path)

    messages = describe_alias_redirects(
        ["ref-old", "ref-new"],
        manifests,
        {"ref-old": "ref-new"},
    )

    assert messages == [
        "Note: skill 'ref-old' was renamed to 'ref-new'; "
        "update your configuration to use the new name."
    ]


def test_apply_config_alias_renames_updates_unified_config_and_dedupes(
    tmp_path: Path,
) -> None:
    config_path = tmp_path / "config.json"
    config_path.write_text(
        json.dumps(
            {
                "policy": {"services": ["copilot"]},
                "skills": {
                    "sources": [
                        {
                            "from": "../source",
                            "skills": ["ref-old", "ref-new", "ref-keep"],
                        }
                    ]
                },
            }
        ),
        encoding="utf-8",
    )

    messages = apply_config_alias_renames(
        config_path,
        {0: {"ref-old": "ref-new"}},
        dry_run=False,
    )

    assert messages == ["Updated config: 'ref-old' -> 'ref-new'"]
    written = json.loads(config_path.read_text(encoding="utf-8"))
    # Renamed, deduped against the already-present new name, order preserved.
    assert written["skills"]["sources"][0]["skills"] == ["ref-new", "ref-keep"]
    # Unrelated sections are left intact.
    assert written["policy"] == {"services": ["copilot"]}


def test_apply_config_alias_renames_dry_run_leaves_file_untouched(
    tmp_path: Path,
) -> None:
    config_path = tmp_path / "skills.json"
    original = json.dumps({"sources": [{"from": "../source", "skills": ["ref-old"]}]})
    config_path.write_text(original, encoding="utf-8")

    messages = apply_config_alias_renames(
        config_path,
        {0: {"ref-old": "ref-new"}},
        dry_run=True,
    )

    assert messages == ["Would update config: 'ref-old' -> 'ref-new'"]
    assert config_path.read_text(encoding="utf-8") == original


def test_link_skill_directory_dry_run_does_not_create_target_directory(
    tmp_path: Path,
) -> None:
    write_skill(
        tmp_path,
        "ref-alpha",
        metadata={"shareable-skills.visibility": "public"},
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
        metadata={"shareable-skills.visibility": "public"},
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
        metadata={"shareable-skills.visibility": "public"},
    )
    write_skill(tmp_path, "tool-beta")

    exit_code = agentic_tools_main(["skills", "list", "--from", str(tmp_path)])
    output = capsys.readouterr().out

    assert exit_code == 0
    assert "ref-alpha: domain missing; visibility public; requires -" in output
    assert "tool-beta: domain missing; visibility missing; requires -" in output


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
        metadata={"shareable-skills.visibility": "public"},
    )
    monkeypatch.chdir(destination_repo)

    exit_code = agentic_tools_main(
        ["skills", "link", "ref-alpha", "--from", str(source_repo), "--dry-run"]
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
        metadata={"shareable-skills.visibility": "public"},
    )

    exit_code = agentic_tools_main(
        [
            "skills",
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
        metadata={"shareable-skills.visibility": "public"},
    )
    monkeypatch.setattr(
        skills_management_main, "DEFAULT_GLOBAL_SKILLS_DIR", global_skills_dir
    )

    exit_code = agentic_tools_main(
        [
            "skills",
            "link",
            "ref-alpha",
            "--from",
            str(source_repo),
            "--global",
            "--dry-run",
        ]
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
        metadata={"shareable-skills.visibility": "public"},
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

    exit_code = agentic_tools_main(
        ["skills", "sync", "--to", str(destination_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output
    assert str(source_repo / ".agents" / "skills" / "ref-alpha") in output


def test_main_sync_dry_run_reads_unified_agents_config(
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
        metadata={"shareable-skills.visibility": "public"},
    )
    (destination_agents_dir / "config.json").write_text(
        json.dumps(
            {
                "skills": {
                    "sources": [
                        {
                            "from": "../source",
                            "skills": ["ref-alpha"],
                        }
                    ]
                }
            }
        ),
        encoding="utf-8",
    )

    exit_code = agentic_tools_main(
        ["skills", "sync", "--to", str(destination_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output
    assert str(source_repo / ".agents" / "skills" / "ref-alpha") in output


def test_main_sync_dry_run_falls_back_to_legacy_skills_config(
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
        metadata={"shareable-skills.visibility": "public"},
    )
    (destination_agents_dir / "config.json").write_text(
        json.dumps({"policy": {"services": ["copilot"]}}),
        encoding="utf-8",
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

    exit_code = agentic_tools_main(
        ["skills", "sync", "--to", str(destination_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output


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
        metadata={"shareable-skills.visibility": "public"},
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

    exit_code = agentic_tools_main(
        ["skills", "sync", "--to", str(destination_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert str(destination_repo / ".agents" / "skills" / "ref-alpha") in output
    assert str(source_repo / ".agents" / "skills" / "ref-alpha") in output


def test_main_sync_dry_run_resolves_renamed_skill_through_registry(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_agents_dir = destination_repo / ".agents"
    destination_agents_dir.mkdir(parents=True)

    write_skill(
        source_repo,
        "ref-new-name",
        metadata={"shareable-skills.visibility": "public"},
    )
    write_alias_registry(
        source_repo / ".agents" / "skills",
        {"ref-old-name": "ref-new-name"},
    )
    (destination_agents_dir / "skills.json").write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "from": "../source",
                        "skills": ["ref-old-name"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    config_path = destination_agents_dir / "skills.json"

    exit_code = agentic_tools_main(
        ["skills", "sync", "--to", str(destination_repo), "--dry-run"]
    )
    output = capsys.readouterr().out

    assert exit_code == 0
    assert "Would update config: 'ref-old-name' -> 'ref-new-name'" in output
    assert str(destination_repo / ".agents" / "skills" / "ref-new-name") in output
    assert str(source_repo / ".agents" / "skills" / "ref-new-name") in output
    # Dry-run must not mutate the config on disk.
    assert json.loads(config_path.read_text(encoding="utf-8"))["sources"][0][
        "skills"
    ] == ["ref-old-name"]


def test_main_sync_rewrites_renamed_skill_in_config(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_agents_dir = destination_repo / ".agents"
    destination_agents_dir.mkdir(parents=True)

    write_skill(
        source_repo,
        "ref-new-name",
        metadata={"shareable-skills.visibility": "public"},
    )
    write_alias_registry(
        source_repo / ".agents" / "skills",
        {"ref-old-name": "ref-new-name"},
    )
    config_path = destination_agents_dir / "skills.json"
    config_path.write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "from": "../source",
                        "skills": ["ref-old-name"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    exit_code = agentic_tools_main(["skills", "sync", "--to", str(destination_repo)])
    output = capsys.readouterr().out

    assert exit_code == 0
    assert "Updated config: 'ref-old-name' -> 'ref-new-name'" in output
    assert json.loads(config_path.read_text(encoding="utf-8"))["sources"][0][
        "skills"
    ] == ["ref-new-name"]

    # A second sync is stable: names already canonical, nothing left to rewrite.
    second_exit = agentic_tools_main(["skills", "sync", "--to", str(destination_repo)])
    second_output = capsys.readouterr().out

    assert second_exit == 0
    assert "Updated config" not in second_output


def test_build_synced_skills_gitignore_has_header_and_sorted_names() -> None:
    content = skills_management_main.build_synced_skills_gitignore(
        ["ref-sp-beta", "ref-sp-alpha"]
    )

    assert content == (
        "# Generated by agentic-tools `skills sync` — do not edit by hand.\n"
        "# https://github.com/swiftpostlabs/agentic-tools\n"
        "# Ignores skill symlinks synced into this directory.\n"
        "ref-sp-alpha\n"
        "ref-sp-beta\n"
    )


def test_build_synced_skills_gitignore_lists_deduped_source_urls() -> None:
    content = skills_management_main.build_synced_skills_gitignore(
        ["ref-sp-alpha"],
        ["https://example.com/repo-a", "https://example.com/repo-a"],
    )

    assert content == (
        "# Generated by agentic-tools `skills sync` — do not edit by hand.\n"
        "# https://github.com/swiftpostlabs/agentic-tools\n"
        "# Skills synced from:\n"
        "#   https://example.com/repo-a\n"
        "# Ignores skill symlinks synced into this directory.\n"
        "ref-sp-alpha\n"
    )


def test_main_sync_regenerates_stale_skills_gitignore(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_agents_dir = destination_repo / ".agents"
    destination_agents_dir.mkdir(parents=True)

    write_skill(source_repo, "ref-alpha", metadata={"shareable-skills.visibility": "public"})
    (destination_agents_dir / "skills.json").write_text(
        json.dumps({"sources": [{"from": "../source", "skills": ["ref-alpha"]}]}),
        encoding="utf-8",
    )
    stale_skills_dir = destination_agents_dir / "skills"
    stale_skills_dir.mkdir(parents=True)
    gitignore_path = stale_skills_dir / ".gitignore"
    gitignore_path.write_text("# Synced shared skills\nref-old\n", encoding="utf-8")

    exit_code = agentic_tools_main(["skills", "sync", "--to", str(destination_repo)])
    output = capsys.readouterr().out

    assert exit_code == 0
    assert f"Updated {gitignore_path}" in output
    content = gitignore_path.read_text(encoding="utf-8")
    assert content.startswith("# Generated by agentic-tools")
    assert "https://github.com/swiftpostlabs/agentic-tools" in content
    assert content.endswith("ref-alpha\n")
    assert "ref-old" not in content

    # A second sync leaves the already-correct .gitignore untouched.
    second_exit = agentic_tools_main(["skills", "sync", "--to", str(destination_repo)])
    second_output = capsys.readouterr().out

    assert second_exit == 0
    assert ".gitignore" not in second_output


def test_main_sync_gitignore_lists_configured_source_url(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source_repo = tmp_path / "source"
    destination_repo = tmp_path / "destination"
    destination_agents_dir = destination_repo / ".agents"
    destination_agents_dir.mkdir(parents=True)

    write_skill(source_repo, "ref-alpha", metadata={"shareable-skills.visibility": "public"})
    (destination_agents_dir / "skills.json").write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "from": "../source",
                        "url": "https://github.com/acme/skills",
                        "skills": ["ref-alpha"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    exit_code = agentic_tools_main(["skills", "sync", "--to", str(destination_repo)])

    assert exit_code == 0
    content = (destination_agents_dir / "skills" / ".gitignore").read_text(
        encoding="utf-8"
    )
    assert "# Skills synced from:" in content
    assert "#   https://github.com/acme/skills" in content


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
        metadata={"shareable-skills.visibility": "public"},
    )

    exit_code = agentic_tools_main(
        [
            "skills",
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
        metadata={"shareable-skills.visibility": "public"},
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

    exit_code = agentic_tools_main(
        ["skills", "sync", "--to", str(destination_repo), "--dry-run"]
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
        metadata={"shareable-skills.visibility": "public"},
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

    exit_code = agentic_tools_main(
        ["skills", "sync", "--to", str(destination_repo), "--dry-run"]
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
