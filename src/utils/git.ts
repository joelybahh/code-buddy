import { simpleGit, StatusResult, CommitResult, FileStatusResult } from "simple-git";
import { determineCommitMessage } from "./openai.js";

const git = simpleGit();

enum StagedFileType {
    AllExceptDeleted = "allExceptDeleted",
    Modified = "modified",
    Deleted = "deleted",
    All = "all",
}

/**
 * Get staged files.
 * @param {string} scope - The scope to group files by.
 * @returns {Promise<string[]>} A promise that resolves to an array of staged files.
 */
export async function getStagedFiles(type?: StagedFileType, scope?: string): Promise<string[]> {
    let status: StatusResult;

    try {
        status = await git.status();
    } catch (error) {
        console.error("Error getting git status:", error);
        return [];
    }
    let files: string[] = status.files.map((file: FileStatusResult) => file.path);

    switch (type) {
        default:
        case StagedFileType.All:
            break;
        case StagedFileType.AllExceptDeleted:
            files = files.filter((file) => !status.deleted.includes(file));
            break;
        case StagedFileType.Modified:
            files = status.modified;
            break;
        case StagedFileType.Deleted:
            files = status.deleted;
            break;
    }

    return scope ? groupFilesByScope(files)[scope] || [] : files;
}

/**
 * Get issue key from branch name.
 * @param {RegExp} regexp - The regular expression to match the issue key.
 * @returns {Promise<string | undefined>} A promise that resolves to the issue key or undefined.
 */
export async function getIssueKeyFromBranchName(
    regexp: RegExp = /[A-Za-z]+-\d+/
): Promise<string | undefined> {
    let branchName: string;

    try {
        branchName = (await git.branchLocal()).current;
    } catch (error) {
        console.error("Error getting branch name:", error);
        return undefined;
    }

    const match = branchName.match(regexp);
    return match ? match[0] : undefined;
}

/**
 * Get diff for specific files.
 * @param {string[]} files - The files to get the diff for.
 * @returns {Promise<string>} A promise that resolves to the diff for the specified files.
 */
export async function getDiffForFiles(files: string[]): Promise<string> {
    try {
        return git.diff(["--cached", ...files]);
    } catch (error) {
        console.error("Error getting diff for files:", error);
        return "";
    }
}

/**
 * Commit changes.
 * @param {string} message - The commit message.
 * @returns {Promise<CommitResult | undefined>} A promise that resolves to the result of git.commit or undefined.
 */
export async function commitChanges(message: string): Promise<CommitResult | undefined> {
    try {
        return git.commit(message);
    } catch (error) {
        console.error("Error committing changes:", error);
        return undefined;
    }
}

import { loadConfig } from "../utils/openai.js";
import { OptionalArgs, ScopeMode } from "../types/index.js";
import chalk from "chalk";

/**
 * Group files by scope for a monorepo structure.
 * @param {string} file - The file to get the scope from.
 * @param {string[]} directories - An array of directories for the regex.
 * @returns {string | undefined} The scope of the file.
 */
function getScopeMonorepo(
    file: string,
    directories = ["apps", "packages", "functions"]
): string | undefined {
    const regexStr = directories.map((directory) => `(?:${directory}\/([^\/]+))`).join("|");
    const scopeMatch = file.match(new RegExp(`^${regexStr}`));

    if (scopeMatch) {
        // Matched groups start from index 1. As such, we need to return the first non-undefined group.
        for (let i = 1; i < scopeMatch.length; i++) {
            if (scopeMatch[i]) {
                return scopeMatch[i];
            }
        }
    }
}

/**
 * Group files by scope for a traditional structure.
 * @param {string} file - The file to get the scope from.
 * @param {string} srcDir - The name of the source directory.
 * @returns {string | undefined} The scope of the file.
 */
