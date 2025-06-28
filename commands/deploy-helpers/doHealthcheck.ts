import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";
import type { HealthcheckType } from "../validate";
import { dockerNetworkName } from "./ensureDockerNetworkIsConfigured";

const testerContainerName = "ciara-healthchecker";

export async function doHealthcheck(
	ssh: NodeSSH,
	containerName: string,
	appPort: number,
	healthcheck: typeof HealthcheckType.infer | undefined,
) {
	if (!healthcheck) {
		logger.info("No healthcheck configured.");
		return;
	}
	logger.info("Ensuring new container is healthy.");
	const checkTesterExistsCommand = `docker ps -a --filter "name=^/${testerContainerName}$" --format "{{.Names}}"`;
	const { stdout: testerExists } = await executeCommand(
		ssh,
		checkTesterExistsCommand,
	);
	if (!testerExists.trim()) {
		logger.info(`Healthcheck tester container not found. Creating it.`);
		await executeCommand(
			ssh,
			`docker pull debian:latest && docker run -tid --name ${testerContainerName} --network ${dockerNetworkName} alpine:latest > /dev/null 2>&1 && docker exec ciara-healthchecker apk add --no-cache wget`,
		);
	} else {
		const checkTesterRunningCommand = `docker ps -q --filter "name=^/${testerContainerName}$"`;
		const { stdout: testerRunning } = await executeCommand(
			ssh,
			checkTesterRunningCommand,
		);
		if (!testerRunning.trim()) {
			logger.info("Healthcheck tester container is stopped. Starting it.");
			await executeCommand(ssh, `docker start ${testerContainerName}`);
		}
	}
	const { path, interval, timeout, retries } = healthcheck;
	const url = `http://${containerName}:${appPort}${path.startsWith("/") ? path : `/${path}`}`;
	logger.info(`Healthcheck: GET on ${path}`);
	for (let attempt = 1; attempt <= retries; attempt++) {
		logger.info(`Healthcheck attempt ${attempt}/${retries}...`);
		const wgetCommand = `docker exec ${testerContainerName} wget --spider -T ${timeout} --tries=1 "${url}" --quiet && echo "Success: Site is reachable" || echo "Failure: Site is not reachable"`;
		const result = await executeCommand(ssh, wgetCommand);
		if (result.code === 0) {
			logger.info("Healthcheck passed.");
			return;
		}
		logger.warn(`Healthcheck attempt ${attempt} failed.`);
		if (attempt < retries) {
			await new Promise((resolve) => setTimeout(resolve, interval * 1000));
		} else {
			logger.error(
				`Healthcheck failed after ${retries} attempts. Deployment aborted.`,
			);
			await executeCommand(
				ssh,
				`docker stop ${containerName} ${testerContainerName}`,
			);
			throw new Error(`Healthcheck failed.`);
		}
	}
	logger.info("Stopping healthcheck tester container.");
	await executeCommand(ssh, `docker stop ${testerContainerName}`);
	logger.info("Healthcheck tester container stopped.");
	logger.info("New container is healthy.");
}
