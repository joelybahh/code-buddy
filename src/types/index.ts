/**
 * The configuration for CodeBuddy.
 */
export type CodeBuddyConfig = {
    chatGPT?: {
        apiKey: string;
        organization: string;
        model: "gpt-4" | "gpt-3.5-turbo";
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
