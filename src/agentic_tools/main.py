"""Run the grouped agentic-tools CLI.

Canonical usage:
- `uv run agentic-tools policy sync`
- `uv run agentic-tools policy check`
- `uv run agentic-tools policy import-vscode`
- `uv run agentic-tools skills sync`
"""

from collections.abc import Sequence
import os
from pathlib import Path
import sys
from typing import Annotated, Callable

import click
import typer

import agentic_tools.agents_policy.main as agents_policy_main
import agentic_tools.skills_management.main as skills_management_main
from agentic_tools.utils.paths import AgenticToolsPaths

app = typer.Typer(
    add_completion=False,
    help="Run shared policy and skills workflows from one grouped CLI.",
    invoke_without_command=True,
    no_args_is_help=False,
)
policy_app = typer.Typer(
    add_completion=False,
    help="Sync or check generated agent policy files.",
    invoke_without_command=True,
)
app.add_typer(policy_app, name="policy")


def normalize_exit_code(code: object) -> int:
    if isinstance(code, int):
        return code
    if code is None:
        return 0
    return 1


def _run_in_workspace(ctx: typer.Context, callback: Callable[[], int]) -> int:
    workspace = ctx.obj
    previous_cwd: Path | None = None
    if isinstance(workspace, Path):
        previous_cwd = Path.cwd()
        os.chdir(workspace)

    try:
        return callback()
    finally:
        if previous_cwd is not None:
            os.chdir(previous_cwd)


def build_policy_arguments(*, command: str, config: str | None) -> list[str]:
    arguments: list[str] = []
    if command == "check":
        arguments.append("--check")
    elif command == "import-vscode":
        arguments.append("--import-vscode")

    if config is not None:
        arguments.extend(["--config", config])

    return arguments


@app.callback()
def root_callback(
    ctx: typer.Context,
    workspace: Annotated[
        Path | None,
        typer.Option(
            "--workspace",
            "-w",
            dir_okay=True,
            exists=True,
            file_okay=False,
            help="Run the selected command from this workspace directory.",
            resolve_path=True,
        ),
    ] = None,
) -> None:
    ctx.obj = workspace
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit(code=1)


@policy_app.callback()
def policy_callback(ctx: typer.Context) -> None:
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit(code=1)


@policy_app.command(
    "sync",
    help=(
        f"Sync generated policy files from "
        f"{AgenticToolsPaths.config_path().as_posix()}."
    ),
)
def policy_sync(
    ctx: typer.Context,
    config: Annotated[
        str | None,
        typer.Option(
            "--config",
            "-c",
            help="Path to an agents config or policy file.",
        ),
    ] = None,
) -> int:
    return _run_in_workspace(
        ctx,
        lambda: agents_policy_main.run(
            build_policy_arguments(command="sync", config=config)
        ),
    )


@policy_app.command(
    "check",
    help="Report drift without rewriting generated policy files.",
)
def policy_check(
    ctx: typer.Context,
    config: Annotated[
        str | None,
        typer.Option(
            "--config",
            "-c",
            help="Path to an agents config or policy file.",
        ),
    ] = None,
) -> int:
    return _run_in_workspace(
        ctx,
        lambda: agents_policy_main.run(
            build_policy_arguments(command="check", config=config)
        ),
    )


@policy_app.command(
    "import-vscode",
    help="Import VS Code approvals into the policy file before syncing.",
)
def policy_import_vscode(
    ctx: typer.Context,
    config: Annotated[
        str | None,
        typer.Option(
            "--config",
            "-c",
            help="Path to an agents config or policy file.",
        ),
    ] = None,
) -> int:
    return _run_in_workspace(
        ctx,
        lambda: agents_policy_main.run(
            build_policy_arguments(command="import-vscode", config=config)
        ),
    )


@app.command(
    "skills",
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True},
    help="List, link, sync, and unlink shared skills.",
)
def skills_command(ctx: typer.Context) -> int:
    return _run_in_workspace(ctx, lambda: skills_management_main.main(ctx.args))


def main(arguments: Sequence[str] | None = None) -> int:
    argv = list(arguments) if arguments is not None else sys.argv[1:]
    command = typer.main.get_command(app)

    try:
        result = command.main(
            args=argv,
            prog_name="agentic-tools",
            standalone_mode=False,
        )
    except click.ClickException as error:
        error.show()
        return error.exit_code
    except click.Abort:
        return 1
    except typer.Exit as error:
        return error.exit_code

    return normalize_exit_code(result)


if __name__ == "__main__":
    raise SystemExit(main())
