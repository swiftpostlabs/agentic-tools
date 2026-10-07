# Remediation

Per-check fixes, in the order to apply them. Each stage assumes the previous one, so do not skip
ahead: fixing a context length before settling the harness class means fixing it to the wrong number.

The rules behind these fixes live in `$SKILLS_FOLDER/ref-sp-agents-local-setup/SKILL.md`. This file
is the procedure only.

## Stage 1: harness class (`H1`, `H2`)

Settle this before touching anything else. It sets the target for every later check.

**`H1` no accelerator detected.** Confirm before accepting it. On NVIDIA, a card below Ollama's
floors (compute capability 5.0, driver 550, or driver 570 for compute capability 5.0 to 6.2) is
present but unused. Check with:

```bash
nvidia-smi --query-gpu=name,memory.total,driver_version,compute_cap --format=csv
```

If the driver is the problem, updating it is the fix and it changes the whole verdict. If the card
genuinely is not supported, the machine is CPU-only: viable for batch work, not for interactive
loops.

**`H2` target class exceeds the machine.** Do not fix this by configuring the harness anyway. State
the affordable class and the three real options:

- Run the affordable class, which is usually genuinely useful.
- Use a hosted model for the work that needs an agent.
- Change hardware, and say what the next tier buys.

Get agreement on the class before continuing. If the user insists on the richer class after hearing
the constraint, that is their call: configure it, and say plainly what will be slow.

## Stage 2: server configuration (`S1` to `S6`)

**Set these in the service environment, never as shell exports.** The server is a background process
that does not inherit your shell. This is the most common false fix in the whole area.

Linux (systemd):

```bash
systemctl edit ollama.service
```

```ini
[Service]
Environment="OLLAMA_CONTEXT_LENGTH=65536"
Environment="OLLAMA_KEEP_ALIVE=24h"
```

```bash
systemctl daemon-reload && systemctl restart ollama
```

macOS: `launchctl setenv OLLAMA_CONTEXT_LENGTH 65536`, then restart the Ollama application. Note
that `launchctl setenv` does not survive a reboot on its own.

Windows: set them as user environment variables, then restart the Ollama application.

**Restarting interrupts anyone mid-session on that server.** Confirm before doing it on a shared or
remote host.

**`S1` server unreachable.** Check it is running (`systemctl status ollama`, or the menu bar app),
then that it is on the expected port. A non-default `OLLAMA_HOST` moves it.

**`S2` context below the class floor.** Floors: 65536 for an agent, 16384 for an edit-format
assistant, 4096 for FIM. Set `OLLAMA_CONTEXT_LENGTH` to the floor for the class, then confirm with
`ollama ps` that `CONTEXT` reports the new value.

When only one model needs a larger window, bake it into a derived model instead of raising the
server default for everything:

```bash
cat > /tmp/Modelfile <<'EOF'
FROM <model>
PARAMETER num_ctx 65536
EOF
ollama create <model>-64k -f /tmp/Modelfile
```

**`S3` keep-alive unset.** `OLLAMA_KEEP_ALIVE=24h`. On slow hardware this is the cheapest single
improvement available: it stops every pause from re-paying prefill of the fixed prompt.

**`S4` f16 cache on a constrained accelerator.** `OLLAMA_KV_CACHE_TYPE=q8_0` roughly halves cache
memory for a small quality cost, and needs flash attention (`OLLAMA_FLASH_ATTENTION=1`), which
Ollama enables automatically on supporting backends. `q4_0` quarters it with a more visible loss.

This is a **global** setting affecting every model, and models with a high grouped-query attention
count are more sensitive to it. After changing it, check output quality on a real task rather than
assuming it is free.

**`S5` concurrency multiplying memory.** Required memory scales by
`OLLAMA_NUM_PARALLEL x OLLAMA_CONTEXT_LENGTH`. For a single user, set `OLLAMA_NUM_PARALLEL=1`. On a
tight machine also set `OLLAMA_MAX_LOADED_MODELS=1`, since the default of 3 lets two forgotten
models starve the one in use.

