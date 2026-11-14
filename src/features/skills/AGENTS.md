# src/features/skills

`agentic-tools skills <list|link|sync|update|unlink>`: links skills from a source repo into a
destination's `.agents/skills/`. The config shape and consumer workflow are `ref-sp-agents-skills-management`;
the visibility and `requires` rules it enforces are `ref-sp-agents-shareable-skills`.

## What it holds

- `skills.command.ts`: the four sub-commands. Skill names are a variadic positional.
- `skills.ts`: the operations behind them, including the `requires` closure and alias redirects.
- `manifest.ts`: reads each `SKILL.md`'s sharing metadata and the alias map.
- `config.ts`: parses the `skills` section of `.agents/config.json` or a bare skills config.
- `sources.ts`: resolves where a source's skills live, including `package:agentic-tools`, which
  falls back to this package's own install so the Python shim finds its bundled skills.
- `links.ts`: creates, reads, and removes directory links, with the Windows junction fallback.
- `git.ts`: git source names, the bare-clone store, locks between concurrent syncs, and exports.
- `gitSources.ts`: pins, fetches, and exports one git source for `sync` and `update`.
- `lock.ts`: reads and writes a config's lock, `.agents/agentic-tools.lock` for the default config.

## Rules

- **It never copies skill files into `.agents/skills/`.** It writes links, the destination's
  `.gitignore` for synced skills, and, on `sync`, renamed skill names back into the config and git
  pins into the lock. Git sources are exported to the gitignored `.agents/local/sources/`, and the
  links point there.
- **Git runs with prompts off** (`GIT_TERMINAL_PROMPT=0`, `GCM_INTERACTIVE=never`) and through
  `execFileSync`, never a shell.
- **Refuse rather than overwrite:** an existing link to somewhere else is replaced only with
  `--force`, and a real directory never. The one exception: a link into one of the repo's own
  exports (a folder under `.agents/local/sources/` carrying the export marker) moves without
  `--force` when its pin changes.
- **A failed sync changes nothing in the repo:** conflicts are checked before the first write, and
  exports written while reading sources are removed on failure. The bare clones in the tools home
  are a shared cache, fetched under a lock per clone.
- **Locks are files created exclusively,** holding host and pid. A lock whose process on this host
  is gone is stale at once; one from another host is never broken; one whose owner cannot be read
  is stale after 10 minutes. A stale lock is removed only under a short `<lock>.break` guard, and a
  process removes only a lock that still holds its own record. Order: the config's
  `.sync.lock`, then a bare clone's, then an export's.
- **Every write has a `--dry-run` path** that reports it without making it.
