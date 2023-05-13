# Changelog

All notable changes to the CodeBuddy project will be documented in this file.

## [0.3.0] - 13/05/2023

### Added

-   New configuration options:
    -   `scope`: optional object under `commit` that allows for customization of the commit scope mode
        -   `mode`: controls the commit scope mode, either `"monorepo"` or `"traditional"`
        -   `srcDir`: controls the source directory for the commit scope (only used in `"traditional"` mode)
    -   `diff`: optional object for diff configuration
        -   `exclude`: optional array of strings to exclude from the diff (e.g. `["package-lock.json", "yarn.lock"]`)

### Changed

-   Refactored the `index.ts` to use `commander` for CLI argument parsing and built in help.

### Fixed

-   Fixed a bug where deleted files were incorrectly being sent through `git.add`

### Removed

-   Removed various unused utility functions from `utils/git.ts`

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
