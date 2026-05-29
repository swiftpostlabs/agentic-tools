#!/usr/bin/env node
// @ts-check
import { runAgenticTools } from "../src/agentic_tools_old/main.mjs";
process.exitCode = await runAgenticTools(process.argv.slice(2));
