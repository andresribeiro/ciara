import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";
import type { FirewallType } from "../validate";

type FlatRule = {
	port: number;
	protocol: "tcp" | "udp";
	from: string; // 'Anywhere' or a specific IP address
};

type UfwRule = FlatRule & {
	ruleNumber: number;
};

export async function ensureFirewallIsConfigured(
	ssh: NodeSSH,
	config: typeof FirewallType.infer,
) {
	logger.info("Ensuring firewall is configured.");
	const ufwInstalled = await executeCommand(
		ssh,
		"dpkg -s ufw &> /dev/null && echo true || echo false",
	);
	if (ufwInstalled.stdout === "false") {
		logger.info("ufw not found, installing it.");
		const installResult = await executeCommand(
			ssh,
			"sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ufw",
		);
		if (installResult.code !== 0) {
			logger.error(`Could not install ufw: ${installResult.stderr}`);
			throw new Error("Could not install uwf.");
		}
		const checkInstallation = await executeCommand(
			ssh,
			"dpkg -s ufw &> /dev/null && echo true || echo false",
		);
		if (checkInstallation.stdout === "false") {
			logger.error(
				`Could not validate ufw installation: ${installResult.stderr}`,
			);
			throw new Error("Could not validate ufw installation.");
		}
		logger.info("ufw installed.");
	} else {
		logger.info("ufw is already installed.");
	}

	logger.info("Checking ufw status.");
	const ufwStatus = await executeCommand(ssh, "sudo ufw status | grep Status");
	if (ufwStatus.stdout.includes("inactive")) {
		logger.info("Enabling ufw.");
		await executeCommand(ssh, "yes | sudo ufw enable");
		logger.info("Checking if ufw has been enabled.");
		const newUfwStatus = await executeCommand(
			ssh,
			"sudo ufw status | grep Status",
		);
		if (!newUfwStatus.stdout.includes("active")) {
			logger.error(
				`Could not enable ufw: ${newUfwStatus.stdout} ${newUfwStatus.stderr ?? ""}`,
			);
			throw new Error("Could not enable ufw.");
		}
		logger.info("ufw enabled.");
	} else {
		logger.info("ufw is already enabled.");
	}

	const desiredRules: {
		port: number;
		protocol: "tcp" | "udp";
		from: string;
	}[] = [];
	for (const rule of config.inbound) {
		for (const protocol of rule.protocols) {
			if (rule.allow === "*") {
				desiredRules.push({ port: rule.port, protocol, from: "Anywhere" });
			} else {
				for (const ip of rule.allow) {
					desiredRules.push({ port: rule.port, protocol, from: ip });
				}
			}
		}
	}

	async function parseUfwRules() {
		logger.info("Listing active firewall rules.");
		const rules: UfwRule[] = [];
		const ufwStatusOutput = await executeCommand(
			ssh,
			"sudo ufw status numbered",
		);
		if (!ufwStatusOutput.stdout.includes("Status: active")) {
			logger.error(
				`ufw is not active: ${ufwStatusOutput.stdout} ${ufwStatusOutput.stderr ?? ""}`,
			);
			throw new Error("ufw is not active.");
		} else {
			const lines = ufwStatusOutput.stdout.split("\n");
			const ruleRegex = /\[\s*(\d+)\].*?(\d+)\/(tcp|udp).*?ALLOW IN\s+(.*)/;
			for (const line of lines) {
				// We currently ignore IPv6 rules for simplicity.
				if (line.includes("(v6)")) continue;
				const match = line.match(ruleRegex);
				if (match) {
					const [_, ruleNumber, port, protocol, from] = match;
					if (!ruleNumber || !port || !protocol || !from) {
						logger.error(`Could not extract values from ufw rules: ${match}`);
						throw new Error("Could not extract values from ufw rules.");
					}
					rules.push({
						ruleNumber: Number(ruleNumber),
						port: Number(port),
						protocol: protocol as "tcp" | "udp",
						from: from.trim() === "Anywhere" ? "Anywhere" : from.trim(),
					});
				}
			}
		}
		logger.info("Listed active firewall rules.");
		return rules;
	}
	const currentRules = await parseUfwRules();

	const rulesToDelete: number[] = [];
	for (const currentRule of currentRules) {
		const isDesired = desiredRules.some(
			(desiredRule) =>
				desiredRule.port === currentRule.port &&
				desiredRule.protocol === currentRule.protocol &&
				desiredRule.from === currentRule.from,
		);
		if (!isDesired) {
			rulesToDelete.push(currentRule.ruleNumber);
		}
	}

	const rulesToAdd: FlatRule[] = [];
	for (const desiredRule of desiredRules) {
		const exists = currentRules.some(
			(currentRule) =>
				currentRule.port === desiredRule.port &&
				currentRule.protocol === desiredRule.protocol &&
				currentRule.from === desiredRule.from,
		);
		if (!exists) {
			rulesToAdd.push(desiredRule);
		}
	}

	if (rulesToDelete.length === 0 && rulesToAdd.length === 0) {
		logger.info("Firewall configuration is already up to date.");
	} else {
		// deletions are performed first, in descending order to avoid issues with shifting rule numbers.
		if (rulesToDelete.length > 0) {
			logger.info(
				`Removing ${rulesToDelete.length} obsolete firewall ${rulesToDelete.length === 1 ? "rule" : "rules"}.`,
			);
			rulesToDelete.sort((a, b) => b - a);
			for (const ruleNumber of rulesToDelete) {
				const rule = currentRules.find((r) => r.ruleNumber === ruleNumber);
				rule &&
					logger.info(
						`Deleting rule: number=${ruleNumber}, port=${rule.port}/${rule.protocol}, from=${rule.from}.`,
					);
				await executeCommand(ssh, `yes | sudo ufw delete ${ruleNumber}`);
			}
			logger.info(
				`Removed ${rulesToDelete.length} obsolete firewall ${rulesToDelete.length === 1 ? "rule" : "rules"}.`,
			);
		}
		if (rulesToAdd.length > 0) {
			logger.info(
				`Adding ${rulesToAdd.length} new firewall ${rulesToAdd.length === 1 ? "rule" : "rules"}.`,
			);
			for (const rule of rulesToAdd) {
				logger.info(
					`Adding rule: port=${rule.port}/${rule.protocol}, from=${rule.from}.`,
				);
				const command =
					rule.from === "Anywhere"
						? `sudo ufw allow ${rule.port}/${rule.protocol}`
						: `sudo ufw allow from ${rule.from} to any port ${rule.port} proto ${rule.protocol}`;
				await executeCommand(ssh, command);
			}
			logger.info(
				`Added ${rulesToAdd.length} new firewall ${rulesToAdd.length === 1 ? "rule" : "rules"}.`,
			);
		}
	}

	await executeCommand(ssh, "ufw default deny incoming");
	await executeCommand(ssh, "ufw default allow outgoing");

	logger.info("Doing a new check on active firewall rules.");
	const newCurrentRules = await parseUfwRules();
	for (const current of newCurrentRules) {
		if (
			!desiredRules.some(
				(desired) =>
					desired.from === current.from &&
					desired.port === current.port &&
					desired.protocol === current.protocol,
			)
		) {
			logger.error(
				`New check failed. There is an rule on firewall which is not desired: ${JSON.stringify(current)}`,
			);
			throw new Error(
				"New check failed. There is an rule on firewall which is not desired.",
			);
		}
	}
	for (const desired of desiredRules) {
		if (
			!newCurrentRules.some(
				(current) =>
					current.from === desired.from &&
					current.port === desired.port &&
					current.protocol === desired.protocol,
			)
		) {
			logger.error(
				`New check failed. There is an rule which is not enabled on firewall: ${JSON.stringify(desired)}`,
			);
			throw new Error(
				"New check failed. There is an rule which is not enabled on firewall.",
			);
		}
	}
	logger.info("Firewall is configured.");
}
