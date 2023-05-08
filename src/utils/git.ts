import { simpleGit } from "simple-git";

const git = simpleGit();

export async function getStagedFiles(scope?: string) {
    const status = await git.status();
    const files = status.files.map((file: any) => file.path);

    return scope ? groupFilesByScope(files)[scope] || [] : files;
}

export async function stageScopedChanges(scope: string) {
    const files = await getStagedFiles();
    const groups = groupFilesByScope(files);
    const filesToStage = groups[scope] || [];
    await git.add(filesToStage);
}

export async function getCachedDiff() {
    return await git.diff(["--cached"]);
}

export async function getDiffForFiles(files: string[]) {
    return await git.diff(["--cached", ...files]);
}

export async function commitChanges(message: string) {
    await git.commit(message);
}

export function groupFilesByScope(files: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};

    for (const file of files) {
        const scopeMatch = file.match(/^(?:apps\/([^\/]+)|packages\/([^\/]+))/);
        if (scopeMatch) {
            const scope = scopeMatch[1] || scopeMatch[2];
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
