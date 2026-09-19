# Agent Plugins 1.0

Load this when a plugin must reach clients beyond the Claude family, or when deciding between the
Claude-format manifest and the portable one.

Agent Plugins is a vendor-neutral packaging standard for agent extensions. Spec:
<https://agent-plugins.org/specification>. Repo: <https://github.com/agentplugins/agent-plugins-spec>.
Current release is **1.0.0**.

## The `$schema` value is the opt-in switch

A plugin declares itself portable by the exact schema string, nothing else:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "acme-skills"
}
```

Copilot CLI states the rule plainly: "The exact `$schema` value
`https://agent-plugins.org/schemas/1.0.0/plugin.schema.json` opts a plugin into Agent Plugins 1.0
semantics." A root `plugin.json` *without* that string is read as a legacy Copilot-format manifest
instead, so the field is not decorative.

`$schema` and `name` are the only required fields.

## The schema is closed

This is the property that drives every downstream decision:

> The only permitted top-level fields are `$schema`, `name`, `version`, `description`, `author`,
> `homepage`, `repository`, `license`, `keywords`, and `extensions`.

**There is no `skills` field, and no way to add one.** A manifest that carries one is invalid rather
than merely ignored: "If a required field is missing, has the wrong type, is empty, or otherwise
violates its requirements, the manifest is invalid."

Client-specific data goes under `extensions`, keyed by reverse-domain namespace
(`extensions.com.openai`, and equivalents for other clients). Conformant clients ignore namespaces
they do not implement without validating them, so carrying another client's extension block is safe.

## Package layout

```text
my-plugin/
├── plugin.json          # required, at the plugin root
├── skills/              # optional, fixed discovery location
├── mcp.json             # optional, fixed location
├── com.example.client/  # optional client extension directory
└── LICENSE, CHANGELOG.md, …
```

### Skills

Discovered at `skills/` only. Each immediate subdirectory containing a `SKILL.md` regular file is one
skill, and "Clients MUST NOT recursively search deeper descendants for additional skills." Skills
themselves conform to the separate Agent Skills specification, unchanged.

### MCP servers

Declared in `mcp.json` at the plugin root, never inline in `plugin.json`:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "acme-db": { "command": "./bin/server", "args": ["--port", "0"] }
  }
}
```

Transports are `stdio`, `streamable-http`, and the deprecated `sse`. For stdio, `command` must be
"either a bare executable name or a plugin-relative path beginning with `./`". The working directory
defaults to the plugin root.

## Path containment

> When a client discovers, reads, or executes a file or directory supplied by the plugin package, the
> filesystem-resolved path MUST remain within the filesystem-resolved plugin root.

The operative word is **resolved**. A symlink inside `skills/` that points outside the plugin root
resolves outside it, so it does not satisfy the rule. Under Agent Plugins semantics a plugin cannot
reach skills that live elsewhere in the repo by linking to them; the content has to be inside.

## Publishing a subset is a filesystem question, not a manifest one

Claude-format manifests express a publish set by enumerating paths in `skills`. Agent Plugins has no
such field, discovers `skills/` wholesale, and forbids resolving outside the plugin root. Three
consequences follow, and they decide how a repo with mixed-visibility skills publishes:

- **Every immediate subdirectory of `skills/` with a `SKILL.md` ships.** There is no supported way to
  exclude one.
- **The plugin root must physically contain the publishable skills.** A repo whose canonical skills
  live somewhere else (`.agents/skills/`, say) stages copies into a plugin root at build time.
- **Visibility becomes structural.** Filtering happens when the staging step decides what to copy, so
  a skill that should not ship is absent rather than merely unlisted. That is a stronger guarantee
  than enumeration, which depends on a generator staying correct.

A dev-time symlink farm still works for local iteration, because nothing is installed from the
checkout. It is the published artifact that must satisfy containment.

## Client conformance

A conformant client must load plugins from directory paths, parse and validate `plugin.json` against
the closed schema, ignore `extensions` namespaces it does not implement, discover components in the
fixed locations, and support at least one component type. Clients launching subprocesses must supply
`PLUGIN_ROOT` (absolute path to the plugin directory) and `PLUGIN_DATA` (client-managed persistent
data directory).

Two rules make partial support safe to rely on:

- **Incremental adoption is allowed.** "A client is not required to support every component type." A
  client may implement skills and ignore MCP entirely.
- **Failures are isolated.** "A failure isolated to a component type, component entry, or component
  process MUST NOT prevent the client from loading independently valid components." One broken skill
  does not take the plugin down.

`${PLUGIN_ROOT}` and `${PLUGIN_DATA}` placeholders expand only in MCP server `args`, `env` values, and
`cwd`, as a single non-recursive textual replacement. Anything that looks like a placeholder elsewhere
stays literal.

## What v1 deliberately leaves out

Only **Agent Skills** and **MCP servers** are portable component types. Commands, hooks, agents,
rules, and LSP servers are excluded because they "remain too client-specific for a stable portable
contract", and are deferred to later versions.

So a plugin carrying hooks or commands ships them as client-specific configuration under an
`extensions` namespace, and they reach exactly the clients that read that namespace. Treat any claim
that hooks are portable across plugin clients as false for v1. For authoring the hooks themselves, use
the repo's hooks skill (`.agents/skills/ref-sp-agents-hooks/SKILL.md`).
