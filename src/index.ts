#! /usr/bin/env node

import { simpleGit } from "simple-git";
import chalk from "chalk";

import { commitMessagePrompt } from "./prompts/index.js";
import { commitChanges, getStagedFiles, groupFilesByScope } from "./utils/git.js";

export type CodeBuddyConfig = {
    apiKey: string;
    organization: string;
    model: "gpt-4" | "gpt-3.5-turbo";
    scopeTrim: string;
    diffSizeLimit?: number;
};

async function commitAll() {
    const git = simpleGit();
    const stagedFiles = await getStagedFiles();

    const filesGroupedByScope = groupFilesByScope(stagedFiles);

    for (const scope in filesGroupedByScope) {
        const message = await commitMessagePrompt(scope || ".");
        await commitChanges(message);
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
            commitAll();
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
