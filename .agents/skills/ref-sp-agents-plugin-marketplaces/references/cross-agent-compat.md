# Cross-client compatibility

Load this when a plugin must reach users on more than one client, or when a detail differs between
Claude Code, GitHub Copilot CLI, and VS Code.

The headline is in the main skill: **one `.claude-plugin/` layout serves all three.** This file covers
what does *not* transfer.

## Manifest detection

Copilot CLI and VS Code search four locations, in order, and stop at the first hit:

1. `.plugin/plugin.json`
2. `plugin.json` (plugin root)
3. `.github/plugin/plugin.json`
4. `.claude-plugin/plugin.json`

Claude Code reads `.claude-plugin/plugin.json` only. Since that path is the last entry in the other
clients' search order, a Claude-format plugin is detected everywhere, and the reverse is not true: a
plugin that only ships `.github/plugin/plugin.json` is invisible to Claude Code.

For the **catalog**, Copilot CLI accepts `.github/plugin/marketplace.json` or
`.claude-plugin/marketplace.json`. Claude accepts only the latter.

**Publish one manifest set, under `.claude-plugin/`.** Maintaining a `.github/plugin/` duplicate buys
nothing and gives you two files to keep in sync.

VS Code also expands `${CLAUDE_PLUGIN_ROOT}` to the plugin's absolute path at runtime, so Claude-format
component references that use the token keep working there.

## Commands and settings by client

| | Claude Code | Copilot CLI | VS Code |
| --- | --- | --- | --- |
| Add a marketplace | `/plugin marketplace add <owner>/<repo>` | `copilot plugin marketplace add <owner>/<repo>` | `chat.plugins.marketplaces` setting |
| Install | `/plugin install <plugin>@<marketplace>` | `copilot plugin install <plugin>@<marketplace>`, or `user/repo`, or `user/repo:subfolder` | Extensions view → `@agentPlugins` |
| List / update / remove | `claude plugin list`, `/plugin marketplace update` | `copilot plugin list`, `copilot plugin update <plugin>`, `copilot plugin uninstall <plugin>` | Extensions view |
| Pre-register for a team | `extraKnownMarketplaces` in `.claude/settings.json` | `~/.copilot/settings.json` (user) or `.github/copilot/settings.json` (repo) | `chat.plugins.marketplaces` |
| Feature flag | — | — | `chat.plugins.enabled` must be `true` |
| Local, unpublished plugin | `directory` / `file` marketplace source | `copilot plugin install <path>` | `chat.pluginLocations` |

Copilot CLI ships with two marketplaces **registered by default** — `copilot-plugins` and
`awesome-copilot` — so a Copilot user already has a catalog before adding yours. Claude has no
equivalent default; its `claude-plugins-official` and `claude-community` marketplaces are opt-in
submission targets.

## Install locations

Every client copies the plugin into its own cache. Nothing runs from your repo checkout, which is why
rule 3 (no traversal outside the plugin root) exists.

| Client | Location |
| --- | --- |
| Claude Code | `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` |
| Copilot CLI, from a marketplace | `~/.copilot/installed-plugins/<marketplace>/<plugin>/` |
| Copilot CLI, direct install | `~/.copilot/installed-plugins/_direct/<plugin>/` |
| VS Code (Linux) | `~/.config/Code/agentPlugins/` |
| VS Code (macOS) | `~/Library/Application Support/Code/agentPlugins/` |
| VS Code (Windows) | `%APPDATA%\Code\agentPlugins\` |

## Manifest fields that are not universal

Copilot's `plugin.json` schema is a superset in places. Fields it defines that Claude does not:

- `commands` — Claude has its own `commands` component, but Copilot also treats `.agent.md` files as
  first-class `agents`.
- `lspServers` — LSP server configs. No Claude equivalent.
- `extensions` — directory paths, or `{ "paths": [...], "exclusive": true }` to suppress built-ins.
- `category`, `tags` — metadata Claude accepts only on a marketplace entry.

Unknown fields are ignored rather than fatal, so a manifest carrying Copilot-only fields still loads in
Claude. The reverse also holds. Keep the shared core (`name`, `description`, `version`, `author`,
`license`, `keywords`, `skills`) authoritative and treat the rest as additive.

Copilot's `marketplace.json` plugin entries accept the same `source` shapes, including the object form
with a pinned ref:

```json
{
  "name": "agent-council",
  "version": "0.1.3",
  "source": { "source": "github", "repo": "Avyayalaya/agent-council", "ref": "v0.1.3" }
}
```

## Precedence and shadowing

Copilot CLI and VS Code resolve skills and agents **first-found**, and project-level components win
over plugin-provided ones. A repo-local skill with the same name as a published one silently shadows
it — usually what you want, but it means a plugin cannot assume its skill is the one that loaded.

MCP servers resolve the other way: **last-loaded wins**, and `--additional-mcp-config` overrides
plugin definitions.

## Enterprise-managed plugins

Copilot lets enterprise administrators define plugin standards for users on the enterprise's Copilot
plan: forcing automatic installation of specific plugins and pre-registering additional marketplaces,
declared in `.github/copilot/settings.json`. The Copilot cloud agent is configured the same way. This
is the Copilot analogue of Claude's `extraKnownMarketplaces` / `strictKnownMarketplaces` controls, and
the practical home for an `organization`-tier catalog on that side.

## What is verified, and what is not

Everything above comes from the official Claude, GitHub, and VS Code docs. One rule in the main skill
does **not** have cross-client confirmation:

- **`skills` replace-vs-add under a marketplace-root source** (critical rule 2) is documented for
  Claude Code. The Copilot and VS Code docs state only that `skills` defaults to `skills/` and accepts
  path arrays; they say nothing about whether enumerating paths suppresses the default scan.

That rule is what enforces a visibility policy, so on Copilot and VS Code treat it as unproven until a
real install confirms the skill count. If it turns out that the default `skills/` directory is always
scanned there, a repo whose skills live outside `skills/` is still safe — but one that keeps
unpublishable skills *inside* `skills/` is not.

## Sources

- <https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-plugins>
- <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference>
- <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating>
- <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace>
- <https://code.visualstudio.com/docs/agent-customization/agent-plugins>
