"""Placeholder `skills` subcommands for the new scaffold."""

import typer

from agentic_tools.core.translations.main import translate

app = typer.Typer(
    add_completion=False,
    help=translate("skills.description"),
    invoke_without_command=True,
)


@app.callback()
def skills_callback(ctx: typer.Context) -> None:
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit(code=1)


@app.command("list", help=translate("skills.list.help"))
def list_skills() -> int:
    typer.echo(translate("skills.list.placeholder"))
    return 0
