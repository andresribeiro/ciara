#! /usr/bin/env bun

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { deployCommand } from "./commands/deploy";
import { initCommand } from "./commands/init";
import { validateCommand } from "./commands/validate";

yargs(hideBin(process.argv))
	.command(
		"init",
		"Initialize a new ciara.config.json file",
		() => {},
		initCommand,
	)
	.command(
		"validate",
		"Validate ciara.config.json file",
		() => {},
		validateCommand,
	)
	.command(
		"deploy",
		"Deploy a new version of your app",
		() => {},
		deployCommand,
	)
	.demandCommand(1, "You need at least one command before moving on")
	.help().argv;
