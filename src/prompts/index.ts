import inquirer, { QuestionCollection } from "inquirer";
import chalk from "chalk";

import { getDiffForFiles, commitAll } from "../utils/git.js";
import { loadConfig } from "../utils/openai.js";
import {
    applyConfigTransform,
    applyConfigTransformAsync,
    applyEmoji,
    applyIssueKey,
    applyScopeTrim,
    applySentenceCase,
    isTruthy,
} from "../utils/config.js";

async function scopeConfirmationPrompt(scope: string) {
    const confirmScope = [
        {
            type: "confirm",
            name: "confirmScope",
            message: `Would you like to commit all changes in ${scope}?`,
            default: true,
        },
    ];

    const confirmScopeAnswers = await inquirer.prompt(confirmScope);
    return confirmScopeAnswers.confirmScope;
}

async function commitConfirmationPrompt(message: string): Promise<[string, boolean]> {
    const config = await loadConfig();

    // Extract config values
    const issue = config?.commit?.issue;
    const sentenceCase = config?.commit?.format?.sentenceCase;
    const scopeTrim = config?.commit?.scopeTrim;
    const emoji = config?.commit?.format?.useEmoji;

    // Apply config transforms
    // prettier-ignore
    message = await applyConfigTransformAsync(message, isTruthy(issue), applyIssueKey, config.commit);
    message = applyConfigTransform(message, isTruthy(sentenceCase), applySentenceCase);
    message = applyConfigTransform(message, isTruthy(scopeTrim), applyScopeTrim, scopeTrim);
    message = applyConfigTransform(message, isTruthy(emoji), applyEmoji, emoji);

    console.log(chalk.green("✅ Successfully Generated \n\n") + chalk.bold.yellow(message) + "\n");

    // Ask user if they want to use the generated commit message
    const confirmCommitMessage = [
        {
            type: "confirm",
            name: "confirmCommitMessage",
            message: "Would you like to use it?",
            default: true,
        },
    ];
    const confirmCommitMessageAnswers = await inquirer.prompt(confirmCommitMessage);

    return [message, confirmCommitMessageAnswers.confirmCommitMessage];
}

async function diffSizePrompt(diff: string, files: string[]) {
    const config = await loadConfig();

    if (config.diff.exclude) {
        files = files.filter((file) => !config.diff.exclude.includes(file));
        diff = await getDiffForFiles(files);
    }

    if (diff.length < config.diff.maxSize) return diff;

    const selectQuestions = [
        {
            type: "checkbox",
            name: "files",
            message: chalk.red(
                `❌ The diff is too large to generate a commit message (length ${diff.length}). Please select the files you want to use in the commit message.`
            ),
            choices: files,
        },
    ] as QuestionCollection;

    const filesSelected = await inquirer.prompt(selectQuestions);
    return await getDiffForFiles(filesSelected.files);
}

export async function commitAllPrompts(...args: any[]) {
    const [optionalArgs] = args;

    await commitAll(
        scopeConfirmationPrompt,
        commitConfirmationPrompt,
        diffSizePrompt,
        optionalArgs
    );
}
