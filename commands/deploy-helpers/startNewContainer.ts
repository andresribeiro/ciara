import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";
import { dockerNetworkName } from "./ensureDockerNetworkIsConfigured";

export async function startNewContainer(ssh: NodeSSH, imageName: string) {
	logger.info(`Starting ${imageName}.`);
	const containerName = imageName.replace(":", "-");
	const startContainerResult = await executeCommand(
		ssh,
		`docker run -d --restart always --network ${dockerNetworkName} --name ${containerName} ${imageName}`,
	);
	if (startContainerResult.code !== 0) {
		logger.error("Error starting new container.");
		throw new Error("Error starting new container.");
	}
	logger.info(`Started ${imageName}.`);
	return { containerName };
}
