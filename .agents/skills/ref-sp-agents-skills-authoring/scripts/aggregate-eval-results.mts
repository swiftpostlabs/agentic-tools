#!/usr/bin/env node
/**
 * Aggregate skill eval `grading.json` files into a compact summary.
 *
 *     node aggregate-eval-results.mts <workspace> [--output summary.json] [--markdown summary.md]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

type JsonObject = { [key: string]: unknown };

type RunResult = {
  path: string;
  configuration: string;
  passed: number;
  failed: number;
  total: number;
  pass_rate: number;
  time_seconds: number | null;
};

type ConfigurationSummary = {
  runs: number;
  passed: number;
  failed: number;
  total: number;
  pass_rate_mean: number;
  pass_rate_stdev: number;
  time_seconds_mean: number | null;
  time_seconds_stdev: number | null;
};

export type EvalSummary = {
  runs: RunResult[];
  configurations: Record<string, ConfigurationSummary>;
};

const knownConfigurations = new Set([
  'baseline',
  'new_skill',
  'old_skill',
  'with_skill',
  'without_skill',
]);

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readJson = (file: string): JsonObject => {
  const value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!isObject(value)) {
    throw new Error(`JSON root must be an object: ${file}`);
  }
  return value;
};

const asInt = (value: unknown, fallback = 0): number =>
  Number.isInteger(value) ? (value as number) : fallback;
const asNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const mean = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0) / values.length;

/** Sample standard deviation, like Python's `statistics.stdev`. */
const stdev = (values: number[]): number => {
  const average = mean(values);
  return Math.sqrt(
    values.reduce((total, value) => total + (value - average) ** 2, 0) /
      (values.length - 1),
  );
};

const toPosix = (relative: string): string =>
  relative.split(path.sep).join('/');

/** Name the run's configuration from its folder: a known name, else the nearest non-run folder. */
export const inferConfiguration = (
  root: string,
  gradingPath: string,
): string => {
  const parts = path
    .relative(root, path.dirname(gradingPath))
    .split(path.sep)
    .filter((part) => part !== '');
  if (parts.length === 0) {
    return 'unknown';
  }
  const reversed = [...parts].reverse();
  return (
    reversed.find((part) => knownConfigurations.has(part)) ??
    reversed.find(
      (part) => !part.startsWith('run-') && !part.startsWith('eval-'),
    ) ??
    (parts.at(-1) as string)
  );
};

const readDuration = (
  source: JsonObject,
): { found: boolean; value: number | null } =>
  'total_duration_seconds' in source ?
    { found: true, value: asNumber(source['total_duration_seconds']) }
  : { found: false, value: null };

export const loadRun = (root: string, gradingPath: string): RunResult => {
  const grading = readJson(gradingPath);
  const summary = grading['summary'];
  let passed: number;
  let failed: number;
  let total: number;
  let passRate: number;
  if (isObject(summary)) {
    passed = asInt(summary['passed']);
    failed = asInt(summary['failed']);
    total = asInt(summary['total'], passed + failed);
    passRate =
      asNumber(summary['pass_rate']) ?? (total > 0 ? passed / total : 0);
  } else {
    const expectations =
      Array.isArray(grading['expectations']) ? grading['expectations'] : [];
    passed = expectations.filter(
      (item) => isObject(item) && item['passed'] === true,
    ).length;
    total = expectations.length;
    failed = total - passed;
    passRate = total > 0 ? passed / total : 0;
  }

  const timing = grading['timing'];
  let timeSeconds: number | null = null;
  const inline =
    isObject(timing) ? readDuration(timing) : { found: false, value: null };
  if (inline.found) {
    timeSeconds = inline.value;
  } else {
    const timingPath = path.join(path.dirname(gradingPath), 'timing.json');
    if (fs.existsSync(timingPath) && fs.statSync(timingPath).isFile()) {
      timeSeconds = readDuration(readJson(timingPath)).value;
    }
  }

  return {
    path: toPosix(path.relative(root, gradingPath)),
    configuration: inferConfiguration(root, gradingPath),
    passed,
    failed,
    total,
    pass_rate: passRate,
    time_seconds: timeSeconds,
  };
};

