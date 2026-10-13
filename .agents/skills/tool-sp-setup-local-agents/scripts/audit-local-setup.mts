#!/usr/bin/env node
/**
 * Audit this machine's local-model setup against the local-setup baseline.
 *
 * Measures the accelerator, reads the Ollama server's real configuration, lists installed models and
 * their capabilities, and detects which agent clients are present. Reports findings as check IDs so
 * the calling skill can map each one to a fix.
 *
 * Detection only: this script never starts, stops, pulls, or reconfigures anything. It also never
 * prints the value of an environment variable whose name suggests a credential.
 *
 *     node audit-local-setup.mts
 *     node audit-local-setup.mts --json
 *     node audit-local-setup.mts --only S2,S3
 *     node audit-local-setup.mts --class agent
 *
 * Exit status: 0 when no check failed, 1 when at least one check failed, 2 on a usage or environment
 * error. Warnings alone do not change the exit status.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

type Status = 'pass' | 'warn' | 'fail' | 'info';
const harnessClasses = ['agent', 'fim'] as const;
type HarnessClass = (typeof harnessClasses)[number];
type Finding = {
  check: string;
  status: Status;
  summary: string;
  detail: string;
};

const finding = (
  check: string,
  status: Status,
  summary: string,
  detail = '',
): Finding => ({ check, status, summary, detail });

const ollamaUrl = 'http://localhost:11434';

/** Context floor per harness class: Ollama's guidance for agents; FIM only sends a window around the cursor. */
const contextFloor: Record<HarnessClass, number> = { agent: 65536, fim: 4096 };

/** Accelerator memory ceiling in GB to the richest harness class that budget can serve. */
const classFloorGb: ReadonlyArray<readonly [number, HarnessClass]> = [
  [24.0, 'fim'],
];

/** Variables Ollama documents. Anything else is reported so a stale setting does not look authoritative. */
const knownOllamaVars: ReadonlySet<string> = new Set([
  'OLLAMA_CONTEXT_LENGTH',
  'OLLAMA_FLASH_ATTENTION',
  'OLLAMA_HOST',
  'OLLAMA_KEEP_ALIVE',
  'OLLAMA_KV_CACHE_TYPE',
  'OLLAMA_MAX_LOADED_MODELS',
  'OLLAMA_MAX_QUEUE',
  'OLLAMA_MODELS',
  'OLLAMA_NO_CLOUD',
  'OLLAMA_NUM_PARALLEL',
  'OLLAMA_ORIGINS',
  'OLLAMA_VULKAN',
  'CUDA_VISIBLE_DEVICES',
  'PATH',
]);

const secretHints = [
  'KEY',
  'TOKEN',
  'SECRET',
  'PASSWORD',
  'CREDENTIAL',
] as const;

const clients = {
  pi: 'pi (coding agent)',
  hermes: 'Hermes Agent',
  'llama-server': 'llama.cpp server',
  opencode: 'OpenCode',
  claude: 'Claude Code',
} as const;

type ClientName = keyof typeof clients;

type Setup = {
  accelerator: string | null;
  acceleratorGb: number | null;
  serverUp: boolean;
  serviceEnv: Record<string, string>;
  models: string[];
  toolCapable: string[];
  clients: ClientName[];
};

const systemName = (): string =>
  os.type() === 'Windows_NT' ? 'Windows' : os.type();

const onPath = (command: string): boolean =>
  (process.env['PATH'] ?? '').split(path.delimiter).some((directory) => {
    const extensions =
      process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
    return extensions.some((extension) =>
      fs.existsSync(path.join(directory, `${command}${extension}`)),
    );
  });

/** Run a command and return stdout, or an empty string on any failure. */
const run = (command: string[]): string => {
  const [program, ...args] = command;
  if (program === undefined || !onPath(program)) {
    return '';
  }
  const result = spawnSync(program, args, {
    encoding: 'utf8',
    timeout: 30_000,
  });
  return result.error === undefined && result.status === 0 ? result.stdout : '';
};

const isDigits = (value: string): boolean => /^\d+$/.test(value);

/** Never echo a value whose variable name suggests a credential. */
export const redact = (name: string, value: string): string =>
  secretHints.some((hint) => name.toUpperCase().includes(hint)) ? '<redacted>'
  : value;

