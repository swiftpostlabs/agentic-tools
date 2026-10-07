---
name: ref-sp-agents-local-setup
description: "Run a coding agent against a model on your own hardware: measure the machine, compute whether weights plus KV cache actually fit, choose the right harness class for that budget (tool-calling agent, text-edit-format assistant like Aider, or fill-in-the-middle completion), pick a model that is current rather than remembered, serve it with Ollama, and wire pi or Hermes to it. Includes a dated model table and the commands to refresh it. Use when: setting up or debugging a local LLM for an agent, deciding whether a machine should run an agent, Aider, or inline autocomplete, choosing between Ollama, llama.cpp, and MLX, asking which model a machine can run or whether it can run one at all, sizing VRAM, unified memory, quantization, or context window, checking what models exist right now on ollama.com or Hugging Face, wiring pi, Hermes, or another agent client to a local or OpenAI-compatible endpoint, or diagnosing a local agent that is slow, silent on the first turn, or never calls its tools."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.tags: "llm, ollama, local-models, hardware, inference"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-agents-instructions-authoring, tool-sp-setup-agent-repo, ref-sp-agents-verification-discipline"
---

# Local Models For Agents

## Purpose

Get an agent running on a model on the user's own hardware, and be honest about what that machine
can and cannot do. Local inference is a fallback for some people and the whole point for others:
air-gapped work, regulated data, zero marginal cost, no rate limits. Both readings are served by the
same sequence, because both are decided by the same constraint.

The constraint is memory, not model quality. Almost every "local models are useless" verdict is
really a machine that could not hold the weights and a working context window at the same time, and
almost every fix is one of: smaller model, quantized KV cache, shorter context, or different
hardware.

## When to use this skill

- Setting up a local model for a coding agent, or replacing a cloud provider with a local one.
- "Can my machine run this?" or "what is the biggest model I can run?"
- Choosing between Ollama, llama.cpp, and MLX, or between a 9B and a 30B.
- Checking what models exist **right now**, rather than reciting a list from training data.
- Wiring pi, Hermes, or any other client to a local or OpenAI-compatible endpoint.
- Debugging a local agent that is slow, silent for minutes on the first turn, never calls tools, or
  gets truncated mid-session.

**Route elsewhere when:** the question is which *hosted* model to call, or how to use a provider
SDK. That is not this skill. When the question is how a repo's instruction files reach a client,
that is `.agents/skills/ref-sp-agents-instructions-authoring/SKILL.md`.

## The recommended setup, stated up front

**pi + Ollama + the largest tool-capable model that fits at 64K context.** On Apple Silicon, prefer
an MLX build of that model.

That is the default because Ollama handles model download, memory placement, and hardware backends
with no per-machine build step, and because pi and Ollama already know about each other:
`ollama launch pi` wires the client to the local server in one command. Hermes is the alternative
worth knowing, and it is the better choice when the user wants a managed runtime with a GUI or is
already inside the Nous ecosystem. Both are documented here; neither is a compromise.

Deviate from the default when there is a reason: llama.cpp directly when you need per-model context
presets, quantized KV cache, or router-managed multi-model serving, and pi drives it natively.

**That default assumes the machine can serve an agent at all.** Roughly 24 GB of accelerator memory
is the floor. Below it, the right answer is a different class of tool rather than a worse agent, and
Step 3 makes that call before any model is chosen.

## Order of operations

Do these in order. Skipping step 1 or 2 is how people end up blaming a model for a memory problem.

1. **Measure the machine.** Accelerator memory first, then system RAM, then CPU.
2. **Compute the budget.** Weights + KV cache at the target context must fit in accelerator memory.
3. **Choose the harness class** the budget can actually serve. This decides what the model needs.
4. **Pick a model** that fits, meets the class's requirements, and is current.
5. **Serve it**, with context and keep-alive set deliberately rather than defaulted.
6. **Wire the client** and confirm it can actually see the model.
7. **Verify** with real work and a look at the GPU/CPU split.

## Step 1: measure the machine

The number that decides everything is **accelerator memory**: dedicated VRAM on a discrete GPU, or
unified memory on Apple Silicon. System RAM is the fallback tier, and it is roughly an order of
magnitude slower for this workload.

```bash
# Linux / Windows with an NVIDIA card
nvidia-smi --query-gpu=name,memory.total,driver_version,compute_cap --format=csv

# Apple Silicon: unified memory is the budget
system_profiler SPHardwareDataType | grep -E "Chip|Memory"

# System RAM, any Linux
free -g
```

Full per-OS command set, AMD and Intel cases, and the driver and compute-capability floors Ollama
requires: `./references/hardware.md`.

