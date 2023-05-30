# Changelog

All notable changes to the CodeBuddy project will be documented in this file.

## [0.4.3] - 30/05/2023

### Fixed

-   Fixed a bug where the the diff check would fail if there were deleted files in the diff, due to a missing `--` in the `git.diff` command.

## [0.4.2] - 29/05/2023

### Fixed

-   Fixed a bug where the issue key was coming through as [undefined] instead of using the fallback key.

## [0.4.1] - 28/05/2023

### Changed

-   Updated README to include NPM installation instructions.
-   Updated README to include various badges.

## [0.4.0] - 27/05/2023

### Added

-   New `applyConfigTransform` and `applyConfigTransformAsync` functions to handle synchronous and asynchronous config transformations respectively.
-   New `applyScopeTrim` function for trimming specific strings from the commit scope.
-   Updated `getScopeMonorepo` in `git.ts` to accept an array of directories for better customization.
-   Added support for emoji in commit messages, enhancing their visual appeal.
-   Added an optional `reason` argument to the `determineCommitMessage` function in `src/utils/openai.ts` to provide additional context for the generated commit messages.
    -   This feature allows AI-generated commits to be coupled with a reason, providing business context where needed.
-   Added an optional `type` argument to the `determineCommitMessage` function in `src/utils/openai.ts` to provide a commit type for the generated commit messages.
    -   This feature allows AI-generated commits to be grounded in a specific type, improving the quality of the generated commit messages.

### Changed

-   Refactored `commitConfirmationPrompt` function in `src/prompts/index.ts` to use `applyConfigTransform` and `applyConfigTransformAsync` for applying configuration settings to the generated commit message. This change improves code readability and maintainability.
-   Updated the function signature and prompt generation in `determineCommitMessage` to include the reason when provided.

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
    $$