const detectAccelerator = (): { name: string | null; gb: number | null } => {
  const out = run([
    'nvidia-smi',
    '--query-gpu=name,memory.total',
    '--format=csv,noheader,nounits',
  ]).trim();
  if (out !== '') {
    const parts = (out.split(/\r?\n/)[0] ?? '')
      .split(',')
      .map((part) => part.trim());
    if (parts.length >= 2 && isDigits((parts[1] ?? '').replace('.', ''))) {
      return {
        name: parts[0] ?? null,
        gb: (Number(parts[1]) * 1024 * 1024) / 1_000_000_000,
      };
    }
  }
  if (systemName() === 'Darwin') {
    const line = run(['system_profiler', 'SPHardwareDataType'])
      .split(/\r?\n/)
      .find((entry) => entry.includes('Chip'));
    if (line !== undefined) {
      const memory = run(['sysctl', '-n', 'hw.memsize']).trim();
      return {
        name: (line.split(':').slice(1).join(':') || line).trim(),
        gb: isDigits(memory) ? (Number(memory) / 1_000_000_000) * 0.75 : null,
      };
    }
  }
  return { name: null, gb: null };
};

/** The Ollama service environment, which is what the server actually sees. */
const readServiceEnv = (): Record<string, string> => {
  const env: Record<string, string> = {};
  if (systemName() === 'Linux') {
    for (const line of run(['systemctl', 'cat', 'ollama.service']).split(
      /\r?\n/,
    )) {
      const match = /^\s*Environment="?([A-Z_]+)=([^"]*)"?/.exec(line);
      if (match?.[1] !== undefined) {
        env[match[1]] = match[2] ?? '';
      }
    }
  } else if (systemName() === 'Darwin') {
    for (const name of knownOllamaVars) {
      const value = run(['launchctl', 'getenv', name]).trim();
      if (value !== '') {
        env[name] = value;
      }
    }
  }
  return env;
};

const serverReachable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

const installedModels = (): string[] =>
  run(['ollama', 'list'])
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[0] ?? '')
    .filter((name) => name !== '');

/** Installed models that report a tools capability, per `ollama show`. */
const toolCapableModels = (models: string[]): string[] =>
  models
    .slice(0, 25)
    .filter((name) => /^\s*tools\s*$/m.test(run(['ollama', 'show', name])));

const gather = async (): Promise<Setup> => {
  const accelerator = detectAccelerator();
  const models = installedModels();
  return {
    accelerator: accelerator.name,
    acceleratorGb: accelerator.gb,
    serverUp: await serverReachable(),
    serviceEnv: readServiceEnv(),
    models,
    toolCapable: toolCapableModels(models),
    clients: (Object.keys(clients) as ClientName[]).filter(onPath),
  };
};

/** The richest harness class this much accelerator memory can serve. */
export const defaultClass = (budgetGb: number | null): HarnessClass => {
  if (budgetGb === null) {
    return 'fim';
  }
  return classFloorGb.find(([ceiling]) => budgetGb < ceiling)?.[1] ?? 'agent';
};

const checkHardware = (setup: Setup, target: HarnessClass): Finding[] => {
  const findings: Finding[] = [];
  if (setup.accelerator === null) {
    findings.push(
      finding(
        'H1',
        'warn',
        'No accelerator detected; expect CPU-only inference',
        'Interactive agent loops are not viable on CPU. Batch work is.',
      ),
    );
  } else {
    const gb =
      setup.acceleratorGb ? ` (${setup.acceleratorGb.toFixed(1)} GB)` : '';
    findings.push(
      finding('H1', 'pass', `Accelerator: ${setup.accelerator}${gb}`),
    );
  }
  const affordable = defaultClass(setup.acceleratorGb);
  findings.push(
    target === 'agent' && affordable !== 'agent' ?
      finding(
        'H2',
        'fail',
        `Target class 'agent' exceeds this machine; it can serve '${affordable}'`,
        'Pick the affordable class or use a hosted model. Do not configure an agent harness that cannot call tools ' +
          'at a usable context.',
      )
    : finding('H2', 'pass', `Machine can serve harness class '${affordable}'`),
  );
  return findings;
};