**Translate the number into a verdict before going further.** Accelerator memory available for the
model, after the desktop and other processes take their share:

| Accelerator memory | Harness class it can serve | What is honestly achievable |
| --- | --- | --- |
| < 6 GB | FIM completion | Inline autocomplete, commit messages, summarization. Not an agent. |
| 6 to 12 GB | FIM, or edit-format assistant | A small model doing bounded, single-file, closely supervised edits. |
| 12 to 24 GB | Edit-format assistant, short agent runs | A capable mid-size model. Real assistance. |
| 24 to 48 GB | Tool-calling agent | Agentic coding with a 27B to 35B class model at long context. |
| 48 GB+ | Tool-calling agent | Long-horizon autonomous sessions, or several models loaded at once. |

The middle column is the point. A machine below the agent floor is not a machine that cannot run
anything; it is a machine that should be running a different class of tool. Step 3 covers the
choice.

CPU-only inference works and is sometimes the right answer for batch or overnight work. It is not
suitable for interactive agent loops: expect single-digit tokens per second on a 9B model and
minutes of silence during prefill.

## Step 2: compute the budget

Two things occupy accelerator memory, and people only ever count the first.

```
footprint  ~=  weights  +  KV cache(context)  +  ~1 GB runtime overhead
```

Weights are the download size, which is already quantized (Ollama's default builds are roughly
4-bit). The KV cache is the part that surprises people, because it scales linearly with context and
context is exactly what an agent needs a lot of.

For a model with global attention on every layer:

```
KV bytes  =  2 (K and V)  x  layers  x  kv_heads  x  head_dim  x  context  x  bytes_per_element
```

`bytes_per_element` is 2 at f16, 1 at `q8_0`, 0.5 at `q4_0`.

**This formula is an upper bound, and for some models a wildly loose one.** Models with sliding
window or hybrid attention (Gemma 4, Muse Glimmer) only keep a full-length cache on their global
layers, and some also share KV across layers. Computing them as if every layer were global
overestimates Gemma 4 31B by roughly 5x. `./references/model-cache.md` carries per-model figures
that already account for this.

**Measured example, so the numbers are not theoretical.** On a GTX 1650 (4 GB VRAM) with 16 GB
system RAM, `qwen3.5:4b` (3.4 GB download):

| Context | Reported footprint | GPU/CPU split |
| --- | --- | --- |
| 4K | 3.7 GB | 58% GPU |
| 64K | 5.4 GB | 41% GPU |

Raising context alone cost 1.7 GB and pushed the majority of the model onto the CPU. The formula
predicted 2.0 GB for that delta, which is the right order and slightly conservative. Predict with
the formula, then confirm with `ollama ps`.

**Context floor: 64K.** Ollama's own documentation says tasks like agents and coding tools should be
set to at least 64000 tokens, and Hermes enforces 64K as a minimum for its local models. Below that,
an agent's system prompt and tool schemas crowd out the actual work. Treat 64K as a requirement, not
a preference: a model that only fits at 8K has not been made to fit, it has been made useless.

**When it does not fit,** in order of preference: quantize the KV cache to `q8_0` (roughly half the
cache, quality impact usually not noticeable), then drop to a smaller model at the same
quantization, then take a smaller weight quantization. Do not go below 4-bit weights; the quality
loss stops being worth it.

## Step 3: choose the harness class

**Do not assume the answer is an agent.** Three classes of tooling drive a local model, they ask
very different things of it, and picking the wrong class is the most common way a viable machine
gets written off as too small.

| Class | What the model must do | Realistic floor | Examples |
| --- | --- | --- | --- |
| **Tool-calling agent** | Emit valid tool calls across dozens of turns under a large system prompt | ~24 GB | pi, Hermes, Claude Code, OpenCode |
| **Text-edit-format assistant** | Emit a well-formed edit block as plain text | ~8 GB | Aider |
| **FIM completion** | Fill in the middle of a span, fast | ~2 GB | `llama.vscode`, `llama.vim` |

**The gate moves with the class.** Tool calling is mandatory for the first class and irrelevant to
the other two. An edit-format assistant asks the model for structured *text*, so models without a
`tools` capability are usable. A FIM engine asks for a completion, so it needs a base model trained
with fill-in-the-middle tokens, which most instruct-tuned chat models are not.

**Prefill cost falls with the class too.** An agent harness re-sends its tool schemas every turn,
which is exactly what hurts on slow hardware. An edit-format assistant sends a repo map and the
files you named. A FIM engine sends a window around the cursor. On a machine running partly on CPU,
this difference dominates the felt experience more than model quality does.

