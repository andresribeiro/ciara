import type { NodeSSH } from "node-ssh";
import { logger } from "./logger";

const YELLOW = "\x1B[33m";
const RESET = "\x1B[0m";

export async function executeCommand(
	ssh: NodeSSH,
	command: string,
	cwd?: string,
) {
	logger.info(`Running ${YELLOW}${command}${RESET}`);
	const startTime = Date.now();
	const result = await ssh.execCommand(command, {
		cwd,
		onStdout: (chunk) => {
			const trimmed = chunk.toString("utf8").trim();
			trimmed.length > 0 && logger.debug(trimmed);
		},
		onStderr: (chunk) => {
			const trimmed = chunk.toString("utf8").trim();
			trimmed.length > 0 && logger.error(trimmed);
		},
		noTrim: false,
	});
	const endTime = Date.now();
	const durationMs = endTime - startTime;
	const durationSeconds = durationMs / 1000;
	logger.info(`Finished in ${durationSeconds.toFixed(2)} seconds.`);
	return result;
}
