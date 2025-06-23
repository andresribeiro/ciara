import type { NodeSSH } from "node-ssh";
import { logCommand, logger } from "../../utils/logger";

export async function ensureDockerIsInstalled(ssh: NodeSSH) {
	logger.info("Ensuring Docker is installed.");
	const checkDockerComman = "docker --version";
	logCommand(checkDockerComman);
	const { stdout, code } = await ssh.execCommand(checkDockerComman);
	if (code === 0 && stdout.includes("Docker version")) {
		logger.info("Docker is already installed.");
		return;
	}
	logger.info("Docker not found.");
	logger.info("Downloading Docker convenience script.");
	const downloadScript = "curl -fsSL https://get.docker.com -o get-docker.sh";
	logCommand(downloadScript);
	const { stderr: downloadStderr, code: downloadCode } =
		await ssh.execCommand(downloadScript);
	if (downloadCode !== 0) {
		logger.error("Failed to download Docker installation script.");
		logger.error("STDERR:", downloadStderr);
		throw new Error("Docker script download failed.");
	}
	const installScript = "sudo sh ./get-docker.sh";
	logger.info("Downloaded Docker convenience script.");
	logger.info("Running Docker convenience script.");
	logCommand(installScript);
	const {
		stdout: installStdout,
		stderr: installStderr,
		code: installCode,
	} = await ssh.execCommand(installScript);
	if (installCode !== 0) {
		logger.error("Failed to install Docker.");
		logger.error("STDOUT:", installStdout);
		logger.error("STDERR:", installStderr);
		throw new Error("Docker installation failed.");
	}
	logger.info("Docker installed successfully.");
}
