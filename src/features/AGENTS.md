# src/features

One folder per command group. Each has its own `AGENTS.md` saying what it holds.

| Folder | Command group | What it does |
| --- | --- | --- |
| `policy/` | `policy` | Syncs `.agents/config.json`'s policy into Claude Code, Gemini, and Copilot settings |
| `skills/` | `skills` | Lists, links, syncs, and unlinks skills between repos |
| `plugin/` | `plugin` | Generates and drift-checks `.claude-plugin/` manifests |
| `export/` | `export` | Bundles skills for chat assistants that cannot load them |

## Rules

- **A feature's command lives in `<name>.command.ts`** beside its logic. It exports
  `create<Name>Command(context)`, which returns citty's `defineCommand` for the group and for each
  runnable sub-command. Help text lives in the `meta` and `args` descriptions. The program
  validates arguments before `run` is called, so `run` reads `args` as given.
- **Commands stay thin.** They map parsed arguments onto the feature's own functions, which take
  plain options and the context, and hold no parsing of their own.
- **Expected failures throw `ToolError`.** A command that reports several problems before failing
  prints them through `context.output` and calls `context.setExitCode(1)`.
- **Features import each other only through exported functions**, never a private file, and with no
  cycles. Code two features share stays in the feature that owns the concept, or moves to `core/`
  only once it is plumbing that every feature could use.
- **Every config or settings file is parsed with a zod schema** through `parseWith`, so a bad file
  fails with a field path.
- A new feature gets its folder, its `AGENTS.md`, a row in the table above, and one line in
  `core/program.ts`.
