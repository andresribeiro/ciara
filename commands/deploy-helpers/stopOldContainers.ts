import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";

export async function stopOldContainers(ssh: NodeSSH, appName: string) {
	logger.info(`Checking for old containers.`);
	const listResult = await executeCommand(
		ssh,
		`docker ps -a --filter "name=${appName}-" --format "{{.Names}}"`,
	);
	if (listResult.code !== 0) {
		logger.error(`Could not list old containers: ${listResult.stderr}`);
		throw new Error("Could not list old containers.");
	}
	const idsToStop = listResult.stdout
		.split("\n")
		.map((id) => id.trim())
		.filter(Boolean) // this removes empty values
		.sort(); // we order by id name, as names are based on timestamp
	idsToStop.pop(); // we dont want to stop the last container, which is running the current app

	if (idsToStop.length > 0) {
		logger.info(
			`Stopping ${idsToStop.length} old ${idsToStop.length === 1 ? "container" : "containers"}.`,
		);
		const stopResult = await executeCommand(
			ssh,
			`docker stop ${idsToStop.join(" ")}`,
		);
		if (stopResult.code !== 0) {
			logger.error(`Could not stop Docker containers: ${listResult.stderr}`);
			throw new Error("Could not stop Docker containers.");
		}
		logger.info("Old containers stopped.");
		// we don't need to stop these containers as we run prune Docker on every deploy
	} else {
		logger.info("No old containers found.");
	}
}
