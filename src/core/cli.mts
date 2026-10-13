#!/usr/bin/env node
import { runCli } from './program.ts';

// A closed pipe (`agentic-tools skills list | head`) is a normal way for output to end.
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') {
    process.exit(process.exitCode ?? 0);
  }
  throw error;
});

process.exitCode = await runCli(process.argv.slice(2));
