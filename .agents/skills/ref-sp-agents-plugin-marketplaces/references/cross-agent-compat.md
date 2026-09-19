# Cross-client compatibility

Load this when a plugin must reach users on more than one client, or when a detail differs between
Claude Code, OpenAI Codex, GitHub Copilot CLI, and VS Code.

The headline is in the main skill: **two manifest formats exist, and no single file reaches all four
clients.** This file covers which client reads what, and what does not transfer.

## Manifest detection

| Client | Search order |
| --- | --- |
| Claude Code | `.claude-plugin/plugin.json`. Nothing else. |
| Copilot CLI | Agent Plugins root `plugin.json` → then legacy: `.plugin/plugin.json`, `plugin.json`, `.github/plugin/plugin.json`, `.claude-plugin/plugin.json` |
| VS Code | Agent Plugins root `plugin.json` → Copilot-format `plugin.json` → `.claude-plugin/plugin.json` → `.plugin/plugin.json` |
| Codex / ChatGPT | Root `plugin.json` (Agent Plugins, recommended). `.codex-plugin/plugin.json` is a compatibility fallback. |

Copilot and VS Code check the same locations in slightly different legacy order, which only matters
for a repo shipping several of them at once. Do not.

**The Agent Plugins entry is gated on the exact `$schema` string**, not on the filename. A root
`plugin.json` without `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json` falls through to
the Copilot-format reading. See `./agent-plugins-spec.md`.

**Claude Code does not read a root `plugin.json` at all**, and does not implement Agent Plugins. This
is the asymmetry that breaks the old "one manifest serves everyone" shortcut: `.claude-plugin/` is
last in Copilot's and VS Code's orders, so a Claude-format repo reaches those three, but Codex is
reached only through a root `plugin.json` or the submission portal.

## Catalog locations

| Client | Marketplace manifest |
| --- | --- |
| Claude Code | `.claude-plugin/marketplace.json` |
| Copilot CLI | `.github/plugin/marketplace.json` or `.claude-plugin/marketplace.json` |
| VS Code | `chat.plugins.marketplaces` setting pointing at a repo |
| Codex | `$REPO_ROOT/.agents/plugins/marketplace.json`, `~/.agents/plugins/marketplace.json`, or `$REPO_ROOT/.claude-plugin/marketplace.json` (legacy-compatible) |

`.claude-plugin/marketplace.json` is accepted by all four. Unlike the plugin manifest, the **catalog**
really does have one portable location, so keep it there.

## Commands and settings by client

| | Claude Code | Codex | Copilot CLI | VS Code |
| --- | --- | --- | --- | --- |
| Add a marketplace | `/plugin marketplace add <owner>/<repo>` | Workspace admins import and sync a GitHub marketplace; personal marketplace at `~/.agents/plugins/marketplace.json` | `copilot plugin marketplace add <owner>/<repo>` | `chat.plugins.marketplaces` setting |
| Install | `/plugin install <plugin>@<marketplace>` | `/plugins` browser in Codex CLI; **Plugins** tab in the ChatGPT apps | `copilot plugin install <plugin>@<marketplace>`, or `user/repo`, or `user/repo:subfolder` | Extensions view → `@agentPlugins` |
| List / update / remove | `claude plugin list`, `/plugin marketplace update` | `/plugins` browser (install, uninstall, toggle) | `copilot plugin list`, `copilot plugin update`, `copilot plugin uninstall` | Extensions view |
| Pre-register for a team | `extraKnownMarketplaces` in `.claude/settings.json` | Workspace marketplace import | `~/.copilot/settings.json` or `.github/copilot/settings.json` | `chat.plugins.marketplaces` |
| Feature flag | — | — | — | `chat.plugins.enabled` must be `true` |
| Local, unpublished plugin | `directory` / `file` marketplace source | Local marketplace source | `copilot plugin install <path>` | `chat.pluginLocations` |

Two Codex-specific behaviors have no analogue elsewhere:

- **A new session is required after installing.** Users must "start a new chat and ask ChatGPT or
  Codex to use the plugin." Bundled skills do not appear in the session that installed them.
- **The IDE extension has no plugin support at all.** "Plugins aren't available in the IDE
  extension." Codex users reach plugins through the CLI or the ChatGPT apps only.

Copilot CLI ships with two marketplaces **registered by default** (`copilot-plugins` and
`awesome-copilot`), so a Copilot user already has a catalog before adding yours. Claude has no
equivalent default; its `claude-plugins-official` and `claude-community` marketplaces are opt-in.

## Install locations

Every client copies the plugin into its own cache. Nothing runs from your repo checkout, which is why
the no-traversal rule exists.

