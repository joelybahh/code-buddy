import inquirer, { QuestionCollection } from "inquirer";
import { CodeBuddyConfig, COMMIT_TYPE_EMOJIS, CommitType } from "../types/index.js";
import { getIssueKeyFromBranchName } from "./git.js";

/**
 *
 * @param message
 * @param configProp
 * @param transformFunc
 * @param additionalArg
 * @returns
 */
export function applyConfigTransform(
    message: string,
    configProp: boolean | string,
    transformFunc: (message: string, prop?: any) => string,
    additionalArg?: any
): string {
    return configProp ? transformFunc(message, additionalArg) : message;
}
/**
 *
 * @param message
 * @param configProp
 * @param transformFunc
 * @param additionalArg
 * @returns
 */
export async function applyConfigTransformAsync(
    message: string,
    configProp: boolean | string,
    transformFunc: (message: string, prop?: any) => Promise<string>,
    additionalArg?: any
): Promise<string> {
    return configProp ? await transformFunc(message, additionalArg) : message;
}

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
        const key = await getIssueKeyFromBranchName(keyRegex);
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

        const issueKeyAnswers = await inquirer.prompt(confirmHasIssue);
        issueKey = issueKeyAnswers.issueKey || fallbackKey;
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

    return message;
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

    return message;
}

/**
 * Applies an emoji to a commit message based on the commit type extracted from the message
 * @param message The commit message
 * @returns The commit message with the emoji applied
 */
export function applyEmoji(message: string) {
    const firstColon = message.indexOf(":");

    const typeAndScope = message.slice(0, firstColon);
    const [type] = typeAndScope.split("(");

    const emoji = COMMIT_TYPE_EMOJIS[type as CommitType];

    message = message.slice(0, firstColon + 1) + " " + emoji + message.slice(firstColon + 1);

    return message;
}

/**
 * Performs a trim on the message scope, based on the trim
 *
 * @param message The commit message
 * @param trim The string to trim from the scope
 *
 * @example
 * ```ts
 * // returns "feat(scope): my message"
 * applyScopeTrim("feat(inspace-scope): my message", "inspace-")
 * ```
 * @returns The commit message with the scope trimmed
 */
export function applyScopeTrim(message: string, trim: string): string {
    // Define a regex pattern to match the scope part of the message
    const scopePattern = /^(\w+\((.*?)\))/;

    // Replace the trim string in the matched scope
    const updatedMessage = message.replace(scopePattern, function (fullMatch) {
        return fullMatch.replace(trim, "");
    });

    return updatedMessage;
}

/**
 * A wrapper method that checls if a value is truthy
 *
 * @param value The value to check
 * @returns A boolean indicating if the value is truthy
 *
 * @remarks This method is purely for readability
 */
export function isTruthy(value: any): boolean {
    return !!value;
}
