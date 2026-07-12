# Visibility and hosting

Load this when deciding **where** a marketplace lives and **which** skills are allowed into it.

## A marketplace is as private as its hosting

A marketplace is not a central Anthropic-hosted registry. It is a `marketplace.json` catalog that
users add **by reference** from a git repo, a direct URL, or a local path, and its accessibility is
inherited entirely from where that repo lives. "Any git hosting service works" — GitHub, GitLab,
Bitbucket, self-hosted.

The docs describe marketplaces as providing "centralized discovery". That means a catalog centralizes
discovery **of its own plugins** — not that all marketplaces live in one registry. Do not overread it.

## Mapping visibility tiers onto hosting

A repo that already tiers its skills for sharing maps directly onto this. The tier names below are
this repo's (`repo-local` / `organization` / `public`); substitute whatever policy the repo runs.

| Tier | Hosting | How users get it |
| --- | --- | --- |
| `public` | Public git repo. Optionally also submit to the public community marketplace. | `/plugin marketplace add <owner>/<repo>` |
| `organization` | **Private** git repo. | `extraKnownMarketplaces` pre-registers it; teammates who trust the project folder are prompted to install. Auto-update needs a token (below). |
| `repo-local` | Not published at all. If it must be loadable, a local `directory`/`file` source never touches the network. | `/plugin marketplace add ./my-marketplace` |

**Claude has no notion of skill-level visibility.** It publishes exactly what the manifest enumerates.
The tier is therefore enforced by *what you list* — which is why the skills list should be generated
from the visibility metadata rather than hand-maintained, and why a CI drift check is the thing that
actually keeps a local-only skill from leaking.

## Private repositories

Supported, with two different credential paths:

- **Manual install and update** use your existing git credential helpers. HTTPS via `gh auth login`,
  the OS keychain, or `git-credential-store` works the same as in your terminal. SSH works when the
  host is already in `known_hosts` and the key is loaded in `ssh-agent` — Claude Code suppresses
  interactive SSH prompts, so an unknown host or a passphrase-locked key simply fails.
- **Background auto-updates run at startup without credential helpers**, because interactive prompts
  would block Claude Code from starting. They need a token in the environment:

| Host | Env var |
| --- | --- |
| GitHub | `GITHUB_TOKEN` or `GH_TOKEN` (needs `repo` scope for private repos) |
| GitLab | `GITLAB_TOKEN` or `GL_TOKEN` |
| Bitbucket | `BITBUCKET_TOKEN` |

Without the token, manual installs still work but auto-update silently stops keeping the team current.

## Org-wide distribution without publishing anywhere

`extraKnownMarketplaces` in `.claude/settings.json` pre-registers a marketplace whose `source` may be a
private `github` / `git` / `url` / `directory` repo. Teammates who trust the project folder are then
prompted to install it. This is the concrete home for an `organization` tier: distribution to a team
with nothing published publicly.

Related administrative controls worth knowing about when a marketplace is org-managed:

- `strictKnownMarketplaces` / `blockedMarketplaces` allowlist or block marketplace sources. Checks run
  on marketplace add and on plugin install, update, refresh, and auto-update — so a marketplace added
  before a policy existed stops being installable if it no longer matches. Matching is exact and does
  **not** normalize URLs: a trailing slash, a `.git` suffix, or `ssh://` vs `https://` are different
  values. Prefer a host pattern over a literal URL when a repo can be cloned by more than one form.
- Seed marketplaces shipped in a read-only image have auto-update disabled, and
  `/plugin marketplace remove|update` against them fails by design.

## Fully local / air-gapped

`source: "directory"` or `"file"`, added with `/plugin marketplace add ./my-marketplace`, never touches
the network. Note that for plugins installed from a local path, only symlinks resolving **within the
plugin's own directory** are preserved; all others are skipped.

## The public Anthropic marketplaces

Two exist, and both are **opt-in submission targets**, not somewhere you land by default:

- `claude-plugins-official` — Anthropic-curated.
- `claude-community` — third-party, after review.

Self-hosting a private or internal marketplace does not involve either. Their names are reserved, so a
third party cannot impersonate them.
