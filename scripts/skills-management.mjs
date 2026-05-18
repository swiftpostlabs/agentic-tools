#!/usr/bin/env node
// @ts-check
import { runSkillsManagement } from "../src/agentic_tools/skills_management/main.mjs";
process.exitCode = await runSkillsManagement(process.argv.slice(2));
