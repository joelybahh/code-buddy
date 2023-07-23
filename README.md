# CodeBuddy

CodeBuddy is an AI-powered developer assistant for code reviews, automating commits, and more. This CLI tool is designed to streamline your development process and make your life easier.

[![npm version](https://badge.fury.io/js/%40joelybahh%2Fcode-buddy.svg)](https://www.npmjs.com/package/@joelybahh/code-buddy)
[![Build Status](https://travis-ci.com/joelybahh/code-buddy.svg?branch=main)](https://travis-ci.com/joelybahh/code-buddy)
[![Coverage Status](https://coveralls.io/repos/github/joelybahh/code-buddy/badge.svg?branch=main)](https://coveralls.io/github/joelybahh/code-buddy?branch=main)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Features

-   Automatically generate commit messages based on the diff
-   AI-powered assistance for code reviews [Coming Soon]

## Installation

CodeBuddy can be installed globally using npm, Or you can view it on the npm registry [here](https://www.npmjs.com/package/@joelybahh/code-buddy).

```
npm install -g @joelybahh/code-buddy
```

Or using yarn:

```
yarn global add @joelybahh/code-buddy
```

## Configuration

CodeBuddy can be configured using a `cb.config.js` file in the root of your project. The following properties are available:

```
{
    chatGPT: {
        apiKey: string;
        organization: string;
        model: "gpt-4" | "gpt-3.5-turbo";
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        presencePenalty?: number;
        frequencyPenalty?: number;
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
        };
        scope?: {
            mode?: "monorepo" | "traditional";
            srcDir?: string;
        }
    };
    diff?: {
        maxSize?: number;
        exclude?: string[];
    };
}
```

### chatGPT

This object contains properties related to ChatGPT authentication and requests.

-   `apiKey` (string): Your OpenAI API key for authentication.
-   `organization` (string): The organization ID associated with your OpenAI account.
-   `model` (string): The GPT model to use, either `"gpt-4"` or `"gpt-3.5-turbo"`.
-   `maxTokens` (number, optional): The maximum number of tokens to generate. Defaults to `200`.
-   `temperature` (number, optional): The temperature to use for token generation. Defaults to `0.3`.
-   `topP` (number, optional): The topP value to use for token generation. Defaults to `1`.
-   `presencePenalty` (number, optional): The presence penalty to use for token generation. Defaults to `0.5`.
-   `frequencyPenalty` (number, optional): The frequency penalty to use for token generation. Defaults to `0.5`.
-   `stop` (string[], optional): An array of strings to use as stop sequences for token generation.

### commit (optional)

This object contains properties related to commit message generation and formatting.

-   `scopeTrim` (string): A string to automatically trim from the scope of the commit message.
-   `issue` (optional): An object containing properties related to issue key handling in commit messages.
    -   `detectKey` (boolean, optional): If `true`, attempts to detect an issue key from the branch name using the `keyRegex`.
    -   `keyRegex` (RegExp, optional): A regular expression used to detect issue keys in the branch name.
    -   `fallbackKey` (string, optional): A fallback issue key to use if none is detected in the branch name.
-   `format` (optional): An object containing properties related to commit message text formatting.
    -   `sentenceCase` (boolean, optional): If `false`, the first letter of the commit message will be in lowercase.
-   `scope`
    -   `mode` (string, optional): The commit scope mode, either `"monorepo"` or `"traditional"`. If `"monorepo"`, the scope will be the name of the package. If `"traditional"`, the scope will be the name of the directory containing the changed files. Defaults to `"monorepo"`.
    -   `srcDir` (string, optional): The source directory for the commit scope. Only used in `"traditional"` mode. Defaults to `"src"`.

### diff (optional)

This object contains properties related to the diff.

-   `maxSize` (number, optional): The maximum size (in bytes) of the diff that can be sent to the GPT model. If the diff exceeds this size, an error will be thrown.
-   `exclude` (string[], optional): An array of file paths to exclude from the diff.

## Usage

To use CodeBuddy, run the following command:

```
cb commit-all
```

this will do a git add for every detected scope, and generate a commit message, but for every available scope.

### Command-Line Arguments

CodeBuddy also supports the following command-line arguments:

-   `-r, --reason <reason>`: Specifies the reason for the changes, providing additional context for the commit message.
-   `-t, --type <type>`: Specifies the commit type, grounding the AI-generated message in the given type for better commit messages.
-   `-s, --scope <scope>`: Specifies the a specific scope, can help if order matters.

Some arguments coming soon:

-   `-b, --breaking`: Specifies that the changes are breaking changes.
-   `-i, --issue <issue>`: Specifies the issue key for the commit message (Note you can pull this from a commit message with config).

Please note that command-line arguments take precedence over the configuration file settings.

## Contributing

We welcome contributions! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push them to your fork.
4. Create a pull request and describe the changes you made.

We will review your pull request and provide feedback.

## Changelog

Please refer to the [CHANGELOG.md](CHANGELOG.md) file for information about changes in each version.

## License

This project is licensed under the [ISC License](LICENSE).
