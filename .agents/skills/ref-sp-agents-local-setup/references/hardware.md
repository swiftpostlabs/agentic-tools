# Reading The Machine

Everything downstream depends on four numbers: accelerator memory, system RAM, accelerator
generation, and whether the accelerator is supported by the runtime at all. Measure them before
recommending anything.

## What to look for, in priority order

1. **Accelerator memory.** Dedicated VRAM, or unified memory on Apple Silicon. This is the budget.
2. **System RAM.** The overflow tier. Usable, roughly an order of magnitude slower for inference.
3. **Accelerator generation and driver.** Decides whether the runtime uses the GPU *at all*.
4. **CPU cores.** Only matters when you are already falling back to CPU, which you are trying not
   to do.

Storage matters only for download size. Models are read into memory, so a fast SSD shortens the
first load and nothing else.

## Commands

### NVIDIA, Linux or Windows

```bash
nvidia-smi --query-gpu=name,memory.total,memory.used,driver_version,compute_cap --format=csv
```

`compute_cap` and `driver_version` are the gate, not the memory. Ollama requires compute capability
5.0 or newer and driver 550 or newer; cards with compute capability 5.0 through 6.2 need driver 570
or newer. A card below those floors is a CPU-only machine regardless of how much VRAM it reports.

Multiple GPUs: `nvidia-smi -L` lists UUIDs. Restrict Ollama to a subset with
`CUDA_VISIBLE_DEVICES` as a comma-separated list; UUIDs are more reliable than numeric IDs because
ordering varies. Setting an invalid ID such as `-1` forces CPU.

### Apple Silicon

```bash
system_profiler SPHardwareDataType | grep -E "Chip|Memory"
sysctl -n hw.memsize | awk '{print $1/1073741824 " GB"}'
```

Unified memory is shared between CPU and GPU, so the whole figure is the budget minus whatever the
OS and applications are using. Do not plan to use all of it. On a 16 GB Mac, budget around 11 to
12 GB for the model.

Apple Silicon is the best value per gigabyte for this workload precisely because unified memory
removes the discrete-VRAM cliff: a 32 GB Mac runs models that need a 24 GB discrete card.

Intel Macs work with llama.cpp but without GPU acceleration. Treat them as CPU-only.

### AMD

```bash
rocm-smi --showproductname --showmeminfo vram   # if ROCm is installed
lspci | grep -Ei 'vga|3d|display'               # identify the card first
```

Ollama needs the AMD ROCm v7 driver stack on Linux and a ROCm v7 / HIP7-capable driver on Windows.
Supported families include Radeon RX 9000, RX 7000, and RX 6000 series, Radeon PRO W7000 and W6000,
Radeon AI PRO, Ryzen AI, and Instinct MI series. Cards outside the ROCm list may still work through
the Vulkan backend, which is a fallback rather than a peer in performance.

### Anything, including working out whether there is a usable GPU at all

```bash
lspci | grep -Ei 'vga|3d|display'   # Linux
free -g                             # Linux system RAM
nproc                               # Linux core count
wmic path win32_VideoController get name, AdapterRAM   # Windows, legacy but present
```

An integrated GPU listed alongside a discrete one is not the accelerator you want. Confirm which one
the runtime actually selected with `ollama ps` after loading a model.

## The fit calculation

```
footprint  ~=  weights  +  KV cache(context)  +  ~1 GB runtime overhead
```

**Weights** = the download size reported by the model registry. Ollama's default tags are already
quantized, generally around 4-bit, so a "27B" model downloads at roughly 17 to 19 GB rather than
54 GB.

**KV cache**, for a model with global attention on every layer:

```
KV bytes  =  2  x  layers  x  kv_heads  x  head_dim  x  context  x  bytes_per_element
```

`bytes_per_element`: 2 at f16 (default), 1 at `q8_0`, 0.5 at `q4_0`.

### The correction that matters

Models with **sliding window** or **hybrid** attention keep a full-length cache only on their global
layers; sliding layers cache a fixed small window. Some also share KV across layers. Applying the
naive formula to them overestimates badly.

Worked from the published configs, at 64K context and f16:

| Model | Attention shape | Naive estimate | Corrected |
| --- | --- | --- | --- |
| Gemma 4 31B | 10 global / 50 sliding @1024 | 64.4 GB | **11.6 GB** |
| Gemma 4 E4B | 7 global / 35 sliding @512, 18 KV-shared | 2.4 GB | **0.6 GB** |
| Muse Glimmer 30B | 13 global / 39 sliding @2048 | 3.5 GB | **0.95 GB** |
| Qwen3.8 27B | 64 global | 17.2 GB | **4.3 GB** (16 KV groups, not 64 layers of full heads) |

The general lesson: KV cost is driven by `kv_heads x head_dim x global_layers`, not by parameter
count. A model's KV appetite is a design decision independent of its size, which is why an 8B model
with 8 KV heads and no sliding window (Granite 4.1 8B, 10.7 GB at 64K) can cost more cache than a
30B MoE with 2 KV heads (Nemotron 3.5 Lightning, 3.5 GB).

Per-model figures are precomputed in `./model-cache.md`. Recompute them for a model that is not
listed using the procedure in `./model-discovery.md`.

### Verify against reality

The formula predicts; `ollama ps` measures.

```bash
ollama ps
```

```
NAME          ID              SIZE      PROCESSOR          CONTEXT    UNTIL
qwen3.5:4b    2a654d98e6fb    5.4 GB    59%/41% CPU/GPU    65536      2 minutes from now
```

Read all four columns:

- `SIZE` is the real footprint, weights plus cache plus overhead.
- `PROCESSOR` anything short of `100% GPU` means part of the model is running on the CPU and the
  whole thing is running at CPU speed for that fraction. This is the number to optimize.
- `CONTEXT` is what the server actually allocated. If it says 4096 when you asked for 65536, the
  configuration did not reach the server.

A measurement from a GTX 1650, 4 GB VRAM, 16 GB system RAM, on `qwen3.5:4b` (3.4 GB download):
3.7 GB and 58% GPU at 4K context; 5.4 GB and 41% GPU at 64K. The context change alone cost 1.7 GB,
against a predicted 2.0 GB. Predictions in this file run slightly conservative, which is the
direction you want.

## Turning the numbers into a verdict

Accelerator memory actually available to the model, after the desktop takes its share:

| Available | Harness class | Verdict |
| --- | --- | --- |
| < 6 GB | FIM completion | Utility models only. Inline autocomplete, commit messages, summaries. Not an agent. |
| 6 to 24 GB | FIM completion | Autocomplete runs well; at most short, supervised agent runs. |
| 24 to 48 GB | Tool-calling agent | 27B to 35B class agentic coding at long context. The first tier that is genuinely comfortable. |
| 48 GB+ | Tool-calling agent | Long-horizon sessions, larger models, or several loaded at once. |

The harness class column matters more than the verdict column. A machine in the top two rows is not
too small for local models; it is too small for *agents*, and should be pointed at FIM completion
instead. The skill's Step 3 covers that choice.

CPU-only is a real configuration for batch and overnight work, and a bad one for interactive agent
loops. Order of magnitude on an 8-core CPU: around 10 tokens/second for a 9B model, 2 to 5
tokens/second for a 30B, which is 30 to 120 seconds per response before counting prefill.

Say the verdict out loud before configuring anything. A machine in the bottom two rows should be
told it is in the bottom two rows.
