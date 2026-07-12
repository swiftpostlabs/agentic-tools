"""`plugin` subcommands: generate and verify the Claude Code plugin manifests."""

from pathlib import Path
from typing import Annotated

import typer

from agentic_tools.core.i18n.main import translate
from agentic_tools.features.plugin.manifests import (
    build_manifests,
    find_drifted_manifests,
    write_manifests,
)

app = typer.Typer(
    add_completion=False,
    help=translate("plugin.description"),
    invoke_without_command=True,
)

RootOption = Annotated[
    Path,
    typer.Option("--root", help=translate("plugin.root.help")),
]


@app.callback()
def plugin_callback(ctx: typer.Context) -> None:
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit(code=1)


@app.command("sync", help=translate("plugin.sync.help"))
def sync_plugin(root: RootOption = Path(".")) -> None:
    """Regenerate the plugin and marketplace manifests from the skills catalog."""
    try:
        manifests = build_manifests(root)
    except (OSError, ValueError) as error:
        typer.echo(translate("plugin.error", message=str(error)), err=True)
        raise typer.Exit(code=1) from error

    for written in write_manifests(root, manifests):
        typer.echo(translate("plugin.sync.written", path=written.as_posix()))


@app.command("check", help=translate("plugin.check.help"))
def check_plugin(root: RootOption = Path(".")) -> None:
    """Fail when the committed manifests no longer match the skills catalog."""
    try:
        manifests = build_manifests(root)
    except (OSError, ValueError) as error:
        typer.echo(translate("plugin.error", message=str(error)), err=True)
        raise typer.Exit(code=1) from error

    drifted = find_drifted_manifests(root, manifests)
    if drifted:
        for path in drifted:
            typer.echo(
                translate("plugin.check.drifted", path=path.as_posix()), err=True
            )
        typer.echo(translate("plugin.check.hint"), err=True)
        raise typer.Exit(code=1)

    typer.echo(translate("plugin.check.ok"))
