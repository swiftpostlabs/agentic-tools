#!/usr/bin/env node
// @ts-check
import { runAgentsPolicy } from "../src/agentic_tools/agents_policy/main.mjs";
process.exitCode = await runAgentsPolicy(process.argv.slice(2));