export const summarize = (results: RunResult[]): EvalSummary => {
  const byConfiguration = new Map<string, RunResult[]>();
  for (const result of results) {
    byConfiguration.set(result.configuration, [
      ...(byConfiguration.get(result.configuration) ?? []),
      result,
    ]);
  }
  const configurations: Record<string, ConfigurationSummary> = {};
  for (const name of [...byConfiguration.keys()].sort()) {
    const runs = byConfiguration.get(name) ?? [];
    const passRates = runs.map((run) => run.pass_rate);
    const times = runs
      .map((run) => run.time_seconds)
      .filter((time) => time !== null);
    const sum = (pick: (run: RunResult) => number) =>
      runs.reduce((total, run) => total + pick(run), 0);
    configurations[name] = {
      runs: runs.length,
      passed: sum((run) => run.passed),
      failed: sum((run) => run.failed),
      total: sum((run) => run.total),
      pass_rate_mean: passRates.length > 0 ? mean(passRates) : 0,
      pass_rate_stdev: passRates.length > 1 ? stdev(passRates) : 0,
      time_seconds_mean: times.length > 0 ? mean(times) : null,
      time_seconds_stdev: times.length > 1 ? stdev(times) : null,
    };
  }
  return { runs: results, configurations };
};

export const renderMarkdown = (summary: EvalSummary): string => {
  const lines = [
    '# Skill Eval Summary',
    '',
    '| Configuration | Runs | Pass Rate | Time |',
    '| --- | ---: | ---: | ---: |',
  ];
  for (const [name, data] of Object.entries(summary.configurations)) {
    const time =
      data.time_seconds_mean === null ?
        'n/a'
      : `${data.time_seconds_mean.toFixed(1)}s +/- ${(data.time_seconds_stdev ?? 0).toFixed(1)}s`;
    lines.push(
      `| ${name} | ${data.runs} | ${(data.pass_rate_mean * 100).toFixed(1)}% +/- ${(data.pass_rate_stdev * 100).toFixed(1)}% | ${time} |`,
    );
  }
  return `${lines.join('\n')}\n`;
};

const findGradingFiles = (directory: string): string[] =>
  fs
    .readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((relative) => path.basename(relative) === 'grading.json')
    .map((relative) => path.join(directory, relative))
    .sort();

const main = (argv: string[]): number => {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      output: { type: 'string' },
      markdown: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help === true || positionals.length !== 1) {
    process.stdout.write(
      'Usage: aggregate-eval-results.mts <workspace> [--output <json>] [--markdown <md>]\n',
    );
    return values.help === true ? 0 : 2;
  }

  const workspace = path.resolve(positionals[0]);
  if (!fs.existsSync(workspace) || !fs.statSync(workspace).isDirectory()) {
    process.stderr.write(`Workspace not found: ${workspace}\n`);
    return 2;
  }
  const gradingPaths = findGradingFiles(workspace);
  if (gradingPaths.length === 0) {
    process.stderr.write(`No grading.json files found under ${workspace}\n`);
    return 1;
  }

  let results: RunResult[];
  try {
    results = gradingPaths.map((gradingPath) =>
      loadRun(workspace, gradingPath),
    );
  } catch (error) {
    process.stderr.write(
      `Failed to aggregate eval results: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }

  const summary = summarize(results);
  const summaryJson = JSON.stringify(summary, null, 2);
  if (values.output === undefined) {
    process.stdout.write(`${summaryJson}\n`);
  } else {
    fs.writeFileSync(values.output, `${summaryJson}\n`, 'utf8');
  }
  if (values.markdown !== undefined) {
    fs.writeFileSync(values.markdown, renderMarkdown(summary), 'utf8');
  }
  return 0;
};

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === import.meta.filename
) {
  process.exitCode = main(process.argv.slice(2));
}
