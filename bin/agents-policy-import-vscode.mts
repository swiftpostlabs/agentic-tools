#!/usr/bin/env node

import { runAgentsPolicyImportVscode } from "../src/agentic_tools/agents_policy/main.ts";

process.exitCode = await runAgentsPolicyImportVscode();