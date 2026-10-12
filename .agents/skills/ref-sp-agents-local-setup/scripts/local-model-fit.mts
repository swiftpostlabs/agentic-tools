#!/usr/bin/env node
/**
 * Report what local models the current machine can actually run.
 *
 * Measures accelerator memory, system RAM, and CPU count, then sizes each locally installed Ollama
 * model against a target context window. Also computes the KV cache for an arbitrary Hugging Face
 * config, which is the arithmetic behind the model cache table in the sibling reference folder.
 *
 * Detection only: this script never pulls, loads, or modifies a model.
 *
 *     node local-model-fit.mts [--context 65536] [--kv-bytes 2]
 *     node local-model-fit.mts --config path/to/config.json
 *     node local-model-fit.mts --json
 *
 * Exit status: 0 always, unless arguments are unusable (2). The verdict is in the output, not the
 * exit code, because "this machine is too small" is a finding rather than a failure.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const GB = 1_000_000_000;
const runtimeOverheadGb = 1.0;
/** Mid-range dense model, 64K context, f16 cache. Scaled by `estimatedKvGb`. */
const referenceKvGbAt64k = 3.0;

/** Accelerator memory ceiling in GB to what is honestly achievable. Mirrors ../references/hardware.md. */
const verdicts: ReadonlyArray<readonly [number, string]> = [
  [6.0, "FIM completion only (inline autocomplete, commit messages). Not an agent."],
  [24.0, "FIM completion; at most short, supervised agent runs."],
  [48.0, "Tool-calling agent: 27B to 35B class coding at long context."],
  [Number.POSITIVE_INFINITY, "Tool-calling agent: long-horizon sessions, or several models loaded."],
];

type Machine = {
  system: string;
  ramGb: number | null;
  cpuCount: number | null;
  accelerator: string | null;
  acceleratorGb: number | null;
  notes: string[];
};

type InstalledModel = { name: string; weightsGb: number };

/** Memory to size models against: the accelerator's if present, else system RAM. */
const budgetGb = (machine: Machine): number => machine.acceleratorGb ?? machine.ramGb ?? 0;

const verdictFor = (machine: Machine): string => {
  const budget = budgetGb(machine);
  return (verdicts.find(([ceiling]) => budget < ceiling) ?? verdicts.at(-1))?.[1] ?? "";
};

const needsGb = (model: InstalledModel, kvGb: number): number => model.weightsGb + kvGb + runtimeOverheadGb;

const systemName = (): string => {
  const type = os.type();
  return type === "Windows_NT" ? "Windows" : type;
};

const onPath = (command: string): boolean =>
  (process.env["PATH"] ?? "").split(path.delimiter).some((directory) => {
    const extensions = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
    return extensions.some((extension) => fs.existsSync(path.join(directory, `${command}${extension}`)));
  });

/** Run a command and return stdout, or an empty string on any failure. */
const run = (command: string[]): string => {
  const [program, ...args] = command;
  if (program === undefined || !onPath(program)) {
    return "";
  }
  const result = spawnSync(program, args, { encoding: "utf8", timeout: 20_000 });
  return result.error === undefined && result.status === 0 ? result.stdout : "";
};

const detectRamGb = (): number | null => {
  if (systemName() === "Linux" && fs.existsSync("/proc/meminfo")) {
    const match = /MemTotal:\s+(\d+) kB/.exec(fs.readFileSync("/proc/meminfo", "utf8"));
    if (match?.[1] !== undefined) {
      return (Number(match[1]) * 1024) / GB;
    }
  }
  if (systemName() === "Darwin") {
    const out = run(["sysctl", "-n", "hw.memsize"]).trim();
    if (/^\d+$/.test(out)) {
      return Number(out) / GB;
    }
  }
  // Windows RAM detection is deliberately absent: the portable options are unreliable, and the
  // accelerator figure is what sizing depends on anyway.
  return null;
};

