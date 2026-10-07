---
name: tool-sp-setup-local-agents
description: "Audit one machine's local-model setup (accelerator, Ollama config, models, network exposure, client) and fix what is missing. Use when setting up a local model for an agent, or when a local agent is slow, silent, or never calls tools."
argument-hint: "Optional: the harness class to target (agent, edit-format, fim)"
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "llm, ollama, local-models, hardware, inference"
  shareable-skills.requires: "ref-sp-agents-local-setup"
---

# Setup Local Agents

Audits one machine's inference stack and fixes it in a safe order. The rules behind each check (fit
arithmetic, harness classes, per-runtime and per-client detail, the model table) live in
`ref-sp-agents-local-setup`. Wiring a repository to agent clients is `tool-sp-setup-agent-repo`.

The audit reads the machine and the running server instead of asking what was configured, because
the usual failure is a setting the server never read.

## First step

Run the audit before reading anything else or changing a setting:

```bash
uv run <skill-dir>/scripts/audit_local_setup.py
```

It is read-only, prints one line per check plus the server configuration it saw, and exits non-zero
when a check failed. Flags: `--class agent|edit-format|fim` to audit against a target rather than
what the hardware can afford, `--json` when the output feeds another step, `--only H2,S2` to re-run
a subset after a fix. Use `uv run`, not the system `python3`: the script is stdlib-only and
declares its Python version in PEP 723 metadata, so uv fetches a matching interpreter.

Do not re-derive this by hand with `systemctl cat`, `nvidia-smi`, and `ollama list`. That is the
slow path the script replaces, and hand-reading misses the variable that is set but undocumented.

## Check IDs

| ID | Checks |
| --- | --- |
| `H1` | An accelerator exists and was detected |
| `H2` | The target harness class is within what the accelerator can serve |
| `S1` | The Ollama server is reachable |
| `S2` | Context length meets the target class's floor |
| `S3` | Keep-alive is set, so a pause does not re-pay prefill |
| `S4` | KV cache quantization on a memory-constrained accelerator |
| `S5` | Concurrency settings do not multiply cache memory |
| `S6` | No undocumented variables masquerading as configuration |
| `N1` | The server is not listening on every interface |
| `N2` | CORS origins are not wildcarded |
| `M1` | At least one model is installed |
| `M2` | A tool-capable model exists, when the class is `agent` |
| `C1` | A known client is present |

Per-check fix procedures are in `./references/remediation.md`. Load it when acting on a finding.

## Steps

1. **Audit.** Run the script. Note every non-`pass` check.
2. **Settle the harness class first** (`H2`). It changes what every later check means: a context of
   32K is a failure for an agent and correct for autocomplete. If the hardware cannot serve the
   class the user asked for, say so before fixing anything else, and get agreement on the class.
   The classes and their floors are in `ref-sp-agents-local-setup`.
3. **Read the existing configuration as intent, not as error.** A `0.0.0.0` binding may be a
   deliberate choice to reach the server from a phone. Report it as a finding to confirm, not a
   mistake to silently revert.
4. **Confirm before changing anything that reaches outside the machine** or that restarts a service
   other people may be using. Editing a service unit and restarting the server interrupts whoever is
   mid-session on it.
5. **Fix in order**: harness class → server configuration → security → models → client. Each stage
   assumes the previous one. Procedures in `./references/remediation.md`.
6. **Verify empirically**, not by re-reading the config. See below.
7. **Re-run the audit** and report the remaining non-`pass` checks honestly, including any the user
   declined and why.

## Verify empirically

A configuration file is a claim; the loaded model is the evidence. After any change:

```bash
ollama ps
```

`PROCESSOR` should read `100% GPU`. `CONTEXT` should be the value you set. If `CONTEXT` still shows
the old number, the server never saw the change, which is the single most common outcome of editing
Ollama configuration.

Then prove the harness class actually works:

- **agent**: ask it to read a named file, and confirm a tool is invoked rather than described. Text
  that narrates a tool call is a failure.
- **edit-format**: ask for a one-line edit and confirm the edit block applies cleanly.
- **fim**: type in an editor and confirm a completion appears within a few hundred milliseconds.

## Gotchas

- **Shell exports do not configure the server.** Ollama runs as a background service and reads the
  service environment. `export OLLAMA_CONTEXT_LENGTH=65536` in a terminal changes nothing. This is
  the most common false fix; the audit reads the service config precisely because of it.
- **A silent first turn is prefill, not a hang.** Large system prompts take minutes on slow
  hardware. Raise the client's stream timeout before diagnosing anything as broken.
- **Undocumented variables look authoritative.** `S6` exists because a setting from an older Ollama
  survives upgrades in the service file and quietly does nothing. Do not assume a variable works
  because someone set it; check it against the current documented list.
- **A model with a `tools` capability can still fail under load.** Tool calling degrades as the
  system prompt grows. `M2` is necessary, not sufficient. Test it.
- **`ollama launch <client>` overwrites that client's configuration.** Say so before running it
  against a client the user configured by hand. `--restore` is the undo.
- **Detecting a client on PATH is not the same as it being wired.** `C1` reports presence only.
- **Do not tune constants to one machine.** If a prediction is off, report the gap rather than
  editing the estimate to match a single observation.

## Before finishing

- Re-run `audit_local_setup.py`; every check is `pass`, `info`, or an explicitly accepted exception.
- `ollama ps` shows the intended context and `100% GPU` for the chosen model.
- The harness class was proven by a real task, not by a configuration read.
- Any check the user declined is reported as declined, not quietly dropped.

## References

- Read `./references/remediation.md` for the per-check fix procedure, in the order to apply them.
- Read `$SKILLS_FOLDER/ref-sp-agents-local-setup/SKILL.md` for the rules behind every check: fit
  arithmetic, harness classes, and the model table.
- Run `$SKILLS_FOLDER/ref-sp-agents-local-setup/scripts/local_model_fit.py` to size specific models
  against this machine. Pass `--context` and `--kv-bytes` to match the server's real settings, and
  `--config` with a model's `config.json` for an exact rather than estimated cache figure.
- Run `./scripts/audit_local_setup.py` for the audit itself; `--help` lists the flags.
