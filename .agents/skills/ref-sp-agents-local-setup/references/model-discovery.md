# Finding Out What Models Exist Right Now

Model releases turn over in weeks. Any list held in a model's training data, including this skill's
own `./model-cache.md`, is stale by default. This file is the procedure for getting a current
answer, and for refreshing the cache when it has aged.

**Rule: never answer "which local model should I use" from memory.** Run the queries. They take
seconds and they are the difference between a real recommendation and a confident guess.

## Source 1: ollama.com, for what you can pull today

The library search page accepts capability and ordering parameters and is the fastest filtered view.

```bash
# Tool-capable models, most popular first (the default ordering).
curl -s "https://ollama.com/search?c=tools" | grep -oP '(?<=href="/library/)[a-z0-9._-]+' | sort -u

# Newest first, for "what came out recently".
curl -s "https://ollama.com/search?c=tools&o=newest" | grep -oP '(?<=href="/library/)[a-z0-9._-]+'

# Free-text search.
curl -s "https://ollama.com/search?q=coder&c=tools" | grep -oP '(?<=href="/library/)[a-z0-9._-]+'
```

Capability filters for `c=`: `tools`, `thinking`, `vision`, `embedding`, `cloud`. Ordering for `o=`:
`newest`. Filters combine, so `?c=tools&c=vision` narrows further.

**`c=tools` is the filter that matters.** An agent needs tool calling; browsing the unfiltered
library wastes time on models that cannot act.

There is no `ollama search` subcommand. The website is the index; the CLI only knows about models
you have already pulled.

### Per-model detail

The model page lists every tag with download size, context window, and modality. Extract it:

```bash
curl -s "https://ollama.com/library/<model>" \
  | sed -e 's/<[^>]*>/\n/g' \
  | grep -E "context window|^tools$|^thinking$|^vision$"
```

Tag naming conventions worth recognizing:

- Bare size tags (`:27b`, `:9b`) are the standard quantized GGUF builds.
- `-mlx` tags are Apple Silicon MLX builds. Prefer them on a Mac.
- `-cloud` tags run on Ollama's infrastructure, not the machine. Not local inference.
- `:latest` is an alias for whichever size the publisher considers the default. Never write it into
  a configuration; pin the explicit tag so the setup does not silently change size.

### Once pulled, the model itself is authoritative

```bash
ollama show <model>
```

Reports architecture, parameter count, native context length, quantization, and the capability list.
When a table and `ollama show` disagree, `ollama show` is right for the build in hand.

## Source 2: Hugging Face, for everything else

Use Hugging Face when the model is not in Ollama's library, when you need a specific quantization,
or when you want to see what is trending across the whole ecosystem rather than one curated catalog.

The API needs no authentication for public models.

```bash
# Trending GGUF models.
curl -s 'https://huggingface.co/api/models?filter=gguf&sort=trendingScore&direction=-1&limit=20' \
  | python3 -c "import json,sys; [print(m['modelId'], m.get('downloads'), m.get('likes')) for m in json.load(sys.stdin)]"

# Most-downloaded MLX builds, for Apple Silicon.
curl -s 'https://huggingface.co/api/models?filter=mlx&sort=downloads&direction=-1&limit=20' \
  | python3 -c "import json,sys; [print(m['modelId']) for m in json.load(sys.stdin)]"

# Find the canonical repo for a named model.
curl -s 'https://huggingface.co/api/models?search=<name>&sort=downloads&direction=-1&limit=5' \
  | python3 -c "import json,sys; [print(m['modelId']) for m in json.load(sys.stdin)]"
```

Sort keys: `downloads`, `likes`, `trendingScore`, `lastModified`. Filters worth knowing: `gguf`,
`mlx`, `text-generation`.

Publishers to recognize, because they determine what you actually get:

- The **original organization** (`Qwen/`, `google/`, `meta-models/`, `nvidia/`, `ibm-granite/`)
  publishes the reference weights. Start here to read the model card and config.
- `unsloth/`, `bartowski/`, `ggml-org/` publish GGUF conversions across quantization levels.
- `mlx-community/`, `lmstudio-community/` publish MLX builds.
- Anything else, including aggressively named "uncensored" or "abliterated" derivatives, is a
  community fine-tune. Treat provenance as unverified and do not recommend one for agent work
  without a reason.

### Reading architecture from the config

The model card is marketing; `config.json` is fact. This is how the architecture and KV-cache
columns in `./model-cache.md` are derived.

```bash
curl -sL "https://huggingface.co/<org>/<model>/raw/main/config.json" | python3 -m json.tool | head -40
```

What to read out of it:

| Field | Tells you |
| --- | --- |
| `num_experts` / `num_local_experts` present | Mixture-of-experts. Absent means dense. |
| `num_experts_per_tok` | Active experts per token, the source of MoE's speed advantage. |
| `num_hidden_layers` | Layer count, a KV-cache multiplier. |
| `num_key_value_heads`, `head_dim` | The dominant KV-cache terms. |
| `layer_types` | Per-layer `full_attention` vs `sliding_attention`. Decides real cache cost. |
| `sliding_window` | Window size for sliding layers. |
| `num_kv_shared_layers` | Layers sharing a cache, reducing it further. |
| `max_position_embeddings` | Native maximum context. |

Naming also encodes architecture: `Qwen3.5-35B-A3B` means 35B total parameters with 3B active, so
mixture-of-experts. `-FP8`, `-NVFP4`, `-GPTQ-Int4`, `-mxfp4` are quantization formats.

Nested configs: multimodal models put the language fields under `text_config`. Read that key when
the top level lacks them.

## Refreshing `./model-cache.md`

Do this when the cache's `Verified` date is more than roughly a month old, when the user asks about
a model not listed, or before giving a recommendation that a person will spend money or a day on.

1. **Pull the candidate list.** `curl -s "https://ollama.com/search?c=tools"`, both default and
   `o=newest` ordering. Keep models with local (non-cloud) tags; note which are cloud-only.
2. **Get sizes, contexts, and capabilities** from each model page.
3. **Find the upstream Hugging Face repo** for each and read `config.json` for architecture.
4. **Compute KV cache at 64K** with the layer-type correction. `uv run scripts/local_model_fit.py` (in this skill)
   does this arithmetic; the formula is in `./hardware.md`.
5. **Rewrite the table**, update the `Verified` date, and note anything that was dropped and why.
6. **Do not silently keep a row you did not re-verify.** Delete it or mark it unverified. A stale
   row that looks fresh is worse than a missing one.

Tier assignments (agentic / assist / utility) are judgement, not measurement. When you change one,
say what evidence moved it.
