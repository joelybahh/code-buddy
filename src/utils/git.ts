import { simpleGit, StatusResult, CommitResult, FileStatusResult } from "simple-git";
import { determineCommitMessage } from "./openai.js";

const git = simpleGit();

/**
 * Get staged files.
 * @param {string} scope - The scope to group files by.
 * @returns {Promise<string[]>} A promise that resolves to an array of staged files.
 */
export async function getStagedFiles(scope?: string): Promise<string[]> {
    let status: StatusResult;

    try {
        status = await git.status();
    } catch (error) {
        console.error("Error getting git status:", error);
        return [];
    }

    const files = status.files.map((file: FileStatusResult) => file.path);

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
 * Stage scoped changes.
 * @param {string} scope - The scope of changes to stage.
 * @returns {Promise<string | undefined>} A promise that resolves to the result of git.add or undefined.
 */
export async function stageScopedChanges(scope: string): Promise<string | undefined> {
    let files: string[];

    try {
        files = await getStagedFiles(scope);
    } catch (error) {
        console.error("Error getting staged files:", error);
        return undefined;
    }

    const groups = groupFilesByScope(files);
    const filesToStage = groups[scope] || [];

    try {
        return git.add(filesToStage);
    } catch (error) {
        console.error("Error staging files:", error);
        return undefined;
    }
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
import { ScopeMode } from "../types/index.js";

/**
 * Group files by scope for a monorepo structure.
 * @param {string} file - The file to get the scope from.
 * @returns {string | undefined} The scope of the file.
 */
function getScopeMonorepo(file: string): string | undefined {
    const scopeMatch = file.match(/^(?:apps\/([^\/]+)|packages\/([^\/]+)|functions\/([^\/]+))/);
    if (scopeMatch) {
        return scopeMatch[1] || scopeMatch[2] || scopeMatch[3];
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
    confirmCommit: (message: string) => Promise<boolean>
): Promise<void> {
    let confirmed = false;
    let commitMessage = "";

    while (!confirmed) {
        commitMessage = await determineCommitMessage(diff, scope);
        if (!commitMessage) {
            console.error("Unable to generate commit message.");
            return;
        }
        confirmed = await confirmCommit(commitMessage);
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
    confirmCommit: (message: string) => Promise<boolean>,
    reduceDiff: (diff: string, files: string[]) => Promise<string>
): Promise<void> {
    const files = await getStagedFiles();
    const groups = await groupFilesByScope(files);

    for (const scope in groups) {
        const confirmedScope = await confirmScope(scope);
        if (confirmedScope) {
            await git.add(groups[scope]);
            let diff = await getDiffForFiles(groups[scope]);
            diff = await reduceDiff(diff, groups[scope]);
            await commit(diff, scope, confirmCommit);
        }
    }
}
