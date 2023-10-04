import {
    ChatCompletionRequestMessageRoleEnum,
    ChatCompletionResponseMessage,
    Configuration,
    OpenAIApi,
} from "openai";

import fs from "fs";
import path from "path";
import { CodeBuddyConfig, CommitMessageError, ConfigLoadError, ScopeMode } from "../types/index.js";

const DEFAULT_MAX_TOKENS = 200;
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_TOP_P = 1;
const DEFAULT_FREQUENCY_PENALTY = 0.5;
const DEFAULT_PRESENCE_PENALTY = 0.5;

export async function loadConfig(): Promise<CodeBuddyConfig> {
    try {
        const config = await import(path.resolve(process.cwd(), "cb.config.js"));
        return config.default;
    } catch (error) {
        throw new ConfigLoadError("Error loading configuration file: " + error.message);
    }
}

export async function loadChangelog(): Promise<string> {
    try {
        const changelogPath = path.resolve(process.cwd(), "CHANGELOG.md");
        const changelog = await fs.promises.readFile(changelogPath, "utf8");
        return changelog;
    } catch (error) {
        throw new ConfigLoadError("Error loading changelog file: " + error.message);
    }
}

export async function loadPackageJson(): Promise<any> {
    try {
        const packageJsonPath = path.resolve(process.cwd(), "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        return packageJson;
    } catch (error) {
        throw new ConfigLoadError("Error loading package.json file: " + error.message);
    }
}

export async function writeChangelog(changelog: string): Promise<void> {
    try {
        const changelogPath = path.resolve(process.cwd(), "CHANGELOG.md");
        await fs.promises.writeFile(changelogPath, changelog, "utf8");
    } catch (error) {
        throw new ConfigLoadError("Error writing to changelog file: " + error.message);
    }
}

export async function writePackageJson(packageJson: any): Promise<void> {
    try {
        const packageJsonPath = path.resolve(process.cwd(), "package.json");
        await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");
    } catch (error) {
        throw new ConfigLoadError("Error writing to package.json file: " + error.message);
    }
}

async function getOpenAI(): Promise<[OpenAIApi, CodeBuddyConfig]> {
    const config = await loadConfig();
    return [
        new OpenAIApi(
            new Configuration({
                apiKey: config.chatGPT.apiKey,
                organization: config.chatGPT.organization,
            })
        ),
        config,
    ];
}

const extractFunctionArgs = (response: ChatCompletionResponseMessage) => {
    const args = JSON.parse(response.function_call.arguments);
    return args;
};

/**
 * This function generates a commit message for a given diff, scope and type.
 *
 * @param diff The diff to generate a commit message for
 * @param scope The scope of the commit
 * @param type The type of the commit
 *
 * @returns The generated commit message
 *
 * @remarks
 * This function uses the OpenAI API to generate a commit message for a given diff, scope and type.
 * The type is optional, but if provided, will help GPT generate a more accurate commit message by grounding the commit message
 * in the type. If none is provided, GPT will generate a commit message and try to determine the type of the commit message.
 */
export async function determineCommitMessage(
    diff: string,
    scope: string,
    type?: string,
    reason?: string
) {
    const [openai, config] = await getOpenAI();
    const prompt = getCommitMessagePrompt(diff, scope, type, reason);

    try {
        const response = await openai.createChatCompletion({
            messages: [
                {
                    content: prompt,
                    role: ChatCompletionRequestMessageRoleEnum.User,
                },
            ],
            functions: [
                {
                    name: "structure-commit-message",
                    description:
                        "A function to structure a commit message based on changes and user context.",
                    parameters: {
                        type: "object",
                        properties: {
                            summary: {
                                type: "string",
                                description:
                                    "A concise summary of the changes to be committed, no longer than 100 words",
                            },
                            description: {
                                type: "string",
                                description:
                                    "A more detailed description of the changes to be committed as dot points, no longer than 200 words",
                            },
                            type: {
                                type: "string",
                                enum: [
                                    "feat",
                                    "fix",
                                    "docs",
                                    "style",
                                    "refactor",
                                    "test",
                                    "chore",
                                    "perf",
                                    "ci",
                                    "build",
                                    "revert",
                                ],
                            },
                        },
                        required: ["summary", "description"],
                    },
                },
            ],
            function_call: {
                name: "structure-commit-message",
            },
            model: config.chatGPT.model,
            max_tokens: config.chatGPT.maxTokens || DEFAULT_MAX_TOKENS,
            temperature: config.chatGPT.temperature || DEFAULT_TEMPERATURE,
            top_p: config.chatGPT.topP || DEFAULT_TOP_P,
            frequency_penalty: config.chatGPT.frequencyPenalty || DEFAULT_FREQUENCY_PENALTY,
            presence_penalty: config.chatGPT.presencePenalty || DEFAULT_PRESENCE_PENALTY,
        });

        if (!response.data.choices || response.data.choices.length === 0) {
            throw new CommitMessageError("GPT returned an empty response.");
        }

        const args = extractFunctionArgs(response.data.choices[0].message);

        return createMessage({
            scope,
            ...args,
        });
    } catch (error) {
        if (error instanceof CommitMessageError) {
            console.error("Commit message error:", error.message);
        } else {
            console.error("Error generating commit message:", error.message);
        }
        // Now, throw the error up the call stack so that it can be handled appropriately by the calling code
        throw error;
    }
}

const createMessage = ({
    scope,
    summary,
    description,
    type,
}: {
    scope: string;
    summary: string;
    description: string;
    type: string;
}) => {
    if (scope === ".") return `${type}: ${summary} \n\n${description}`;
    return `${type}(${scope}): ${summary} \n\n${description}`;
};

const commitTypeDescriptions = {
    docs: "You're updating documentation or code comments.",
    refactor: "You're making a code change that neither fixes a bug nor adds a feature.",
    fix: "You're fixing a bug.",
    feat: "You're adding a new feature.",
    style: "You're making changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).",
    test: "You're adding missing tests or correcting existing tests.",
    chore: "You're making changes to the build process or auxiliary tools and libraries such as documentation generation.",
    perf: "You're making a code change that improves performance.",
    ci: "You're making changes to your CI configuration files and scripts.",
    build: "You're making changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm).",
    revert: "You're reverting a previous commit.",
};

const getCommitMessagePrompt = (diff: string, scope: string, type?: string, reason?: string) => {
    let commitTypes = `Commit Types:
- docs: When the changes affect files of type \`.md\` or pure code comments
- refactor: A code change that neither fixes a bug nor adds a feature
- fix: A bug fix
- feat: A new feature
- style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- test: Adding missing tests or correcting existing tests
- chore: Changes to the build process or auxiliary tools and libraries such as documentation generation
- perf: A code change that improves performance
- ci: Changes to your CI configuration files and scripts
- build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- revert: Reverts a previous commit
`;

    let typeSpecificGuidelines = "";

    if (type) {
        commitTypes = "";
        typeSpecificGuidelines = `The commit is of type "${type}", so the summary should clearly indicate what changes were made under this type. ${commitTypeDescriptions[type]}. The description should provide a brief explanation of the changes, highlighting the main points and reasoning behind the changes made.`;
    }

    let reasonDescription = "";
    if (reason) {
        reasonDescription = `The changes were made because ${reason}. `;
    }

    return `Here are my changes:
\`${diff}\`

${type ? ` - The type of commit is "${type}". ` : " - I need to determine the type of commit. "}
${
    scope !== "."
        ? ` - The scope of the changes is "${scope}". `
        : " - This commit affects more than one scope. "
}

${reasonDescription}
${typeSpecificGuidelines}
${commitTypes}`;
};

const systemPromptMonorepo =
    'Generate a changelog from the provided commit messages, organizing them under the scope with suggested version increments (+x.y.z). Include explanations for the suggested increments and organize the commits into "Major", "Minor", and "Revisions" categories. Omit any \'chore\' commits. If a commit contains \'BREAKING\' (placed after the commit message and before the issue key), suggest a major version increment. Include emojis if present in the commit messages.\n\n' +
    "Given the following sample commit messages:\n\n" +
    [
        "feat(ui): 🎉 added usePrevious hook to the exports in inspace-ui [IN-889]\n\n- A new hook 'usePrevious' has been added to the exports in the hooks index file of inspace-ui package.",
        "refactor(search): 🧹 changed 'sector' to 'sectors' in filter constants [IN-889]\n\n- Modified the type of sectors from 'sector' to 'sectors' in the defaultFilterSchema and defaultFilterSchemaWorkspaces objects within the inspace-search package.",
        "refactor(api): 🧹 updated API endpoints BREAKING [IN-900]\n\n- The API endpoints were updated to improve performance and security. This change is not backward compatible.",
    ].join("\n\n") +
    "The expected output would be:\n\n" +
    `# Changelog

## ui +0.1.0

The version increment is suggested due to the addition of new features that do not break backward compatibility and enhance the functionality of the \`ui\` scope.

### Minor
- 🎉 Added \`usePrevious\` hook to the exports in inspace-ui ([IN-889](link-to-issue-IN-889))
  - A new hook 'usePrevious' has been added to the exports in the hooks index file of inspace-ui package.

## search +0.0.1

The version increment is suggested because the refactor enhances code quality and readability without adding new features or fixing bugs.

### Revisions
- 🧹 Changed 'sector' to 'sectors' in filter constants ([IN-889](link-to-issue-IN-889))
  - Modified the type of sectors from 'sector' to 'sectors' in the defaultFilterSchema and defaultFilterSchemaWorkspaces objects within the inspace-search package.

## api +1.0.0

The introduction of breaking changes to the API warrants a major version increment to signify the non-backward-compatible modifications.

### Major
- 🧹 Updated API endpoints (BREAKING CHANGE) ([IN-900](link-to-issue-IN-900))
  - The API endpoints were updated to improve performance and security. This change is not backward compatible.`;

const getSystemPromptSingleRepo = (appName: string) =>
    `For the app called ${appName}, generate a changelog from the provided commit messages, organizing them under the scope (if available) with suggested version increments (+x.y.z). Include explanations for the suggested increments and organize the commits into "Major", "Minor", and "Revisions" categories. Omit any \'chore\' commits. If a commit contains \'BREAKING\' (placed after the commit message and before the issue key), suggest a major version increment. Include emojis if present in the commit messages. \n\n` +
    "Given the following sample commit messages:\n\n" +
    [
        "feat: added changelog command and updated commit-all command in src/index.ts  [no-key]\n\n- Imported generateChangelog from ./prompts/index.js\n- Initialized commit-all command with version 0.2.0\n- Added options for reason and destination branch\n- Initialized changelog command with description and option for destination branch",
        "feat(utils): added getCommitLogs and getChangelog functions in utils  [no-key]\n\n- Added a new function 'getCommitLogs' in git.ts under utils.\n- Added another function 'getChangelog' in openai.ts under utils.",
        "feat(types): add changelog destination to CodeBuddyConfig type  [no-key]\n\n- Added a new `changelog` field to the `CodeBuddyConfig` type in `src/types/index.ts`.",
        "feat(prompts): added generateChangelog function and updated imports in prompts/index.ts  [no-key]\n\n- Added a new function generateChangelog to prompts/index.ts\n- Updated the import statement to include getCommitLogs from utils/git.js",
    ].join("\n\n") +
    "The expected output would be:\n\n" +
    `# Changelog

## +0.1.0

The version increment is suggested due to the addition of new features that do not break backward compatibility and enhance the functionality of the project.

### Minor
- 🎉 Added changelog command and updated commit-all command in src/index.ts ([no-key](#))
- Imported generateChangelog from ./prompts/index.js
- Initialized commit-all command with version 0.2.0
- Added options for reason and destination branch
- Initialized changelog command with description and option for destination branch

- 🎉 (utils) Added getCommitLogs and getChangelog functions in utils ([no-key](#))
- Added a new function 'getCommitLogs' in git.ts under utils.
- Added another function 'getChangelog' in openai.ts under utils.

- 🎉 (types) Add changelog destination to CodeBuddyConfig type ([no-key](#))
- Added a new \`changelog\` field to the \`CodeBuddyConfig\` type in \`src/types/index.ts\`.

- 🎉 (prompts) Added generateChangelog function and updated imports in prompts/index.ts ([no-key](#))
- Added a new function generateChangelog to prompts/index.ts
- Updated the import statement to include getCommitLogs from utils/git.js`;

export const getChangelog = async (commits: string) => {
    const [openai, config] = await getOpenAI();

    const userMessage = commits;

    // call openAi api
    const response = await openai.createChatCompletion({
        messages: [
            {
                content:
                    config.commit?.scope.mode === ScopeMode.Monorepo
                        ? systemPromptMonorepo
                        : getSystemPromptSingleRepo(config.changelog?.appName || "CodeBuddy"),
                role: ChatCompletionRequestMessageRoleEnum.System,
            },
            {
                content: userMessage,
                role: ChatCompletionRequestMessageRoleEnum.User,
            },
        ],
        model: config.chatGPT.model,
        max_tokens: config.chatGPT.maxTokens || DEFAULT_MAX_TOKENS,
        temperature: config.chatGPT.temperature || DEFAULT_TEMPERATURE,
        top_p: config.chatGPT.topP || DEFAULT_TOP_P,
        frequency_penalty: config.chatGPT.frequencyPenalty || DEFAULT_FREQUENCY_PENALTY,
        presence_penalty: config.chatGPT.presencePenalty || DEFAULT_PRESENCE_PENALTY,
    });

    if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error("GPT returned an empty response.");
    }

    return response.data.choices[0].message;
};