| Client | Location |
| --- | --- |
| Claude Code | `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` |
| Copilot CLI, from a marketplace | `~/.copilot/installed-plugins/<marketplace>/<plugin>/` |
| Copilot CLI, direct install | `~/.copilot/installed-plugins/_direct/<plugin>/` |
| VS Code (Linux) | `~/.config/Code/agentPlugins/` |
| VS Code (macOS) | `~/Library/Application Support/Code/agentPlugins/` |
| VS Code (Windows) | `%APPDATA%\Code\agentPlugins\` |

## The OpenAI submission route

Codex adds a distribution shape the others do not have: an archive uploaded through the OpenAI portal
rather than a git marketplace. It accepts the Claude format directly.

Requirements: the archive contains `.claude-plugin/plugin.json` "with a nonempty description and at
least one valid skill at `skills/<skill-name>/SKILL.md`". The portal then "converts it to
`.codex-plugin/plugin.json`" and "adds missing interface defaults and normalizes text fields".

**Note the skills path.** Even on the Claude-format route, the portal requires skills at
`skills/<skill-name>/SKILL.md`. A repo whose skills live elsewhere and are reached by enumeration does
not satisfy this, so the submission route needs the same staged plugin root that Agent Plugins needs.

Three Claude features do not survive the conversion:

- Live artifacts. "OpenAI doesn't currently support Claude live artifacts."
- Installation prompts and `user_config`. "OpenAI doesn't run Claude installation prompts or expand
  `user_config` variables."
- Local MCP servers, which must be redeployed behind a public HTTPS endpoint.

Skill instructions also want provider-neutral wording: "Replace Claude-specific references in the
skill instructions with provider-neutral language, such as 'the model.'"

## Manifest fields that are not universal

Under the **Claude format**, unknown fields are ignored rather than fatal, so a manifest carrying
Copilot-only fields still loads in Claude and vice versa. Fields Copilot defines that Claude does not:

- `commands` — Claude has its own `commands` component, but Copilot also treats `.agent.md` files as
  first-class `agents`.
- `lspServers` — LSP server configs. No Claude equivalent.
- `extensions` — directory paths, or `{ "paths": [...], "exclusive": true }` to suppress built-ins.
- `category`, `tags` — metadata Claude accepts only on a marketplace entry.

Under **Agent Plugins**, tolerance runs the other way: the schema is *closed*, so an unrecognized
top-level field makes the manifest invalid. Client-specific data belongs under `extensions.<reverse
domain>`, where conformant clients ignore namespaces they do not implement. Codex reads
`extensions.com.openai` for presentation, registered MCP server mappings, and hook settings; when that
block is present it replaces the entire overlay.

## Precedence and shadowing

Copilot CLI and VS Code resolve skills and agents **first-found**, and project-level components win
over plugin-provided ones. A repo-local skill with the same name as a published one silently shadows
it, which is usually what you want, but it means a plugin cannot assume its skill is the one that
loaded.

MCP servers resolve the other way: **last-loaded wins**, and `--additional-mcp-config` overrides
plugin definitions.

## Enterprise-managed plugins

Copilot lets enterprise administrators force automatic installation of specific plugins and
pre-register additional marketplaces, declared in `.github/copilot/settings.json`. The Copilot cloud
agent is configured the same way. This is the Copilot analogue of Claude's `extraKnownMarketplaces`
and `strictKnownMarketplaces` controls, and the practical home for an `organization`-tier catalog on
that side. Codex's equivalent is the workspace marketplace import.

## What is verified, and what is not

The publish set is enforced differently per format, and the enforcement rule is only fully documented
on one client.

| Client | Does listing paths in `skills` suppress the default scan? |
| --- | --- |
| Claude Code | **Documented both ways.** "Paths listed in the `skills` field add to that scan." Under a marketplace-root `source`, "the listed paths are the complete set for that entry, and other directories in the shared `skills/` folder don't load." |
| Copilot CLI | **Unresolved.** The reference gives `skills` a default of `skills/` without stating whether listing paths suppresses the default scan. |
| VS Code | **Unresolved.** The docs are silent. |
| Agent Plugins | **Not applicable.** There is no `skills` field; `skills/` is discovered wholesale. |

Treat the replace behavior as proven on Claude Code and unproven elsewhere until a real install
confirms the skill count on that client.

One structural mitigation removes the dependency entirely: if the repo keeps **no** `skills/`
directory at the plugin root, the default scan finds nothing, so add-versus-replace stops mattering
under the Claude format. That safety disappears the moment a staged `skills/` directory exists for
Agent Plugins or the submission portal, at which point the staging filter becomes the enforcement
point.

## Sources

- <https://code.claude.com/docs/en/plugins-reference>
- <https://code.claude.com/docs/en/plugin-marketplaces>
- <https://agent-plugins.org/specification>
- <https://developers.openai.com/plugins/build/plugins>
- <https://developers.openai.com/plugins/guides/submit-claude-plugin>
- <https://learn.chatgpt.com/docs/plugins>
- <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference>
- <https://code.visualstudio.com/docs/agent-customization/agent-plugins>
