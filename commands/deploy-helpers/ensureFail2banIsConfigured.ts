import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";

export async function ensureFail2banIsConfigured(ssh: NodeSSH) {
	logger.info("Checking if Fail2ban is installed.");
	const fail2banResult = await executeCommand(
		ssh,
		"dpkg -l | grep -q '^ii.*fail2ban' || exit 1",
	);
	if (fail2banResult.code !== 0) {
		logger.info("Fail2ban not found. Installing Fail2ban.");
		const { stderr: stderrInstallResult } = await executeCommand(
			ssh,
			"sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y fail2ban python3-systemd",
		);
		// https://github.com/fail2ban/fail2ban/issues/3292#issuecomment-1678844644
		if (stderrInstallResult) {
			logger.error(`Error installing Fail2ban: ${stderrInstallResult}`);
			throw new Error("Fail2ban installation failed.");
		} else {
			logger.info("Fail2ban installed.");
		}
	} else {
		logger.info("Fail2ban is already installed.");
	}
	logger.info("Configuring Fail2ban.");
	logger.info("Checking if jail.local exists.");
	const checkIfJailLocalExistsCommand =
		"test -f /etc/fail2ban/jail.local && echo true || echo false";
	const jailLocalCheck = await executeCommand(
		ssh,
		checkIfJailLocalExistsCommand,
	);
	if (jailLocalCheck.stdout.trim() === "false") {
		logger.info(
			"jail.local does not exists. Creating jail.local from jail.conf.",
		);
		const copyResult = await executeCommand(
			ssh,
			"sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local",
		);
		if (copyResult.stderr) {
			logger.error(`Error copying jail.conf: ${copyResult.stderr}`);
			throw new Error("Failed to create jail.local.");
		}
		logger.info("jail.local created.");
	} else {
		logger.info("jail.local already exists.");
	}
	logger.info("Setting jail.local config.");
	const jailLocalContent = `
    [sshd]
    backend = systemd
    enabled = true
    port = ssh
    filter = sshd
    logpath = /var/log/auth.log
    maxretry = 3
    bantime = 3600
  `;
	const writeResult = await executeCommand(
		ssh,
		`echo "${jailLocalContent}" | sudo tee /etc/fail2ban/jail.local`,
	);
	if (writeResult.stderr) {
		logger.error(`Error setting jail.local config: ${writeResult.stderr}`);
		throw new Error("Failed to write jail.local configuration.");
	}
	logger.info("Restarting Fail2ban service.");
	const restartResult = await executeCommand(
		ssh,
		"sudo systemctl restart fail2ban",
	);
	if (restartResult.stderr) {
		logger.error(`Error restarting Fail2ban service: ${restartResult.stderr}`);
		throw new Error("Failed to restart Fail2ban service.");
	}
	logger.info("Fail2ban configured and restarted.");
	logger.info("Fail2ban is now configured to protect SSH.");
}
