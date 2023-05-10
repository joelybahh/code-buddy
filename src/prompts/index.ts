import inquirer, { QuestionCollection } from "inquirer";
import chalk from "chalk";

import { stageScopedChanges, getDiffForFiles, getStagedFiles } from "../utils/git.js";
import { logPretty } from "../utils/log.js";
import { determineCommitMessage, loadConfig, summariseDescription } from "../utils/openai.js";

export async function commitPrompts(scope: string, changes: string[]) {
    const suggestedType = "feat"; // Replace with a function to suggest a commit type based on the changes

    if (scope === ".") logPretty(`You are committing changes from the root directory`, "yellow");
    else if (scope === "apps")
        logPretty(`You are committing changes from the apps directory`, "yellow");
    else if (scope === "packages")
        logPretty(`You are committing changes frpm the packages directory`, "yellow");
    else logPretty(`You are committing changes from the ${scope} directory`, "yellow");

    console.log(`The following files are being committed: ${changes.join(", ")}`);
    const questions = [
        {
            type: "list",
            name: "commitType",
            message: `We suggest the commit type '${suggestedType}'. Would you like to use this or choose another?`,
            choices: [
                { name: "Use suggested type", value: suggestedType },
                new inquirer.Separator(),
                "feat",
                "fix",
                "chore",
                "docs",
                "style",
                "refactor",
                "test",
                "other",
            ],
        },
        {
            type: "input",
            name: "description",
            message:
                "Write a description of your changes. Don't worry about the word limit; we'll summarize it for you.",
        },
        {
            type: "input",
            name: "issueKey",
            message:
                "If the commit type is 'feat' or 'fix', please provide the issue key. You can type 'no-key' to override this rule. If the type is different, you can skip this step.",
            when: (answers: any) => ["feat", "fix"].includes(answers.commitType),
        },
    ];

    const answers = await inquirer.prompt(questions);

    const summary = await summariseDescription(answers.description);

    let commitMessage = `${answers.commitType}(${scope === "." ? "" : scope}): ${summary}`;

    if (answers.issueKey && answers.issueKey !== "no-key") {
        commitMessage += ` [${answers.issueKey}]`;
    }

    if (summary !== answers.description)
        commitMessage += `\n\n🤖 This commit was automatically summarized by GPT-3.5 based on a long description.`;

    return commitMessage;
}

export async function commitMessagePrompt(scope: string) {
    await stageScopedChanges(scope);
    const stagedFiles = await getStagedFiles(scope);
    let diff = await getDiffForFiles(stagedFiles);

    // Check the size of the diff, if its too big, ask the user to select the files they want to use in the diff for the commit message
    // If the diff is small enough, generate the commit message

    const config = await loadConfig();

    if (diff.length > (config.diffSizeLimit || 2000)) {
        const stagedFiles = await getStagedFiles(scope);
        const selectQuestions = [
            {
                type: "checkbox",
                name: "files",
                message: chalk.red(
                    `❌ The diff is too large to generate a commit message (length ${diff.length}). Please select the files you want to use in the commit message.`
                ),
                choices: stagedFiles,
            },
        ] as QuestionCollection;

        const filesSelected = await inquirer.prompt(selectQuestions);
        diff = await getDiffForFiles(filesSelected.files);
    }

    let commitMessage = await determineCommitMessage(diff, scope.replace("inspace-", ""));

    if (config.useIssueKey) {
        // Confirm the commit message with the user
        const confirmHasIssue = [
            {
                type: "confirm",
                name: "confirmHasIssue",
                message: `Does this commit have an issue key?`,
                default: true,
            },
            {
                type: "input",
                name: "issueKey",
                message: `Please enter the issue key`,
                when: (answers: any) => answers.confirmHasIssue,
            },
        ] as QuestionCollection;

        // add the issue key to the commit message right before the first line break, if none, add it to the end of the commit message
        const issueKeyAnswers = await inquirer.prompt(confirmHasIssue);
        const issueKey = issueKeyAnswers.issueKey;
        const firstLineBreak = commitMessage.indexOf("\n");
        if (firstLineBreak === -1) {
            commitMessage += ` [${issueKey || "no-key"}]`;
        } else {
            commitMessage =
                commitMessage.slice(0, firstLineBreak) +
                ` [${issueKey || "no-key"}]` +
                commitMessage.slice(firstLineBreak);
        }
    }

    if (!config.sentenceCase) {
        const firstColon = commitMessage.indexOf(":");
        const firstLetterAfterColon = commitMessage[firstColon + 2];
        if (firstLetterAfterColon === firstLetterAfterColon.toUpperCase()) {
            commitMessage =
                commitMessage.slice(0, firstColon + 2) +
                commitMessage[firstColon + 2].toLowerCase() +
                commitMessage.slice(firstColon + 3);
        }
    }

    console.log(
        chalk.green("✨ Generated commit message: \n") + chalk.bold.yellow(commitMessage) + "\n"
    );

    const confirmCommitMessage = [
        {
            type: "confirm",
            name: "confirmCommitMessage",
            message: "Would you like to use it?",
            default: true,
        },
    ];

    const confirmCommitMessageAnswers = await inquirer.prompt(confirmCommitMessage);

    if (confirmCommitMessageAnswers.confirmCommitMessage) {
        return commitMessage;
    } else {
        const customCommitMessage = [
            {
                type: "input",
                name: "commitMessage",
                message: "Please write your commit message.",
            },
        ] as QuestionCollection;

        const customCommitMessageAnswers = await inquirer.prompt(customCommitMessage);
        return customCommitMessageAnswers.commitMessage;
    }
}
