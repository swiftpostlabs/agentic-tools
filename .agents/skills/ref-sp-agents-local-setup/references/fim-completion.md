# FIM Completion

Detail for the FIM class in Step 3 of the skill.

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
