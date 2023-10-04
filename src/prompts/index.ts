import chalk from "chalk";
import inquirer, { QuestionCollection } from "inquirer";

import {
    applyConfigTransform,
    applyConfigTransformAsync,
    applyEmoji,
    applyIssueKey,
    applyScopeTrim,
    applySentenceCase,
    isTruthy,
} from "../utils/config.js";
import { commitAll, getCommitLogs, getDiffForFiles } from "../utils/git.js";
import {
    getChangelog,
    loadChangelog,
    loadConfig,
    loadPackageJson,
    writeChangelog,
    writePackageJson,
} from "../utils/openai.js";

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
    message = await applyConfigTransformAsync(message, isTruthy(issue), applyIssueKey, config.commit?.issue);
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

export async function generateChangelog(...args: any[]) {
    const [optionalArgs] = args;

    const config = await loadConfig();
    const commits = await getCommitLogs(
        optionalArgs.destination || config.changelog?.destination || "main"
    );

    const message = (await getChangelog(commits)).content;
    const increment = getIncrementFromMessage(message);

    const packageJson = await loadPackageJson();
    const currentVersion = packageJson.version;

    console.log(chalk.yellow(`📦 Current Version: ${currentVersion}`));
    console.log(chalk.yellow(`📦 Increment: ${increment}`));

    const newVersion = incrementVersion(currentVersion, increment);

    console.log(chalk.yellow(`📦 New Version: ${newVersion}`));

    packageJson.version = newVersion;
    let changeLog = await loadChangelog();

    changeLog = injectChangelog(changeLog, message, newVersion);

    await writeChangelog(changeLog);
    await writePackageJson(packageJson);

    console.log(chalk.green("✅ Successfully Generated Changelog"));
}

const injectChangelog = (changelog: string, message: string, newVersion: string) => {
    // replace the ## + (major.minor.patch) with the new version
    message = message.replace(/##\s+\+(\d+.\d+.\d+)/, `## ${newVersion}`);

    // 4th line down is where we need to inject the changelog, with a \n before and after the message
    const lines = changelog.split("\n");
    lines.splice(4, 0, `${message}\n`);
    return lines.join("\n");
};

const incrementVersion = (version: string, increment: string) => {
    const [major, minor, patch] = version.split(".").map((v) => parseInt(v));
    const [incMajor, incMinor, incPatch] = increment.split(".").map((v) => parseInt(v));

    if (incMajor) return `${major + 1}.${minor}.${patch}`;
    if (incMinor) return `${major}.${minor + 1}.${patch}`;
    if (incPatch) return `${major}.${minor}.${patch + 1}`;

    return version;
};

const getIncrementFromMessage = (message: string) => {
    // ## + (major.minor.patch)
    const regex = /##\s+\+(\d+.\d+.\d+)/;
    const match = message.match(regex);
    if (!match) return null;
    return match[1];
};
