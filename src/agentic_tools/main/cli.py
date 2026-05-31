"""Minimal Typer entrypoint for the new agentic-tools scaffold."""

from collections.abc import Sequence

import click
import typer

from agentic_tools.features.skills.main import app as skills_app
from agentic_tools.core.translations.main import translate

app = typer.Typer(
    add_completion=False,
    help=translate("app.description"),
    invoke_without_command=True,
    no_args_is_help=False,
)
app.add_typer(skills_app, name="skills")


def normalize_exit_code(code: object) -> int:
    if isinstance(code, int):
        return code
    if code is None:
        return 0
    return 1


@app.callback()
def root_callback(ctx: typer.Context) -> None:
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit(code=1)


def main(arguments: Sequence[str] | None = None) -> int:
    command = typer.main.get_command(app)
    try:
        result = command.main(
            args=list(arguments) if arguments is not None else None,
            prog_name=translate("app.name"),
            standalone_mode=False,
        )
    except click.ClickException as error:
        error.show()
        return error.exit_code
    except click.exceptions.Exit as error:
        return normalize_exit_code(error.exit_code)

    return normalize_exit_code(result)


if __name__ == "__main__":
    raise SystemExit(main())