const detectAccelerator = (): { name: string | null; gb: number | null; notes: string[] } => {
  const notes: string[] = [];

  const nvidia = run([
    "nvidia-smi",
    "--query-gpu=name,memory.total,driver_version,compute_cap",
    "--format=csv,noheader,nounits",
  ]).trim();
  if (nvidia !== "") {
    const parts = (nvidia.split(/\r?\n/)[0] ?? "").split(",").map((part) => part.trim());
    if (parts.length >= 4) {
      const [name = "", mib = "", driver = "", cap = ""] = parts;
      const gb = /^\d+$/.test(mib.replace(".", "")) ? (Number(mib) * 1024 * 1024) / GB : null;
      const driverMajor = Number(driver.split(".")[0]);
      const capability = Number(cap);
      if (!Number.isNaN(driverMajor) && !Number.isNaN(capability)) {
        if (driverMajor < 550) {
          notes.push(`NVIDIA driver ${driver} is below Ollama's 550 floor; the GPU may be unused.`);
        }
        if (capability < 5.0) {
          notes.push(`Compute capability ${cap} is below Ollama's 5.0 floor; this is effectively a CPU-only machine.`);
        }
      }
      return { name, gb, notes };
    }
  }

  if (systemName() === "Darwin") {
    const chipLine = run(["system_profiler", "SPHardwareDataType"])
      .split(/\r?\n/)
      .find((line) => line.includes("Chip"));
    const chip = chipLine === undefined ? "" : (chipLine.split(":").slice(1).join(":") || chipLine).trim();
    if (chip !== "") {
      notes.push("Apple Silicon: unified memory is shared with the OS. Budget roughly 75% of total RAM for the model.");
      const ram = detectRamGb();
      return { name: chip, gb: ram === null || ram === 0 ? null : ram * 0.75, notes };
    }
  }

  if (run(["rocm-smi", "--showmeminfo", "vram"]).trim() !== "") {
    notes.push("AMD GPU detected; confirm ROCm v7 is installed.");
    return { name: "AMD (ROCm)", gb: null, notes };
  }

  notes.push("No supported accelerator detected. Expect CPU-only inference.");
  return { name: null, gb: null, notes };
};

const detectMachine = (): Machine => {
  const accelerator = detectAccelerator();
  return {
    system: `${systemName()} ${os.machine()}`,
    ramGb: detectRamGb(),
    cpuCount: os.cpus().length || null,
    accelerator: accelerator.name,
    acceleratorGb: accelerator.gb,
    notes: accelerator.notes,
  };
};

/** Parse `ollama list` into models with their on-disk weight size. */
export const parseOllamaList = (out: string): InstalledModel[] =>
  out
    .split(/\r?\n/)
    .slice(1)
    .flatMap((line) => {
      const match = /^(\S+)\s+\S+\s+([\d.]+)\s*(GB|MB)/.exec(line);
      if (match === null) {
        return [];
      }
      const size = Number(match[2]);
      return [{ name: match[1] as string, weightsGb: match[3] === "MB" ? size / 1000 : size }];
    });

type JsonObject = { [key: string]: unknown };

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const intField = (data: JsonObject, key: string): number | null => {
  const value = data[key];
  return Number.isInteger(value) ? (value as number) : null;
};

/**
 * KV cache size in GB, honouring sliding-window and KV-shared layers. `null` when the config lacks
 * the fields needed, which is a real outcome worth reporting rather than papering over with a guess.
 */
export const kvCacheGb = (config: JsonObject, context: number, bytesPerElement: number): number | null => {
  const text = isObject(config["text_config"]) ? config["text_config"] : config;
  const layers = intField(text, "num_hidden_layers");
  const kvHeads = intField(text, "num_key_value_heads");
  let headDim = intField(text, "head_dim");
  if (headDim === null) {
    const hidden = intField(text, "hidden_size");
    const heads = intField(text, "num_attention_heads");
    if (hidden !== null && heads !== null && heads !== 0) {
      headDim = Math.floor(hidden / heads);
    }
  }
  if (layers === null || kvHeads === null || headDim === null) {
    return null;
  }

  const window = intField(text, "sliding_window");
  const types = Array.isArray(text["layer_types"])
    ? text["layer_types"].filter((entry): entry is string => typeof entry === "string")
    : [];
  let cachedTokens: number;
  if (types.length > 0) {
    const full = types.filter((entry) => entry === "full_attention").length;
    const sliding = types.filter((entry) => entry === "sliding_attention").length;
    cachedTokens = full * context + sliding * (window === null ? context : Math.min(context, window));
  } else {
    cachedTokens = layers * context;
  }

  const shared = intField(text, "num_kv_shared_layers");
  if (shared !== null && shared !== 0 && layers > shared) {
    cachedTokens = Math.trunc((cachedTokens * (layers - shared)) / layers);
  }
  return (2 * kvHeads * headDim * bytesPerElement * cachedTokens) / GB;
};

/**
 * Rough KV cache size when no config is available: about 3 GB at 64K in f16 for a mid-range dense
 * model, scaled linearly in context and element width. Pass --config for a figure that means something.
 */
