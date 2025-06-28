import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";

export const dockerNetworkName = "ciara-network";

export async function ensureDockerNetworkIsConfigured(ssh: NodeSSH) {
	logger.info("Ensuring that Docker network is configured.");
	logger.info(`Checking if Docker network '${dockerNetworkName}' exists.`);
	const networkCheckResult = await executeCommand(
		ssh,
		`docker network inspect ${dockerNetworkName}`,
	);
	if (networkCheckResult.code !== 0) {
		logger.info(`Network ${dockerNetworkName} does not exists. Creating it.`);
		const createNetworkResult = await executeCommand(
			ssh,
			`docker network create ${dockerNetworkName}`,
		);
		if (createNetworkResult.code !== 0) {
			logger.error(
				`Failed to create Docker network: ${createNetworkResult.stderr}`,
			);
			throw new Error("Failed to create Docker network.");
		}
		logger.info(`Docker network '${dockerNetworkName}' created.`);
	} else {
		logger.info(`Docker network '${dockerNetworkName}' already exists.`);
	}
}