### Text-edit-format assistants

Aider is the mature example. Its edit formats (`whole`, `diff`, `diff-fenced`, `udiff`,
`editor-diff`, `editor-whole`) are all plain structured text, so **no tool calling is required**. It
sizes Ollama's context to each request plus about 8k for the reply rather than demanding a fixed
window, which matters when the budget is tight.

Be straight with the user about the limits. Aider's own documentation says most local models are
"just barely capable" of working with it and that editing errors are probably unavoidable,
and it flags quantized models specifically as prone to malformed edits.

There is also a trap in the standard fix. `--edit-format whole` is the recommended fallback for
models that mangle diffs, but it makes the model emit the entire file on every edit. On hardware
that is already spilling to CPU, that buys reliability with the scarcest resource. Expect minutes
per edit on a large file.

**Maintenance check, verified 2026-09-03:** Aider's last commit was 2026-05-22 and its last tagged
release was v0.86.0 in August 2025, with only `.dev` tags since. Not archived, still functional,
48k+ stars. But recent commits are model-list upkeep rather than development, so it is not tracking
the model landscape. Say this when recommending it, and re-check the dates rather than repeating
them.

### FIM completion

Inline completion is a latency problem, not a capability problem. A 3B model that answers in
150 ms is worth more than a 27B that answers in two seconds, so this is the one class where small
hardware is not a compromise.

`llama.vscode` and `llama.vim` run against a llama.cpp server with a preset. Verified from
llama.cpp's `common/arg.cpp`:

```bash
llama-server --fim-qwen-1.5b-default   # <8 GB VRAM: Qwen2.5-Coder-1.5B Q8_0, port 8012
llama-server --fim-qwen-3b-default     # <16 GB VRAM: Qwen2.5-Coder-3B Q8_0
llama-server --fim-qwen-7b-default     # >16 GB VRAM
llama-server --fim-qwen-30b-default    # >64 GB VRAM
```

The presets set `n_batch`/`n_ubatch` to 1024 and `n_cache_reuse` to 256, which is what keeps
completion latency low. Leave them alone.

**FIM models are a separate, older population.** The frontier moved to agentic models, so the
practical FIM choices are still Qwen2.5-Coder (0.5B to 32B), StarCoder2, CodeGemma, and Stable
Code, most of them a year or two old with 8K to 32K contexts. That is fine: a completion engine does
not need 256K.

**On a machine below the agent floor, recommend this first.** It is the local tooling that will
actually get used daily, and it runs entirely on the GPU with room to spare.

## Step 4: pick a model

Three filters, applied in this order.

1. **Meet the harness class's capability gate.** For a tool-calling agent that means a `tools`
   capability, and it is a hard gate: an agent that cannot call tools cannot read a file or run a
   command. This is the single most common reason a local agent "works" in chat and does nothing in
   a repo. For an edit-format assistant the gate is instruction-following, not tools. For FIM it is
   fill-in-the-middle training.
2. **It must fit at the class's context**, by step 2. 64K for an agent; an edit-format assistant and
   a FIM engine need far less.
3. **It must be current.** Model turnover is measured in weeks. Do not answer from memory.

For what exists right now, read `./references/model-cache.md`. That file is a **dated snapshot**, not
a live source. If its date is more than a few weeks old, or the user asks about anything not in it,
refresh it first with the procedure in `./references/model-discovery.md`. That reference is the one
to load whenever the question is "what is available", on ollama.com or on Hugging Face.

**Match the model class to the job.** A model can be genuinely good and still be the wrong tool:

- **Agentic / long-running sessions.** Needs tool calling that survives dozens of turns, long
  context, and stable instruction-following under a large system prompt. Realistically 27B class and
  up, or a 30B-A3B mixture-of-experts.
- **Assist.** Bounded single-file edits, tests, review, explanation, with a human in the loop.
  9B to 14B class is genuinely useful here.
- **Completion / utility.** Commit messages, renames, summaries, classification. 2B to 4B is fine
  and fast.

Mixture-of-experts models are the notable win for local use: a 30B-A3B activates roughly 3B
parameters per token, so it generates at small-model speed while needing large-model memory to hold
all the experts. When accelerator memory is plentiful and compute is not, prefer MoE.

## Step 5: serve it

Ollama is the default. Install, then set the things whose defaults are wrong for agent work:

```bash
ollama pull <model>

# The two that matter most for agents.
OLLAMA_CONTEXT_LENGTH=65536   # default is far too small for agent prompts
OLLAMA_KEEP_ALIVE=24h         # default unloads after 5 minutes, so every session re-prefills
```

