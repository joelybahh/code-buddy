/**
 * The configuration for CodeBuddy.
 */
export type CodeBuddyConfig = {
    chatGPT?: {
        apiKey: string;
        organization: string;
        model: "gpt-4" | "gpt-3.5-turbo";
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
        stop?: string[];
    };
    commit?: {
        scopeTrim: string;
        issue?: {
            detectKey?: boolean;
            keyRegex?: RegExp;
            fallbackKey?: string;
        };
        format?: {
            sentenceCase?: boolean;
            useEmoji?: boolean;
        };
        scope?: {
            mode: ScopeMode;
            srcDir?: string;
        };
    };
    diff?: {
        maxSize?: number;
        exclude?: string[];
    };
};

/**
 * The scope mode to use when generating commit messages.
 */
export enum ScopeMode {
    Monorepo = "monorepo",
    Traditional = "traditional",
}

/**
 * An enum representing the different types of commits.
 */
export enum CommitType {
    Feature = "feat",
    Fix = "fix",
    Docs = "docs",
    Style = "style",
    Refactor = "refactor",
    Perf = "perf",
    Test = "test",
    Chore = "chore",
    Ci = "ci",
    Build = "build",
    Revert = "revert",
}

/**
 * A string literal type representing the different types of commits.
 */
export type TCommitType =
    | CommitType.Feature
    | CommitType.Fix
    | CommitType.Docs
    | CommitType.Build
    | CommitType.Style
    | CommitType.Refactor
    | CommitType.Perf
    | CommitType.Test
    | CommitType.Chore
    | CommitType.Ci
    | CommitType.Revert;

/**
 * A record mapping commit types to their emoji.
 */
export const COMMIT_TYPE_EMOJIS: Record<CommitType, string> = {
    [CommitType.Feature]: "🎉",
    [CommitType.Fix]: "🐛",
    [CommitType.Docs]: "📚",
    [CommitType.Style]: "💄",
    [CommitType.Refactor]: "🧹",
    [CommitType.Perf]: "🚀",
    [CommitType.Test]: "🧪",
    [CommitType.Chore]: "🧹",
    [CommitType.Ci]: "🤖",
    [CommitType.Build]: "🏗️",
    [CommitType.Revert]: "⏪",
};

/**
 * A type representing the optional arguments for the `commit-all` command.
 */
export type OptionalArgs = {
    breaking?: boolean;
    message?: string;
    scope?: string;
    issue?: string;
    type?: TCommitType;
    reason?: string;
};

export class ConfigLoadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConfigLoadError";
    }
}

export class CommitMessageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CommitMessageError";
    }
}

export type PackageJson = {
    name?: string;
    version?: string;
    description?: string;
    keywords?: string[];
    homepage?: string;
    bugs?: string | { url?: string; email?: string };
    license?: string;
    author?: string | { name: string; email?: string; url?: string };
    contributors?: string[] | { name: string; email?: string; url?: string }[];
    files?: string[];
    main?: string;
    browser?: string;
    bin?: string | { [key: string]: string };
    directories?: {
        lib?: string;
        bin?: string;
    };
    repository?: string | { type: string; url: string };
    scripts?: { [key: string]: string };
    config?: { [key: string]: string };
    dependencies?: { [key: string]: string };
    devDependencies?: { [key: string]: string };
    peerDependencies?: { [key: string]: string };
    private: boolean;
    publishConfig?: { [key: string]: string };
    workspaces?: string[];
};
