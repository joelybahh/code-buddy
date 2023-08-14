import { Command } from "commander";
import { commitAllPrompts, smartVersionPrompts } from "../prompts/index.js";

export const setupCommitAll = (program: Command) => {
    return program
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
};

export const setupSmartVersion = (program: Command) => {
    return program
        .command("version")
        .description(
            "Helps you determine the next version of your project based on the changes you've made since the last release."
        )
        .action(smartVersionPrompts);
};
