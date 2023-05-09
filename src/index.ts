#! /usr/bin/env node

import { simpleGit } from "simple-git";
import chalk from "chalk";

import { commitMessagePrompt, commitPrompts } from "./prompts/index.js";
import { commitChanges, getStagedFiles, groupFilesByScope } from "./utils/git.js";

async function commitAll(scopeArg?: string) {
    const git = simpleGit();
    const stagedFiles = await getStagedFiles();

    const filesGroupedByScope = groupFilesByScope(stagedFiles);

    if (scopeArg) {
        const files = filesGroupedByScope[scopeArg];
        await git.add(files);
        const commitMessage = await commitPrompts(scopeArg, files);
        await git.commit(commitMessage);

        console.log(
            chalk.green("✨ Committed changes to ") +
                chalk.bold.blue(scopeArg) +
                chalk.green(" with the following message: \n") +
                chalk.bold.yellow(commitMessage)
        );
    } else {
        for (const scope in filesGroupedByScope) {
            const files = filesGroupedByScope[scope];
            await git.add(files);
            const commitMessage = await commitPrompts(scope, files);
            await git.commit(commitMessage);

            console.log(
                chalk.green("✨ Committed changes to ") +
                    chalk.bold.blue(scope) +
                    chalk.green(" with the following message: \n") +
                    chalk.bold.yellow(commitMessage)
            );
        }
    }
}

const COMMAND_ARG_INDEX = 2;
const OPTIONAL_ARG_START_INDEX = 3;

function parseArgs(args: string[]): Record<string, string | boolean> {
    const parsedArgs: Record<string, string | boolean> = {};

    for (const arg of args) {
        const match = arg.match(/^--([^=]+)(?:=(.+))?$/);
        if (match) {
            const key = match[1];
            const value = match[2] === undefined ? true : match[2];
            parsedArgs[key] = value;
        }
    }

    return parsedArgs;
}

async function main() {
    switch (process.argv[COMMAND_ARG_INDEX]) {
        case "commit-all": {
            const parsedArgs = parseArgs(process.argv.slice(OPTIONAL_ARG_START_INDEX));
            const scope = parsedArgs.scope as string | undefined;

            commitAll(scope);
            break;
        }
        case "commit":
            {
                const parsedArgs = parseArgs(process.argv.slice(OPTIONAL_ARG_START_INDEX));
                const scope = parsedArgs.scope as string | undefined;

                const message = await commitMessagePrompt(scope || ".");

                commitChanges(message);
            }
            break;
        default:
            console.log("Invalid command");
    }
}

main();
