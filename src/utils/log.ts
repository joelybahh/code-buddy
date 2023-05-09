import chalk from "chalk";

export function logPretty(message: string, color: string) {
    console.log(chalk[color](message));
}
