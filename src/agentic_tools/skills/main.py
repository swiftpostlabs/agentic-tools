"""Placeholder `skills` subcommands for the new scaffold."""

import typer

app = typer.Typer(
    add_completion=False,
    help="Placeholder skills commands for the new scaffold.",
    invoke_without_command=True,
)


@app.callback()
def skills_callback(ctx: typer.Context) -> None:
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit(code=1)


@app.command("list", help="Print the current placeholder state.")
def list_skills() -> int:
    typer.echo("skills scaffold: no actions implemented yet")
    return 0
