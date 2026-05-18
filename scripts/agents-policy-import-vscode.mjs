#!/usr/bin/env node
// @ts-check
import { runAgentsPolicyImportVscode } from "../src/agentic_tools/agents_policy/main.mjs";
process.exitCode = await runAgentsPolicyImportVscode();
