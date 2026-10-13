# src/features/skills

`agentic-tools skills <list|link|sync|unlink>`: links skills from a source repo into a destination's
`.agents/skills/`. The config shape and consumer workflow are `ref-sp-agents-skills-management`;
the visibility and `requires` rules it enforces are `ref-sp-agents-shareable-skills`.

## What it holds

- `skills.command.ts`: the four sub-commands. Skill names are variadic positionals, read from
  citty's `_`.
- `skills.ts`: the operations behind them, including the `requires` closure and alias redirects.
- `manifest.ts`: reads each `SKILL.md`'s sharing metadata and the alias map.
- `config.ts`: parses the `skills` section of `.agents/config.json` or a bare skills config.
- `sources.ts`: resolves where a source's skills live, including `package:agentic-tools`, which
  falls back to this package's own install so the Python shim finds its bundled skills.
- `links.ts`: creates, reads, and removes directory links, with the Windows junction fallback.

## Rules

- **It never copies skill files.** It writes links, the destination's `.gitignore` for synced
  skills, and, on `sync`, renamed skill names back into the config.
- **Refuse rather than overwrite:** an existing link to somewhere else is replaced only with
  `--force`, and a real directory never.
- **Every write has a `--dry-run` path** that reports it without making it.