export const estimatedKvGb = (context: number, bytesPerElement: number): number =>
  referenceKvGbAt64k * (context / 65536) * (bytesPerElement / 2);

const fixed = (value: number, width = 0): string => value.toFixed(1).padStart(width);

const render = (machine: Machine, models: InstalledModel[], context: number, kvGb: number): string => {
  const budget = budgetGb(machine);
  const lines = [
    "Machine",
    `  System          ${machine.system}`,
    `  CPU cores       ${machine.cpuCount ?? "unknown"}`,
    `  System RAM      ${machine.ramGb ? `${fixed(machine.ramGb)} GB` : "unknown"}`,
    `  Accelerator     ${machine.accelerator ?? "none detected"}${machine.acceleratorGb ? ` (${fixed(machine.acceleratorGb)} GB)` : ""}`,
    `  Budget          ${fixed(budget)} GB`,
    `  Verdict         ${verdictFor(machine)}`,
    ...machine.notes.map((note) => `  ! ${note}`),
    "",
    `Installed Ollama models, sized at ${context} context`,
    `  (estimated KV cache ${fixed(kvGb)} GB; pass --config for a real figure)`,
  ];
  if (models.length === 0) {
    lines.push("  none found (is ollama installed and are any models pulled?)");
  }
  for (const model of [...models].sort((left, right) => left.weightsGb - right.weightsGb)) {
    const needs = needsGb(model, kvGb);
    lines.push(
      `  ${model.name.padEnd(28)} ${fixed(model.weightsGb, 6)} GB weights  -> ${fixed(needs, 6)} GB needed  ` +
        `[${needs <= budget ? "fits" : "TOO BIG"}]`,
    );
  }
  lines.push(
    "",
    "Confirm with `ollama ps` after loading: PROCESSOR should read 100% GPU",
    "and CONTEXT should match what you configured.",
  );
  return lines.join("\n");
};

const round = (value: number, digits: number): number => Number(value.toFixed(digits));

const main = (argv: string[]): number => {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        context: { type: "string", default: "65536" },
        "kv-bytes": { type: "string", default: "2" },
        config: { type: "string" },
        json: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    }));
  } catch (error) {
    process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
  if (values.help === true) {
    process.stdout.write(
      "Usage: local-model-fit.mts [--context <tokens>] [--kv-bytes 1|2] [--config <config.json>] [--json]\n",
    );
    return 0;
  }

  const context = Number(values.context);
  const kvBytes = Number(values["kv-bytes"]);
  if (!Number.isInteger(context) || context <= 0) {
    process.stderr.write(`error: --context must be a positive integer, got ${values.context}\n`);
    return 2;
  }
  if (kvBytes !== 1 && kvBytes !== 2) {
    process.stderr.write("error: --kv-bytes must be 1 (q8_0) or 2 (f16)\n");
    return 2;
  }

  let kvGb = estimatedKvGb(context, kvBytes);
  if (values.config !== undefined) {
    if (!fs.existsSync(values.config) || !fs.statSync(values.config).isFile()) {
      process.stderr.write(`error: no such config: ${values.config}\n`);
      return 2;
    }
    let config: unknown;
    try {
      config = JSON.parse(fs.readFileSync(values.config, "utf8"));
    } catch (error) {
      process.stderr.write(`error: could not read config: ${error instanceof Error ? error.message : String(error)}\n`);
      return 2;
    }
    const computed = isObject(config) ? kvCacheGb(config, context, kvBytes) : null;
    if (computed === null) {
      process.stderr.write("error: config lacks the layer and head fields needed to size the cache\n");
      return 2;
    }
    kvGb = computed;
  }

  const machine = detectMachine();
  const models = parseOllamaList(run(["ollama", "list"]));

  if (values.json === true) {
    const budget = budgetGb(machine);
    const payload = {
      machine: {
        system: machine.system,
        ram_gb: machine.ramGb,
        cpu_count: machine.cpuCount,
        accelerator: machine.accelerator,
        accelerator_gb: machine.acceleratorGb,
        budget_gb: round(budget, 1),
        verdict: verdictFor(machine),
        notes: machine.notes,
      },
      context,
      kv_cache_gb: round(kvGb, 2),
      models: models.map((model) => ({
        name: model.name,
        weights_gb: model.weightsGb,
        needs_gb: round(needsGb(model, kvGb), 1),
        fits: needsGb(model, kvGb) <= budget,
      })),
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(`${render(machine, models, context, kvGb)}\n`);
  }
  return 0;
};

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  process.exitCode = main(process.argv.slice(2));
}
