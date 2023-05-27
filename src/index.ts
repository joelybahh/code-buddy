#! /usr/bin/env node

import { Command } from "commander";

import { commitAllPrompts } from "./prompts/index.js";

const program = new Command();

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

program.parse(process.argv);
