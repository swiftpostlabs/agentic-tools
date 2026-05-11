#!/usr/bin/env node

import { runAgentsPolicy } from "../src/agentic_tools/agents_policy/main.ts";

process.exitCode = await runAgentsPolicy(process.argv.slice(2));