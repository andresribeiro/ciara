#! /usr/bin/env bun

import fs from "node:fs";
import path from "node:path";
import inquirer from "inquirer";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs(hideBin(process.argv))
	.command(
		"init",
		"Initialize a new ciara.config.json file",
		() => {},
		async () => {
			if (fs.existsSync("ciara.config.json")) {
				console.log(
					"ciara.config.json already exists. Skipping initialization.",
				);
				return;
			}
			const questions = [
				{
					type: "input",
					name: "ip",
					message: "What is the IP address of the server?",
					validate: (value: string) => {
						const pass = value.match(
							/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
						);
						if (pass) {
							return true;
						}
						return "Please enter a valid IP address.";
					},
				},
				{
					type: "list",
					name: "defaultPort",
					message: "Is SSH running on the default port (22)?",
					choices: ["Yes", "No", "I don't know"],
				},
				{
					type: "input",
					name: "port",
					message: "Which port is SSH running on?",
					when: (answers: { defaultPort: string }) =>
						answers.defaultPort === "no",
					validate: (value: string) => {
						const port = parseInt(value, 10);
						if (port > 0 && port <= 65535) {
							return true;
						}
						return "Please enter a valid port number (1-65535).";
					},
				},
				{
					type: "input",
					name: "user",
					message: "What is your SSH user for connecting to the server?",
					default: "root",
					validate: (value: string) => {
						if (value.length) {
							return true;
						}
						return "Please enter a username.";
					},
				},
				{
					type: "number",
					name: "appPort",
					message: "Which port is your application running on?:",
					default: 3000,
					validate: (value: number) => {
						if (value === 80 || value === 443) {
							return "Ports 80 and 443 are reserved for the proxy. Please choose a different port.";
						}
						if (value > 0 && value < 65536) {
							return true;
						}
						return "Please enter a valid port number (1-65535).";
					},
				},
				{
					type: "confirm",
					name: "setupDomain",
					message: "Would you like to setup a domain?",
					default: false,
				},
				{
					type: "input",
					name: "domain",
					message: "Enter your domain:",
					when: (answers) => answers.setupDomain,
					validate: (value: string) => {
						if (value.length > 0) {
							return true;
						}
						return "Please enter a valid domain name.";
					},
				},
			];

			try {
				const answers = await inquirer.prompt(questions);
				const config = {
					servers: [
						{
							ip: answers.ip,
							port: answers.defaultPort === "No" ? answers.port : "22",
							user: answers.user,
						},
					],
					firewall: {
						inbound: [{ port: answers.appPort, allow: "*" }],
					},
					proxy: {
						port: answers.appPort,
						domains: answers.domain ? [answers.domain] : undefined,
					},
				};
				const configPath = path.join(process.cwd(), "ciara.config.json");
				fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
				console.log(`Successfully created ${configPath}`);
			} catch (error) {
				console.error("An error occurred during initialization:", error);
			}
		},
	)
	.demandCommand(1, "You need at least one command before moving on")
	.help().argv;
