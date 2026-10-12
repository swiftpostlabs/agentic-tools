"""Run the bundled agentic-tools CLI with the Node runtime from nodejs-wheel-binaries."""

import sys
from pathlib import Path

from nodejs_wheel import node

# Staged by python/hatch_build.py: the TypeScript sources, package.json, the runtime
# node_modules, and .agents/skills. Node runs the .ts entry point directly, which it
# allows anywhere outside a node_modules directory.
CLI_ENTRY = Path(__file__).resolve().parent / "js" / "src" / "cli.ts"


def main() -> int:
    if not CLI_ENTRY.is_file():
        print(f"agentic-tools: the bundled CLI is missing at {CLI_ENTRY}", file=sys.stderr)
        return 1
    result = node(["--disable-warning=ExperimentalWarning", str(CLI_ENTRY), *sys.argv[1:]])
    return result if isinstance(result, int) else result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
