import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";

export async function ensureDockerIsInstalled(ssh: NodeSSH) {
	logger.info("Ensuring Docker is installed.");
	const dockerCheckResult = await executeCommand(
		ssh,
		"command -v docker >/dev/null 2>&1 || exit 1",
	);
	if (dockerCheckResult.code === 0) {
		logger.info("Docker is already installed.");
		return;
	}
	logger.info("Docker not found.");
	logger.info("Downloading Docker convenience script.");
	const { stderr: downloadStderr, code: downloadCode } = await executeCommand(
		ssh,
		"curl -fsSL https://get.docker.com -o get-docker.sh",
	);
	if (downloadCode !== 0) {
		logger.error("Failed to download Docker installation script.");
		logger.error("STDERR:", downloadStderr);
		throw new Error("Docker script download failed.");
	}
	logger.info("Downloaded Docker convenience script.");
	logger.info("Running Docker convenience script.");
	const {
		stdout: installStdout,
		stderr: installStderr,
		code: installCode,
	} = await executeCommand(ssh, "sudo sh ./get-docker.sh");
	if (installCode !== 0) {
		logger.error("Failed to install Docker.");
		logger.error("STDOUT:", installStdout);
		logger.error("STDERR:", installStderr);
		throw new Error("Docker installation failed.");
	}
	logger.info("Removing Docker installation script.");
	await executeCommand(ssh, `rm ./get-docker.sh`);
	logger.info("Docker installation script removed.");
	logger.info("Docker installed successfully.");
}