Set these as service environment variables rather than shell exports, or the background server never
sees them. Per-OS instructions, the full environment variable list, KV cache quantization, flash
attention, Modelfile parameters, per-machine tuning, and Apple Silicon MLX specifics:
`./references/ollama.md`.

## Step 6: wire the client

The fastest path, when the client is one Ollama knows:

```bash
ollama launch pi --model <model>
ollama launch hermes --model <model>
```

`ollama launch` also covers Claude Code, Codex, OpenCode, OpenClaw, Copilot CLI, Cline, Qwen Code,
Droid, Kimi, and VS Code. Use `--config` to write the configuration without starting the client.

For manual configuration, per-client detail, and the compatibility flags that OpenAI-compatible
servers need:

- pi: `./references/pi.md`, including its native llama.cpp router integration.
- Hermes: `./references/hermes.md`, including its managed runtime and local timeout behaviour.
- Any other client: point it at `http://localhost:11434/v1` as an OpenAI-compatible endpoint with a
  placeholder API key. Most clients reject a keyless provider, so send a dummy value.

## Step 7: verify

Three checks, in order. Each one fails differently, so do not collapse them.

```bash
# 1. The server answers at all.
curl -s http://localhost:11434/v1/models | head

# 2. The model is where you think it is. PROCESSOR should say 100% GPU,
#    and CONTEXT should be the value you set, not 4096.
ollama ps

# 3. The agent can actually act. Ask it to do something that requires a tool,
#    such as reading a named file, and confirm it calls the tool rather than
#    describing what it would do.
```

Check 3 is the one people skip, and it is the one that catches a model whose tool calling degrades
under a long system prompt. Text that *narrates* a tool call is a failure, not a success.

**A silent first turn is usually prefill, not a hang.** Agents send a large system prompt and tool
schemas on every call. On slow hardware the model can process that for minutes before emitting a
token. Keep the model loaded (`OLLAMA_KEEP_ALIVE`) so this is paid once, and raise the client's
streaming timeout before concluding anything is broken.

## Give a small model a small instruction file

A repo's `AGENTS.md` is usually written for a frontier model. Handing the same file to a local 4B to
14B model makes it worse, not better: every rule competes with the task for a much smaller attention
budget, the file is re-prefilled on every turn on hardware that prefills slowly, and some clients
truncate it silently (Hermes caps injected context files at `context_file_max_chars`, default
20,000 characters).

When a repo is driven by a local model, point the client at a trimmed instruction file.
`./assets/AGENTS.lean.md` is a template for one: commands, a folder map, and a short numbered rule
list, with the reasoning stripped out. Keep rules a small model can check itself against, and leave
out anything a linter already enforces deterministically.

## Say no when the answer is no

If the machine cannot hold a tool-capable model at 64K, say so plainly. Do not configure a
4K-context 3B model into an agent harness and let the user discover over the next hour that it
cannot edit a file. Naming the constraint costs one sentence; hiding it costs an afternoon.

**"No" is about the harness class, not about local models.** Say which of these applies rather than
stopping at the refusal:

- The machine can run FIM completion well, and that is worth setting up today.
- It can run an edit-format assistant marginally, with slow turns and some malformed edits.
- Agentic work on this hardware needs a hosted model, or different hardware.

Refusing the agent while naming the two things that do work is a useful answer. Refusing outright
is not.

The same honesty applies to speed. "It works" and "it is usable interactively" are different claims.
Measure tokens per second before promising either.

## References

Load these when the situation calls for them, not preemptively.

| File | Load when |
| --- | --- |
| `./references/hardware.md` | Measuring a machine, per-OS commands, driver and GPU support floors, fit math in detail. |
| `./references/ollama.md` | Installing, configuring, or tuning Ollama; environment variables; Modelfile parameters; MLX on Apple Silicon; troubleshooting. |
| `./references/model-discovery.md` | Finding what models exist now, on ollama.com or Hugging Face, and refreshing the cache table. |
| `./references/model-cache.md` | Choosing a specific model, for any harness class. Dated snapshot: check its date before trusting it. |
| `./references/pi.md` | Setting up or debugging pi against a local model. |
| `./references/hermes.md` | Setting up or debugging Hermes against a local model. |

To audit and fix a specific machine rather than read the rules, use `tool-sp-setup-local-agents`.
It runs these checks against a real host and maps each finding to a fix.

`./assets/AGENTS.lean.md` is a copy-and-fill instruction-file template for repos driven by a small
local model.

`uv run ./scripts/local_model_fit.py` reports what the current machine can run and which locally
installed models fit at a given context. Run it before advising on hardware, so the advice is measured rather
than assumed.
