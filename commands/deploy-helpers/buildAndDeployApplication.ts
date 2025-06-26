import path from "node:path";
import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";

export async function buildAndDeployApplication(ssh: NodeSSH, appName: string) {
	logger.info("Starting application build.");
	const remoteTempDir = `/tmp/ciara-deploy-${appName}`;
	const buildId = Date.now();
	const imageName = `${appName.toLowerCase()}:${buildId}`;
	try {
		logger.info(`Ensuring ${remoteTempDir} does not exists.`);
		await executeCommand(ssh, `rm -rf ${remoteTempDir}`);
		logger.info(`Uploading project files to ${remoteTempDir}.`);
		const result = await ssh.putDirectory(process.cwd(), remoteTempDir, {
			recursive: true,
			concurrency: 10,
			// Validate that the file is not in .gitignore
			validate: (itemPath) => {
				const baseName = path.basename(itemPath);
				return (
					baseName !== "node_modules" &&
					baseName !== ".git" &&
					baseName !== "ciara.config.json"
				);
			},
		});
		if (result) {
			logger.info("Project files uploaded.");
		} else {
			throw new Error("Failed to upload project files.");
		}
		logger.info("Ensuring a builder instance is available and ready.");
		await executeCommand(
			ssh,
			"docker buildx create --use --name ciara-builder || true",
		);
		logger.info("A builder instance is available and ready.");
		logger.info(`Building Docker image: ${imageName}.`);
		const dockerBuildCommand = [
			"docker buildx build",
			`--builder ciara-builder`,
			`--platform linux/amd64,linux/arm64`,
			`-t ${imageName}`,
			`--load`, // Load the image into the local Docker daemon
			`${remoteTempDir}`, // The build context
		].join(" ");
		const buildResult = await executeCommand(
			ssh,
			dockerBuildCommand,
			remoteTempDir,
		);
		if (buildResult.code !== 0) {
			throw new Error(
				`Docker build failed with exit code ${buildResult.code}.`,
			);
		}
		logger.info("Docker image built.");
		logger.info(`Image tagged as ${imageName}.`);
	} catch (error) {
		throw error;
	} finally {
		logger.info(`Cleaning up temporary directory: ${remoteTempDir}.`);
		await executeCommand(ssh, `rm -rf ${remoteTempDir}`);
		logger.info("Cleanup complete.");
	}
}
