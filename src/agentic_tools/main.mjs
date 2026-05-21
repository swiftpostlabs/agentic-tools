// @ts-check
import { defineCommand, renderUsage, runCommand } from "citty";
import { runAgentsPolicy } from "./agents_policy/main.mjs";
import { createSkillsManagementCommand } from "./skills_management/main.mjs";
import { ToolError, createExecutionOptions } from "./utils/common.mjs";

/** @import { RunOptions, ExecutionOptions } from "./utils/common.mjs" */
/** @typedef {{ _: string[], [key: string]: unknown }} CommandArgs */

/**
 * @param {CommandArgs} args
 * @param {string} key
 */
const getOptionalStringArg = (args, key) => {
    const value = args[key];
    return typeof value === "string" && value.trim() !== "" ? value : null;
};
/**
 * @param {CommandArgs} args
 * @param {string} context
 */
const assertNoPositionals = (args, context) => {
    if (args._.length > 0) {
        throw new ToolError(`${context} does not accept positional arguments.`);
    }
};
/**
 * @param {"sync" | "check" | "import-vscode"} command
 * @param {string | null} configPath
 */
const buildPolicyArgs = (command, configPath) => {
    /** @type {string[]} */
    const args = [];
    if (command === "check") {
        args.push("--check");
    }
    else if (command === "import-vscode") {
        args.push("--import-vscode");
    }
    if (configPath !== null) {
        args.push("--config", configPath);
    }
    return args;
};
/**
 * @param {"sync" | "check" | "import-vscode"} commandName
 * @param {string} description
 * @param {ExecutionOptions} options
 */
const createPolicySubCommand = (commandName, description, options) => {
    return defineCommand({
        meta: {
            name: commandName,
            description,
        },
        args: {
            config: {
                type: "string",
                alias: ["c"],
                description: "Path to an agents config or policy file.",
            },
        },
        /** @param {{ args: CommandArgs }} context */
        run({ args }) {
            assertNoPositionals(args, commandName);
            return runAgentsPolicy(
                buildPolicyArgs(commandName, getOptionalStringArg(args, "config")),
                options,
            );
        },
    });
};
/**
 * @param {ExecutionOptions} options
 */
const createPolicyCommand = (options) => {
    return defineCommand({
        meta: {
            name: "policy",
            description: "Sync, check, and import generated agent policy files.",
        },
        subCommands: {
            sync: createPolicySubCommand(
                "sync",
                "Sync generated agent policy files.",
                options,
            ),
            check: createPolicySubCommand(
                "check",
                "Check whether generated agent policy files are up to date.",
                options,
            ),
            "import-vscode": createPolicySubCommand(
                "import-vscode",
                "Import VS Code approval maps back into the policy file.",
                options,
            ),
        },
    });
};
/**
 * @param {ExecutionOptions} options
 */
const createAgenticToolsCommand = (options) => {
    return defineCommand({
        meta: {
            name: "agentic-tools",
            description: "Run agent policy and shared-skills commands.",
        },
        subCommands: {
            policy: createPolicyCommand(options),
            skills: createSkillsManagementCommand(options, "skills"),
        },
    });
};
/**
 * @param {string[]} [argv]
 * @param {RunOptions} [options]
 * @returns {Promise<number>}
 */
export const runAgenticTools = async (argv = process.argv.slice(2), options = {}) => {
    const effectiveOptions = createExecutionOptions(options);
    const command = createAgenticToolsCommand(effectiveOptions);
    if (argv.length === 0) {
        effectiveOptions.output(await renderUsage(command));
        return 1;
    }
    try {
        const { result } = await runCommand(command, {
            rawArgs: argv,
            showUsage: true,
        });
        return typeof result === "number" ? result : 0;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        effectiveOptions.logger.error(message);
        return 1;
    }
};
