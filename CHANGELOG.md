# Changelog

All notable changes to the CodeBuddy project will be documented in this file.

## [0.2.0] - 10/05/2023

### Added

-   Issue key detection from branch names
-   New configuration options:
    -   `useIssueKey`: allows issue key automation in commit messages
    -   `sentenceCase`: controls whether to use sentence case for commit messages

### Changed

-   Restructured `CodeBuddyConfig` to group related properties, improving organization and maintainability
-   Updated the `commitMessagePrompt` function in `src/prompts/index.ts` to handle new configuration options
-   Improved conciseness in commit message rules for both summary and description

## [0.1.0] - 08/05/2023

### Added

-   Initial release with basic functionality
-   Automatically generate commit messages based on the diff
