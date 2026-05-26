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
skills_app = typer.Typer(
    add_completion=False,
    help="List, link, sync, and unlink shared skills.",
    invoke_without_command=True,
)
app.add_typer(policy_app, name="policy")
app.add_typer(skills_app, name="skills")


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
    except (
        agents_policy_main.AgentsPolicyError,
        skills_management_main.SkillsManagementError,
    ) as error:
        print(error)
        return 1
    finally:
        if previous_cwd is not None:
            os.chdir(previous_cwd)


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


@skills_app.callback()
def skills_callback(ctx: typer.Context) -> None:
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
        lambda: agents_policy_main.execute_policy_command(config=config),
    )


@skills_app.command("list", help="List skills from a source repo.")
def skills_list(
    ctx: typer.Context,
    source: Annotated[
        str | None,
        typer.Option(
            "--from",
            "-f",
            help=(
                "Source repository root or exact .agents/skills directory. "
                "Defaults to the current working directory."
            ),
        ),
    ] = None,
) -> int:
    return _run_in_workspace(
        ctx, lambda: skills_management_main.handle_list_command(source)
    )


@skills_app.command("link", help="Link skills from a source repo.")
def skills_link(
    ctx: typer.Context,
    skills: Annotated[list[str], typer.Argument(help="Skill names to link")],
    source: Annotated[
        str | None,
        typer.Option(
            "--from",
            "-f",
            help=(
                "Source repository root or exact .agents/skills directory. "
                "Defaults to the current working directory."
            ),
        ),
    ] = None,
    destination: Annotated[
        str | None,
        typer.Option(
            "--to",
            "-t",
            help=(
                "Destination repository root or exact .agents/skills directory. "
                "Defaults to the current working directory."
            ),
        ),
    ] = None,
    use_global: Annotated[
        bool,
        typer.Option("--global", "-g", help="Use ~/.agents/skills as the destination."),
    ] = False,
    dry_run: Annotated[
        bool,
        typer.Option(
            "--dry-run", help="Print the link plan without creating symlinks."
        ),
    ] = False,
    force: Annotated[
        bool,
        typer.Option(
            "--force", help="Replace an existing symlink that points somewhere else."
        ),
    ] = False,
) -> int:
    return _run_in_workspace(
        ctx,
        lambda: skills_management_main.handle_link_command(
            skills=skills,
            source=source,
            destination=destination,
            use_global=use_global,
            dry_run=dry_run,
            force=force,
        ),
    )


@skills_app.command("sync", help="Link skills declared in a skills config.")
def skills_sync(
    ctx: typer.Context,
    destination: Annotated[
        str | None,
        typer.Option(
            "--to",
            "-t",
            help=(
                "Destination repository root or exact .agents/skills directory. "
                "Defaults to the current working directory."
            ),
        ),
    ] = None,
    use_global: Annotated[
        bool,
        typer.Option("--global", "-g", help="Use ~/.agents/skills as the destination."),
    ] = False,
    config: Annotated[
        str | None,
        typer.Option(
            "--config",
            "-c",
            help=(
                "Path to an agents config or skills config file. Defaults to "
                f"<destination>/{AgenticToolsPaths.config_path().as_posix()}, with "
                f"{AgenticToolsPaths.skills_config_path().as_posix()} fallback."
            ),
        ),
    ] = None,
    dry_run: Annotated[
        bool,
        typer.Option(
            "--dry-run", help="Print the sync plan without creating symlinks."
        ),
    ] = False,
    force: Annotated[
        bool,
        typer.Option(
            "--force", help="Replace an existing symlink that points somewhere else."
        ),
    ] = False,
) -> int:
    return _run_in_workspace(
        ctx,
        lambda: skills_management_main.handle_sync_command(
            destination=destination,
            use_global=use_global,
            config=config,
            dry_run=dry_run,
            force=force,
        ),
    )


@skills_app.command("unlink", help="Remove linked skills from a destination repo.")
def skills_unlink(
    ctx: typer.Context,
    skills: Annotated[list[str], typer.Argument(help="Skill names to unlink")],
    source: Annotated[
        str | None,
        typer.Option(
            "--from",
            "-f",
            help=(
                "Source repository root or exact .agents/skills directory. "
                "Defaults to the current working directory."
            ),
        ),
    ] = None,
    destination: Annotated[
        str | None,
        typer.Option(
            "--to",
            "-t",
            help=(
                "Destination repository root or exact .agents/skills directory. "
                "Defaults to the current working directory."
            ),
        ),
    ] = None,
    use_global: Annotated[
        bool,
        typer.Option("--global", "-g", help="Use ~/.agents/skills as the destination."),
    ] = False,
    dry_run: Annotated[
        bool,
        typer.Option(
            "--dry-run", help="Print the unlink plan without removing symlinks."
        ),
    ] = False,
) -> int:
    return _run_in_workspace(
        ctx,
        lambda: skills_management_main.handle_unlink_command(
            skills=skills,
            source=source,
            destination=destination,
            use_global=use_global,
            dry_run=dry_run,
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
        lambda: agents_policy_main.execute_policy_command(config=config, check=True),
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
        lambda: agents_policy_main.execute_policy_command(
            config=config, import_vscode=True
        ),
    )


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