export const checkServer = (setup: Setup, target: HarnessClass): Finding[] => {
  const env = setup.serviceEnv;
  const findings = [
    finding(
      'S1',
      setup.serverUp ? 'pass' : 'fail',
      setup.serverUp ?
        'Ollama server is reachable'
      : `Ollama server not reachable at ${ollamaUrl}`,
    ),
  ];

  const floor = contextFloor[target];
  const rawContext = env['OLLAMA_CONTEXT_LENGTH'];
  if (rawContext === undefined) {
    findings.push(
      finding(
        'S2',
        'fail',
        'OLLAMA_CONTEXT_LENGTH is not set; the default is far below the floor',
        `Class '${target}' needs at least ${floor}.`,
      ),
    );
  } else if (isDigits(rawContext) && Number(rawContext) < floor) {
    findings.push(
      finding(
        'S2',
        'warn',
        `Context ${rawContext} is below the ${floor} floor for class '${target}'`,
      ),
    );
  } else {
    findings.push(finding('S2', 'pass', `Context length ${rawContext}`));
  }

  const keepAlive = env['OLLAMA_KEEP_ALIVE'];
  findings.push(
    keepAlive === undefined ?
      finding(
        'S3',
        'warn',
        'OLLAMA_KEEP_ALIVE is not set; models unload after 5 minutes idle',
        'Every pause re-pays prefill of the fixed prompt. Set 24h.',
      )
    : finding('S3', 'pass', `Keep-alive ${keepAlive}`),
  );

  const cache = env['OLLAMA_KV_CACHE_TYPE'] ?? 'f16';
  const tight = setup.acceleratorGb !== null && setup.acceleratorGb < 12.0;
  findings.push(
    tight && cache === 'f16' ?
      finding(
        'S4',
        'warn',
        'KV cache is f16 on a memory-constrained accelerator',
        'q8_0 roughly halves cache memory with little quality cost.',
      )
    : finding('S4', 'pass', `KV cache ${cache}`),
  );

  const parallel = env['OLLAMA_NUM_PARALLEL'];
  findings.push(
    (
      parallel !== undefined &&
        isDigits(parallel) &&
        Number(parallel) > 1 &&
        tight
    ) ?
      finding(
        'S5',
        'warn',
        `OLLAMA_NUM_PARALLEL=${parallel} multiplies cache memory`,
        'Required memory scales by NUM_PARALLEL x CONTEXT_LENGTH.',
      )
    : finding('S5', 'pass', 'Concurrency settings are sane'),
  );

  const unknown = Object.keys(env)
    .filter((name) => !knownOllamaVars.has(name))
    .sort();
  findings.push(
    unknown.length > 0 ?
      finding(
        'S6',
        'warn',
        `Undocumented variables in the service config: ${unknown.join(', ')}`,
        'Likely stale from an older Ollama. Verify each still does anything.',
      )
    : finding('S6', 'pass', 'No undocumented server variables'),
  );
  return findings;
};

export const checkNetwork = (setup: Setup): Finding[] => {
  const host = setup.serviceEnv['OLLAMA_HOST'] ?? '';
  const origins = setup.serviceEnv['OLLAMA_ORIGINS'] ?? '';
  return [
    host.startsWith('0.0.0.0') || host.startsWith('::') ?
      finding(
        'N1',
        'warn',
        `OLLAMA_HOST=${host} listens on every interface`,
        'Ollama has no authentication. Anyone reachable on the network can drive the models. Use 127.0.0.1 unless ' +
          'LAN access is deliberate.',
      )
    : finding('N1', 'pass', `Bound to ${host || '127.0.0.1 (default)'}`),
    origins.trim() === '*' ?
      finding(
        'N2',
        'warn',
        'OLLAMA_ORIGINS=* accepts any browser origin',
        'Any page you visit can reach the server. Narrow it to what needs it.',
      )
    : finding('N2', 'pass', 'CORS origins are not wildcarded'),
  ];
};

