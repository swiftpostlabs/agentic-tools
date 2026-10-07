"""Print the first open item in .agents/tasks/TODO.md. Copy to .agents/playground/ to use."""

from pathlib import Path
import re


TODO_PATH = Path(".agents/tasks/TODO.md")
DONE_LINE = re.compile(r"^-\s*\[[xX]\]\s+")
OPEN_LINE = re.compile(r"^-\s*(?:\[\s*\]\s*)?(?P<text>\S.*)$")


def find_next_todo(todo_path: Path) -> tuple[int, str] | None:
    for line_number, line in enumerate(
        todo_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if DONE_LINE.match(line):
            continue

        match = OPEN_LINE.match(line)
        text = match.group("text").strip() if match else ""
        if text:
            return line_number, text

    return None


def main() -> None:
    todo_item = find_next_todo(TODO_PATH)
    if todo_item is None:
        print("No open todos found.")
        return

    line_number, text = todo_item
    print(f"{TODO_PATH}:{line_number}: {text}")


if __name__ == "__main__":
    main()
