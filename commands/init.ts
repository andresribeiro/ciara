import os from "node:os";
import path from "node:path";
import inquirer from "inquirer";
import { getConfigPath } from "../utils/getConfigPath";
import { logger } from "../utils/logger";
import type { CiaraConfig } from "./validate";

export async function initCommand() {
	const configPath = getConfigPath();
	const configAlreadyExists = await Bun.file(configPath).exists();
	if (configAlreadyExists) {
		logger.info("ciara.config.json already exists. Skipping initialization.");
		return;
	}
	const questions = [
		{
			type: "input",
			name: "appName",
			message: "What is your app name?",
			validate: (value: string) => {
				const pass = value.match(/^[a-zA-Z0-9_-]+$/);
				if (pass) {
					return true;
				}
				return "Please enter a valid app name (only letters, numbers, -, and _ are allowed).";
			},
		},
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
			type: "number",
			name: "appPort",
			message: "Which port is your application running on?",
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
			message: "Would you like to set up a domain?",
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
		function getSshPrivateKeyPath() {
			const homeDir = os.homedir();
			const sshDir = path.join(homeDir, ".ssh");
			return path.join(sshDir, "id_rsa");
		}
		const config: typeof CiaraConfig.infer = {
			appName: answers.appName,
			servers: [
				{
					ip: answers.ip,
					port: 22,
				},
			],
			ssh: {
				privateKeyPath: getSshPrivateKeyPath(),
			},
			proxy: {
				port: answers.appPort,
				domains: answers.domain ? [answers.domain] : undefined,
			},
			healthcheck: {
				path: "/",
				interval: 5,
				timeout: 3,
				retries: 5,
			},
			firewall: {
				inbound: [
					{
						port: 22,
						allow: "*",
						protocols: ["udp"],
					},
				],
			},
			updates: {
				reboots: {
					enabled: true,
					time: "03:00",
				},
			},
			builder: {
				host: answers.ip,
			},
		};
		await Bun.write(configPath, JSON.stringify(config, null, 2));
		logger.info("ciara.config.json created.");
	} catch (error) {
		logger.error("An error occurred during initialization:", error);
	}
}
