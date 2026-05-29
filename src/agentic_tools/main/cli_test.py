import pytest

from agentic_tools.main.cli import main


def test_main_without_subcommand_prints_help(
    capsys: pytest.CaptureFixture[str],
) -> None:
    exit_code = main([])

    assert exit_code == 1
    assert "skills" in capsys.readouterr().out


def test_main_dispatches_skills_list(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["skills", "list"])

    assert exit_code == 0
    assert "no actions implemented yet" in capsys.readouterr().out
