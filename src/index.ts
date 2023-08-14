#! /usr/bin/env node

import { Command } from "commander";

import { setupCommitAll, setupSmartVersion } from "./utils/commander.js";

const program = new Command();

program.version("0.2.0");

setupCommitAll(program);
setupSmartVersion(program);

program.parse(process.argv);
