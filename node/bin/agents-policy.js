#!/usr/bin/env node

import { runAgentsPolicy } from "../lib/agents-policy.js";

process.exitCode = await runAgentsPolicy(process.argv.slice(2));
