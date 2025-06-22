#! /usr/bin/env bun

import fs from "node:fs";
import path from "node:path";
import inquirer from "inquirer";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { initCommand } from "./commands/init";

yargs(hideBin(process.argv))
	.command(
		"init",
		"Initialize a new ciara.config.json file",
		() => {},
		initCommand,
	)
	.demandCommand(1, "You need at least one command before moving on")
	.help().argv;
