import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from "openai";

import * as dotenv from "dotenv";
import path from "path";

type Config = {
    apiKey: string;
    organization: string;
    model: string;
};

dotenv.config();

async function loadConfig() {
    try {
        const config = await import(path.resolve(process.cwd(), "gptc.config.js"));
        return config.default;
    } catch (error) {
        console.error("Error loading configuration file:", error.message);
        process.exit(1);
    }
}

async function getOpenAI(): Promise<[OpenAIApi, Config]> {
    const config = await loadConfig();
    return [
        new OpenAIApi(
            new Configuration({
                apiKey: config.apiKey,
                organization: config.organization,
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

    const prompt = `Create a summary of the following description in 100 words or less. It cannot start with a capital letter and should not end in a fullstop. Any additional details that seem useful, add to the text after a new line separator. Just reply with the summarised description only: "${description}";`;
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
            model: config.model,
            max_tokens: 100,
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

// A function that takes in the git diff as input and returns a list of files that have been changed and the changes, and asks GPT to come up with a commit message based on the changes.
export async function determineCommitMessage(diff: string, scope: string) {
    const [openai, config] = await getOpenAI();
    const prompt = getCommitMessagePrompt(diff, scope);

    try {
        const response = await openai.createChatCompletion({
            messages: [
                {
                    content: prompt,
                    role: ChatCompletionRequestMessageRoleEnum.User,
                },
            ],
            model: config.model,
            max_tokens: 100,
            temperature: 0.3,
            top_p: 1,
            frequency_penalty: 0.5,
            presence_penalty: 0.5,
        });
        if (response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        }
    } catch (error) {
        console.error("Error generating commit message:", error.response.data);
    }

    return ""; // Return an empty string if GPT is unable to generate a commit message
}

const getCommitMessagePrompt = (
    diff: string,
    scope: string
) => `You are a developer who needs to write a commit message for the following changes that provide enough a glance context to developers but strive yourself on being comprehensive so try your best to add as much detail as possible.

Below is a diff of your changes:
\`${diff}\`

A commit message follows the below structure:
\`{commit_summary}

{commit_description}\`

The rules for the commit message are as follows:
- A commit summary should be less than 100 characters long. 
- A commit description should be less than 100 characters long.
- The commit summary needs to start with the appropriate type of commit (feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert) ${
    scope !== "." ? `with the following scope (${scope}) ` : "with no scope "
}followed by a colon (:). The scope is optional.
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- refactor: A code change that neither fixes a bug nor adds a feature
- test: Adding missing tests or correcting existing tests
- chore: Changes to the build process or auxiliary tools and libraries such as documentation generation
- perf: A code change that improves performance
- ci: Changes to your CI configuration files and scripts
- build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- revert: Reverts a previous commit
`;
