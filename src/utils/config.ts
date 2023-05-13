import inquirer, { QuestionCollection } from "inquirer";
import { CodeBuddyConfig } from "../types/index.js";
import { getIssueKeyFromBranchName } from "./git.js";

/**
 * Applies the issue key to the commit message.
 * @param message The commit message
 * @param issueConfig The issue config from the CodeBuddy config
 */
export async function applyIssueKey(
    message: string,
    issueConfig: CodeBuddyConfig["commit"]["issue"]
) {
    const { detectKey, fallbackKey, keyRegex } = issueConfig;
    let issueKey = "";
    if (detectKey) {
        // TODO: Detect the issue key from the branch name
        const key = await getIssueKeyFromBranchName(keyRegex);
        // assign issueKey to config.fallbackIssueKey if issueKey is falsy
        issueKey = key || fallbackKey;
    } else {
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
        issueKey = issueKeyAnswers.issueKey;
    }

    const firstLineBreak = message.indexOf("\n");
    if (firstLineBreak === -1) {
        message += ` [${issueKey || fallbackKey}]`;
    } else {
        message =
            message.slice(0, firstLineBreak) +
            ` [${issueKey || fallbackKey}]` +
            message.slice(firstLineBreak);
    }
}

/**
 * Applies sentence case to a commit message
 * @param message The message to apply sentence case to
 */
export function applySentenceCase(message: string) {
    const firstColon = message.indexOf(":");
    const firstLetterAfterColon = message[firstColon + 2];
    if (firstLetterAfterColon === firstLetterAfterColon.toUpperCase()) {
        message =
            message.slice(0, firstColon + 2) +
            message[firstColon + 2].toLowerCase() +
            message.slice(firstColon + 3);
    }
}