#!/usr/bin/env node

import { runSkillsManagement } from "../src/agentic_tools/skills_management/main.ts";

process.exitCode = await runSkillsManagement(process.argv.slice(2));