**`S6` undocumented variables.** Do not delete on sight; find out what it was for. It is usually a
setting from an older Ollama that survived an upgrade and now does nothing, which is worse than
useless because it reads as deliberate configuration. Confirm against Ollama's current documented
list, then either remove it or leave a comment saying it is inert and why.

## Stage 3: network exposure (`N1`, `N2`)

**Ollama has no authentication.** Anything that can reach the port can use the models, read whatever
is in a prompt, and consume the machine.

**`N1` bound to every interface.** `OLLAMA_HOST=0.0.0.0` is right when the user deliberately reaches
the server from another device, and wrong when it was set once to test something and left. Ask which
it is. If it should be local only:

```ini
Environment="OLLAMA_HOST=127.0.0.1:11434"
```

If LAN access is genuinely wanted, say plainly that the exposure is unauthenticated, and treat a
laptop that joins untrusted networks as a reason to bind locally and tunnel over SSH instead.

**`N2` wildcard origins.** `OLLAMA_ORIGINS=*` lets any page in the browser reach the server. Narrow
it to the origins that need it. If nothing browser-based uses it, remove the variable.

## Stage 4: models (`M1`, `M2`)

**`M1` nothing installed.** Choose by fit, not by reputation. Size candidates first:

```bash
uv run $SKILLS_FOLDER/ref-sp-agents-local-setup/scripts/local_model_fit.py \
  --context <the server's real context> --kv-bytes <1 for q8_0, 2 for f16>
```

Pass the server's actual settings, or the numbers describe a machine that does not exist. For an
exact per-model cache figure rather than an estimate, download the model's `config.json` from
Hugging Face and pass `--config`.

Then pick from the model table in `ref-sp-agents-local-setup`, checking its date first, and refresh
it if stale rather than trusting a table older than the release cycle.

**`M2` no tool-capable model, class `agent`.** A hard gate: an agent that cannot call tools cannot
read a file or run a command. Filter for it at the source:

```bash
curl -s "https://ollama.com/search?c=tools" | grep -oP '(?<=href="/library/)[a-z0-9._-]+'
```

Confirm the pulled build with `ollama show <model>` and check `tools` appears under Capabilities.
Then test it, because the capability flag says the template supports tool calls, not that the model
makes them reliably under a long system prompt.

## Stage 5: client (`C1`)

The fastest path when Ollama knows the client:

```bash
ollama launch pi --model <model>
ollama launch hermes --model <model>
ollama launch <integration> --config    # write config without launching
```

**This overwrites that client's configuration.** Say so first if the user configured it by hand.
`ollama launch <integration> --restore` puts it back to the default profile.

For manual wiring, point the client at `http://localhost:11434/v1` as an OpenAI-compatible endpoint
with a placeholder API key, since most clients hide a provider that has no key. Per-client detail,
including the compatibility flags that OpenAI-compatible servers need, is in
`ref-sp-agents-local-setup`'s `pi.md` and `hermes.md`.

**Match the client to the class.** An agent client on hardware that can only serve FIM is the
original mistake restated. For FIM, the client is an editor extension against a llama.cpp server:

```bash
llama-server --fim-qwen-1.5b-default    # <8 GB VRAM
llama-server --fim-qwen-3b-default      # <16 GB VRAM
```

**Instruction files.** A repo `AGENTS.md` written for a frontier model makes a small local model
worse: the rules compete with the task, and the file is re-prefilled every turn. Point local setups
at a trimmed file. Template:
`$SKILLS_FOLDER/ref-sp-agents-local-setup/assets/AGENTS.lean.md`.

## After every stage

Re-run the affected checks rather than the whole audit:

```bash
uv run <skill-dir>/scripts/audit_local_setup.py --only S2,S3
```

Then verify empirically with `ollama ps` and a real task. A check that passes because a file says so
is not evidence.
