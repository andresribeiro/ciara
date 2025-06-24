import type { NodeSSH } from "node-ssh";
import { logCommand, logger } from "../../utils/logger";

export async function ensureSSHPasswordLoginsAreDisabled(ssh: NodeSSH) {
	logger.info("Checking SSH password authentication status.");
	const checkCommand = `grep -E '^PasswordAuthentication\\s+no' /etc/ssh/sshd_config || grep -E '^#?PasswordAuthentication\\s+yes' /etc/ssh/sshd_config`;
	logCommand(checkCommand);
	const checkResult = await ssh.execCommand(checkCommand);
	if (checkResult.stdout.includes("PasswordAuthentication no")) {
		logger.info("SSH password logins are already disabled.");
		return;
	}
	logger.info("Disabling SSH password logins.");
	const disablePasswordAuthenticationCommand = `sed -i -E 's/#?PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config`;
	logCommand(disablePasswordAuthenticationCommand);
	const disablePasswordAuthenticationResult = await ssh.execCommand(
		disablePasswordAuthenticationCommand,
	);
	if (disablePasswordAuthenticationResult.stderr) {
		logger.error(
			`Error disabling SSH password logins: ${disablePasswordAuthenticationResult.stderr}`,
		);
		throw new Error(`Failed to disable SSH password logins.`);
	}
	logger.info("SSH configuration updated. Restarting sshd service.");
	const restartSSHServiceCommand = `sudo systemctl restart sshd`;
	logCommand(restartSSHServiceCommand);
	const restartSSHServiceResult = await ssh.execCommand(
		restartSSHServiceCommand,
	);
	if (restartSSHServiceResult.stderr) {
		logger.error(
			`Error restarting SSH service: ${restartSSHServiceResult.stderr}`,
		);
		throw new Error(`Failed to restart SSH service.`);
	}
	logger.info("Successfully restarted SSH service.");
	logger.info("SSH password logins disabled successfully.");
}
