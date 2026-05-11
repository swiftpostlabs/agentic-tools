#!/usr/bin/env node

import { runAgentsPolicyImportVscode } from "../lib/agents-policy.js";

process.exitCode = await runAgentsPolicyImportVscode();
