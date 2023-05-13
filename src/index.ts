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
    .action(commitAllPrompts);

program.parse(process.argv);
