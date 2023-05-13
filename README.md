# CodeBuddy

CodeBuddy is an AI-powered developer assistant for code reviews, automating commits, and more. This CLI tool is designed to streamline your development process and make your life easier.

## Features

-   Automatically generate commit messages based on the diff
-   AI-powered assistance for code reviews

## Installation

You can install CodeBuddy globally using npm:

```
npm install -g .
```

Or using yarn:

```
yarn global add .
```

## Configuration

CodeBuddy can be configured using a `cb.config.js` file in the root of your project. The following properties are available:

```
{
    chatGPT: {
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
    };
    diff?: {
        maxSize?: number;
    };
}
```

### chatGPT

This object contains properties related to ChatGPT authentication and requests.

-   `apiKey` (string): Your OpenAI API key for authentication.
-   `organization` (string): The organization ID associated with your OpenAI account.
-   `model` (string): The GPT model to use, either `"gpt-4"` or `"gpt-3.5-turbo"`.

### commit (optional)

This object contains properties related to commit message generation and formatting.

-   `scopeTrim` (string): A string to automatically trim from the scope of the commit message.
-   `issue` (optional): An object containing properties related to issue key handling in commit messages.
    -   `detectKey` (boolean, optional): If `true`, attempts to detect an issue key from the branch name using the `keyRegex`.
    -   `keyRegex` (RegExp, optional): A regular expression used to detect issue keys in the branch name.
    -   `fallbackKey` (string, optional): A fallback issue key to use if none is detected in the branch name.
-   `format` (optional): An object containing properties related to commit message text formatting.
    -   `sentenceCase` (boolean, optional): If `false`, the first letter of the commit message will be in lowercase.

### diff (optional)

This object contains properties related to the diff.

-   `maxSize` (number, optional): The maximum size (in bytes) of the diff that can be sent to the GPT model. If the diff exceeds this size, an error will be thrown.

## Usage

To use CodeBuddy, run the following command:

```
cb commit
```

This will prompt you to answer a few questions and then generate a commit message based on your input and the diff.

```
cb commit-all
```

this will do a git add for every detected scope, and run the same prompts as cb commit, but for every available scope.

## Version

The current version of CodeBuddy is 0.2.0.

## Contributing

We welcome contributions! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes and push them to your fork.
4. Create a pull request and describe the changes you made.

We will review your pull request and provide feedback.

## Changelog

Please refer to the [CHANGELOG.md](CHANGELOG.md) file for information about changes in each version.

## License

This project is licensed under the [ISC License](LICENSE).
