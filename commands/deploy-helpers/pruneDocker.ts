import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";

export async function pruneDocker(ssh: NodeSSH) {
	logger.info("Pruning Docker.");
	await executeCommand(ssh, "docker system prune -f");
	logger.info("Docker prune complete.");
}
