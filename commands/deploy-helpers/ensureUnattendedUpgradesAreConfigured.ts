import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";

export async function ensureUnattendedUpgradesAreConfigured(
	ssh: NodeSSH,
	rebootsEnabled: boolean,
	rebootsTime: string,
) {
	logger.info("Ensuring unattended-upgrades is configured.");
	logger.info("Checking if unattended-upgrades is installed.");
	const checkIfUnattendedUpgradesIsInstalledResult = await executeCommand(
		ssh,
		"dpkg -s unattended-upgrades",
	);
	if (
		checkIfUnattendedUpgradesIsInstalledResult.stdout.includes(
			"Status: install ok installed",
		)
	) {
		logger.info("unattended-upgrades is already installed.");
	} else {
		logger.info(
			"unattended-upgrades not found. Installing unattended-upgrades",
		);
		const installResult = await executeCommand(
			ssh,
			"sudo DEBIAN_FRONTEND=noninteractive apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades",
		);
		if (installResult.stderr) {
			logger.error(
				`Failed to install unattended-upgrades: ${installResult.stderr}`,
			);
			throw new Error("Failed to install unattended-upgrades.");
		}
		logger.info("unattended-upgrades installed successfully.");
	}
	const aptConfDPath = "/etc/apt/apt.conf.d/20auto-upgrades";
	logger.info(`Updating ${aptConfDPath}`);
	const aptConfDContent = `
    APT::Periodic::Update-Package-Lists "1";
    APT::Periodic::Unattended-Upgrade "1";
  `;
	const aptConfDResult = await executeCommand(
		ssh,
		`echo "${aptConfDContent}" | sudo tee ${aptConfDPath}`,
	);
	if (aptConfDResult.code !== 0) {
		logger.error(
			`Failed to write to ${aptConfDPath}: ${aptConfDResult.stderr}`,
		);
		throw new Error(`Failed to write to ${aptConfDPath}`);
	}
	logger.info(`Successfully updated ${aptConfDPath}`);
	const unattendedUpgradesConfigPath =
		"/etc/apt/apt.conf.d/50unattended-upgrades";
	logger.info(`Updating ${unattendedUpgradesConfigPath}`);
	const unattendedUpgradesConfig = `
    Unattended-Upgrade::Automatic-Reboot "${rebootsEnabled}";
    Unattended-Upgrade::Automatic-Reboot-Time "${rebootsTime}";
    Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
    Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
    Unattended-Upgrade::Remove-Unused-Dependencies "true";
  `;
	const unattendedUpgradesConfigResult = await executeCommand(
		ssh,
		`echo "${unattendedUpgradesConfig}" | sudo tee ${unattendedUpgradesConfigPath}`,
	);
	logger.info(`Successfully updated ${unattendedUpgradesConfigPath}`);
	if (unattendedUpgradesConfigResult.code !== 0) {
		logger.error(
			`Failed to write to ${unattendedUpgradesConfigPath}: ${unattendedUpgradesConfigResult.stderr}`,
		);
		throw new Error(`Failed to write to ${unattendedUpgradesConfigPath}.`);
	}
	logger.info("Unattended upgrades configured successfully.");
}
