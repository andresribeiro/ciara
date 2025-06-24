import type { NodeSSH } from "node-ssh";
import { logCommand, logger } from "../../utils/logger";

export async function ensureUnattendedUpgradesAreConfigured(
	ssh: NodeSSH,
	rebootsEnabled: boolean,
	rebootsTime: string,
) {
	logger.info("Ensuring unattended-upgrades is configured.");
	logger.info("Checking if unattended-upgrades is installed.");
	const checkIfUnattendedUpgradesIsInstalledCommand =
		"dpkg -s unattended-upgrades";
	logCommand(checkIfUnattendedUpgradesIsInstalledCommand);
	const checkIfUnattendedUpgradesIsInstalledResult = await ssh.execCommand(
		checkIfUnattendedUpgradesIsInstalledCommand,
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
		const installCommand =
			"DEBIAN_FRONTEND=noninteractive sudo apt-get update && sudo apt-get install -y unattended-upgrades";
		logCommand(installCommand);
		const installResult = await ssh.execCommand(installCommand);
		if (installResult.stderr) {
			logger.error(
				`Failed to install unattended-upgrades: ${installResult.stderr}`,
			);
			throw new Error("Failed to install unattended-upgrades.");
		}
		logger.info("unattended-upgrades installed successfully.");
	}
	logger.info("Updating apt.conf.d/20auto-upgrades");
	const aptConfDContent = `
    APT::Periodic::Update-Package-Lists "1";
    APT::Periodic::Unattended-Upgrade "1";
  `;
	const aptConfDPath = "/etc/apt/apt.conf.d/20auto-upgrades";
	const aptConfDCommand = `echo "${aptConfDContent}" | sudo tee ${aptConfDPath}`;
	logCommand(aptConfDCommand);
	const aptConfDResult = await ssh.execCommand(aptConfDCommand);
	if (aptConfDResult.code !== 0) {
		logger.error(
			`Failed to write to ${aptConfDPath}: ${aptConfDResult.stderr}`,
		);
		throw new Error(`Failed to write to ${aptConfDPath}`);
	}
	logger.info("Successfully updated apt.conf.d/20auto-upgrades");
	logger.info("Updating apt.conf.d/50unattended-upgrades");
	const unattendedUpgradesConfig = `
    Unattended-Upgrade::Automatic-Reboot "${rebootsEnabled}";
    Unattended-Upgrade::Automatic-Reboot-Time "${rebootsTime}";
    Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
    Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
    Unattended-Upgrade::Remove-Unused-Dependencies "true";
  `;
	const unattendedUpgradesConfigPath =
		"/etc/apt/apt.conf.d/50unattended-upgrades";
	const unattendedUpgradesConfigCommand = `echo "${unattendedUpgradesConfig}" | sudo tee -a ${unattendedUpgradesConfigPath}`;
	logCommand(unattendedUpgradesConfigCommand);
	const unattendedUpgradesConfigResult = await ssh.execCommand(
		unattendedUpgradesConfigCommand,
	);
	logger.info("Successfully updated apt.conf.d/50unattended-upgrades");
	if (unattendedUpgradesConfigResult.code !== 0) {
		logger.error(
			`Failed to write to ${unattendedUpgradesConfigPath}: ${unattendedUpgradesConfigResult.stderr}`,
		);
		throw new Error(`Failed to write to ${unattendedUpgradesConfigPath}.`);
	}
	logger.info("Unattended upgrades configured successfully.");
}
