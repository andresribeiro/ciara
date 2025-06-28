#! /usr/bin/env bun

import { Command } from "commander";
import { deployCommand } from "./commands/deploy";
import { initCommand } from "./commands/init";
import { validateCommand } from "./commands/validate";

const program = new Command();

program
	.name("ciara")
	.description("Securely deploy any application on any server.")
	.version("1.0.0");

program
	.command("deploy")
	.description("Deploys your application to the configured server(s).")
	.action(async () => {
		await deployCommand();
	});

program
	.command("init")
	.description("Initializes a new Ciara configuration file.")
	.action(async () => {
		await initCommand();
	});

program
	.command("validate")
	.description("Validates your Ciara configuration file.")
	.action(async () => {
		await validateCommand();
	});

program.parse(process.argv);