function getScopeTraditional(file: string, srcDir: string): string | undefined {
    const pathParts = file.split("/");
    const srcIndex = pathParts.indexOf(srcDir);

    if (
        srcIndex !== -1 &&
        pathParts.length > srcIndex + 1 &&
        pathParts[srcIndex + 1] !== "index.ts"
    ) {
        return pathParts[srcIndex + 1]; // Returns the folder name right after `/src`
    } else {
        return ".";
    }
}

/**
 * Group files by scope.
 * @param {string[]} files - The files to group.
 * @returns {Promise<Record<string, string[]>>} An object mapping scopes to arrays of files.
 */
export async function groupFilesByScope(files: string[]): Promise<Record<string, string[]>> {
    const config = await loadConfig();
    const groups: Record<string, string[]> = {};

    for (const file of files) {
        let scope: string | undefined;

        switch (config.commit.scope.mode) {
            default:
            case ScopeMode.Traditional:
                scope = getScopeTraditional(file, config.commit.scope.srcDir);
                break;
            case ScopeMode.Monorepo:
                scope = getScopeMonorepo(file);
                break;
        }

        if (scope) {
            if (!groups[scope]) {
                groups[scope] = [];
            }
            groups[scope].push(file);
        } else {
            if (!groups["."]) {
                groups["."] = [];
            }
            groups["."].push(file);
        }
    }

    return groups;
}

/**
 * Main function to handle commit.
 * @param {string} diff - The changes to commit.
 * @param {string} scope - The scope of changes.
 * @returns {Promise<void>} Nothing.
 */
export async function commit(
    diff: string,
    scope: string,
    confirmCommit: (message: string) => Promise<[string, boolean]>,
    args: OptionalArgs
): Promise<void> {
    let confirmed = false;
    let commitMessage = "";

    const { breaking, issue, message, type, reason } = args;

    while (!confirmed) {
        console.log(chalk.yellow("✨ Generating commit message..."));
        commitMessage = await determineCommitMessage(diff, scope, type, reason);
        if (!commitMessage) {
            console.error("❌ Unable to generate commit message.");
            return;
        }
        const [message, accepted] = await confirmCommit(commitMessage);
        if (accepted) {
            commitMessage = message;
            confirmed = true;
        }
    }

    try {
        await commitChanges(commitMessage);
    } catch (error) {
        console.error("Error committing changes:", error);
    }
}

/**
 * Main function to handle commit-all.
 * @param {string[]} diff - The changes to commit.
 * @param {string} scope - The scope of changes.
 * @returns {Promise<void>} Nothing.
 */
export async function commitAll(
    confirmScope: (scope: string) => Promise<boolean>,
    confirmCommit: (message: string) => Promise<[string, boolean]>,
    reduceDiff: (diff: string, files: string[]) => Promise<string>,
    args: OptionalArgs
): Promise<void> {
    const allExceptDeleted = await getStagedFiles(StagedFileType.AllExceptDeleted);
    const deleted = await getStagedFiles(StagedFileType.Deleted);

    // Store all files for grouping convinience
    const allFiles = [...allExceptDeleted, ...deleted];
    const groups = await groupFilesByScope(allFiles);

    const { breaking, issue, message, scope: scopeOverride, type } = args;

    for (const scope in groups) {
        if (scopeOverride && scope !== scopeOverride) continue;

        const currentFiles = groups[scope];
        const filesToAdd = currentFiles.filter((file) => !deleted.includes(file));
        const filesToRemove = currentFiles.filter((file) => !allExceptDeleted.includes(file));

        const confirmedScope = scopeOverride ? true : await confirmScope(scope);
        if (confirmedScope) {
            if (filesToAdd.length > 0)
                await git.add(currentFiles.filter((file) => !deleted.includes(file)));
            if (filesToRemove.length > 0)
                await git.rm(currentFiles.filter((file) => !allExceptDeleted.includes(file)));

            let diff = await getDiffForFiles(filesToAdd);
            diff = await reduceDiff(diff, groups[scope]);
            await commit(diff, scope, confirmCommit, args);
        }
    }
}
