#! /usr/bin/env node

import { Command } from "commander";

import { commitAllPrompts, generateChangelog } from "./prompts/index.js";

const program = new Command();

// Init commit-all command
program
    .version("0.2.0")
    .command("commit-all")
    .description(
        "Generates a commit message for each scope via GPT and commits all staged changes with the generated message."
    )
    .option("-b, --breaking", "Mark the commit as a breaking change.")
    .option("-s, --scope <scope>", "Specify the scope.")
    .option("-t, --type <type>", "Specify the type.")
    .option("-i, --issue <issue>", "Specify the issue key.")
    .option("-r, --reason <reason>", "Specify the reason for the change.")
    .action(commitAllPrompts);

// Init changelog and version commands
program
    .command("changelog")
    .description("Generates a changelog for the feature branch against destination branch.")
    .option("-d, --destination <destination>", "Specify the destination branch. (defaults to main)")
    .action(generateChangelog);

program.parse(process.argv);