const checkModels = (setup: Setup, target: HarnessClass): Finding[] => {
  if (setup.models.length === 0) {
    return [finding('M1', 'fail', 'No models installed')];
  }
  const findings = [
    finding(
      'M1',
      'pass',
      `${setup.models.length} model(s) installed`,
      setup.models.join(', '),
    ),
  ];
  if (target !== 'agent') {
    findings.push(
      finding('M2', 'info', `Class '${target}' does not require tool calling`),
    );
  } else if (setup.toolCapable.length > 0) {
    findings.push(
      finding(
        'M2',
        'pass',
        `${setup.toolCapable.length} tool-capable model(s)`,
        setup.toolCapable.join(', '),
      ),
    );
  } else {
    findings.push(
      finding(
        'M2',
        'fail',
        'No installed model reports a tools capability',
        'An agent that cannot call tools cannot read a file or run a command. This is a hard gate.',
      ),
    );
  }
  return findings;
};

const checkClients = (setup: Setup): Finding[] =>
  setup.clients.length > 0 ?
    [
      finding(
        'C1',
        'pass',
        `Clients present: ${setup.clients.map((name) => clients[name]).join(', ')}`,
      ),
    ]
  : [
      finding(
        'C1',
        'warn',
        'No known local-model client found on PATH',
        'Nothing is wired to the server yet.',
      ),
    ];

const audit = (setup: Setup, target: HarnessClass): Finding[] => [
  ...checkHardware(setup, target),
  ...checkServer(setup, target),
  ...checkNetwork(setup),
  ...checkModels(setup, target),
  ...checkClients(setup),
];

const marks: Record<Status, string> = {
  pass: 'ok  ',
  warn: 'WARN',
  fail: 'FAIL',
  info: 'info',
};

const render = (
  setup: Setup,
  findings: Finding[],
  target: HarnessClass,
): string => {
  const lines = [
    `Local agent setup audit (target harness class: ${target})`,
    '',
  ];
  for (const item of findings) {
    lines.push(`  [${marks[item.status]}] ${item.check}  ${item.summary}`);
    if (
      item.detail !== '' &&
      (item.status === 'warn' || item.status === 'fail')
    ) {
      lines.push(`           ${item.detail}`);
    }
  }
  const names = Object.keys(setup.serviceEnv)
    .sort()
    .filter((name) => name !== 'PATH');
  if (Object.keys(setup.serviceEnv).length > 0) {
    lines.push(
      '',
      'Server configuration seen:',
      ...names.map(
        (name) => `  ${name}=${redact(name, setup.serviceEnv[name] ?? '')}`,
      ),
    );
  }
  const failed = findings.filter((item) => item.status === 'fail').length;
  const warned = findings.filter((item) => item.status === 'warn').length;
  lines.push('', `Summary: ${failed} failed, ${warned} warnings`);
  return lines.join('\n');
};

const usage =
  'Usage: audit-local-setup.mts [--class agent|fim] [--json] [--only ID[,ID...]]\n';

const isHarnessClass = (value: string): value is HarnessClass =>
  (harnessClasses as readonly string[]).includes(value);

const main = async (argv: string[]): Promise<number> => {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        class: { type: 'string' },
        json: { type: 'boolean' },
        only: { type: 'string', default: '' },
        help: { type: 'boolean', short: 'h' },
      },
    }));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n${usage}`,
    );
    return 2;
  }
  if (values.help === true) {
    process.stdout.write(usage);
    return 0;
  }
  if (values.class !== undefined && !isHarnessClass(values.class)) {
    process.stderr.write(
      `error: --class must be one of ${harnessClasses.join(', ')}\n`,
    );
    return 2;
  }
  if (!onPath('ollama')) {
    process.stderr.write('error: ollama is not installed or not on PATH\n');
    return 2;
  }

  const setup = await gather();
  const chosen: HarnessClass =
    values.class ?? defaultClass(setup.acceleratorGb);
  const wanted = new Set(
    values.only
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item !== ''),
  );
  const findings = audit(setup, chosen).filter(
    (item) => wanted.size === 0 || wanted.has(item.check),
  );

  if (values.json === true) {
    const payload = {
      target_class: chosen,
      accelerator: setup.accelerator,
      accelerator_gb: setup.acceleratorGb,
      findings,
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(`${render(setup, findings, chosen)}\n`);
  }
  return findings.some((item) => item.status === 'fail') ? 1 : 0;
};

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === import.meta.filename
) {
  process.exitCode = await main(process.argv.slice(2));
}
