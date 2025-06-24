import type { NodeSSH } from "node-ssh";
import { logCommand, logger } from "../../utils/logger";

export async function ensureFail2banIsConfigured(ssh: NodeSSH) {
	logger.info("Checking if Fail2ban is installed.");
	const checkFail2banInstalledCommand = "dpkg -s fail2ban";
	logCommand(checkFail2banInstalledCommand);
	const { stdout: fail2banStatus } = await ssh.execCommand(
		checkFail2banInstalledCommand,
	);
	if (!fail2banStatus.includes("Status: install ok installed")) {
		logger.info("Fail2ban not found. Installing Fail2ban.");
		const installCommand =
			"DEBIAN_FRONTEND=noninteractive sudo apt-get update && DEBIAN_FRONTEND=noninteractive sudo apt-get install -y fail2ban python3-systemd";
		// https://github.com/fail2ban/fail2ban/issues/3292#issuecomment-1678844644
		logCommand(installCommand);
		const { stderr: stderrInstallResult } =
			await ssh.execCommand(installCommand);
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
	logCommand(checkIfJailLocalExistsCommand);
	const jailLocalCheck = await ssh.execCommand(checkIfJailLocalExistsCommand);
	if (jailLocalCheck.stdout.trim() === "false") {
		logger.info(
			"jail.local does not exists. Creating jail.local from jail.conf.",
		);
		const copyJailConfCommand =
			"sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local";
		logCommand(copyJailConfCommand);
		const copyResult = await ssh.execCommand(copyJailConfCommand);
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
	const command = `echo "${jailLocalContent}" | sudo tee /etc/fail2ban/jail.local`;
	logCommand(command);
	const writeResult = await ssh.execCommand(command);
	if (writeResult.stderr || writeResult.code !== 0) {
		logger.error(`Error setting jail.local config: ${writeResult.stderr}`);
		throw new Error("Failed to write jail.local configuration.");
	}
	logger.info("Restarting Fail2ban service.");
	const restartFail2banServiceCommand = "sudo systemctl restart fail2ban";
	logCommand(restartFail2banServiceCommand);
	const restartResult = await ssh.execCommand(restartFail2banServiceCommand);
	if (restartResult.stderr) {
		logger.error(`Error restarting Fail2ban service: ${restartResult.stderr}`);
		throw new Error("Failed to restart Fail2ban service.");
	}
	logger.info("Fail2ban configured and restarted.");
	logger.info("Fail2ban is now configured to protect SSH.");
}
