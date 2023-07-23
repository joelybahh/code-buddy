import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from "openai";

import path from "path";
import { CodeBuddyConfig } from "../types/index.js";

export async function loadConfig(): Promise<CodeBuddyConfig> {
    try {
        const config = await import(path.resolve(process.cwd(), "cb.config.js"));
        return config.default;
    } catch (error) {
        console.error("Error loading configuration file:", error.message);
        process.exit(1);
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

export async function summariseDescription(description: string) {
    const [openai, config] = await getOpenAI();

    if (description.length < 1000)
        return description
            .trim()
            .replace(/\.$/, "")
            .replace(/^\w/, (c) => c.toLowerCase());

    const prompt = `${description}`;
    try {
        const response = await openai.createChatCompletion({
            messages: [
                {
                    content:
                        "You are a developer working on a project. You are about to commit some changes to the codebase. You want to write a commit message that describes the changes you are making.",
                    role: ChatCompletionRequestMessageRoleEnum.System,
                },
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
                        summary: {
                            type: "string",
                            description: "A 100 word summary of the changes to be committed.",
                        },
                        description: {
                            type: "string",
                            description:
                                "A more detailed description of the changes to be committed.",
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
                },
            ],
            function_call: {
                name: "structure-commit-message",
            },
            model: config.chatGPT.model,
            max_tokens: 200,
            temperature: 0.3,
            top_p: 1,
            frequency_penalty: 0.5,
            presence_penalty: 0.5,
            stop: ["\n", "Example:"],
        });
        if (response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        }
    } catch (error) {
        console.error("Error generating summary:", error.response.data);
    }

    return ""; // Return an empty string if GPT is unable to generate a summary
}

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
            max_tokens: 900,
            temperature: 0.3,
            top_p: 1,
            frequency_penalty: 0.5,
            presence_penalty: 0.5,
        });
        console.log(response.data.choices[0]);
        if (response.data.choices && response.data.choices.length > 0) {
            const args = JSON.parse(response.data.choices[0].message.function_call.arguments);

            return createMessage({
                scope,
                ...args,
            });
        }
    } catch (error) {
        console.error("Error generating commit message:", error.response.data);
    }

    return ""; // Return an empty string if GPT is unable to generate a commit message
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
