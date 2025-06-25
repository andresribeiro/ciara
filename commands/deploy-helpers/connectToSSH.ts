import type { NodeSSH } from "node-ssh";
import { logger } from "../../utils/logger";
import type { ServersType } from "../validate";

export async function connectToSSH(
	ssh: NodeSSH,
	server: typeof ServersType.infer,
	privateSSHKeyPath: string,
) {
	try {
		logger.info(
			`Connecting to ${server.ip} via SSH on on port ${server.port}.`,
		);
		await ssh.connect({
			host: server.ip,
			username: "root",
			port: server.port,
			privateKeyPath: privateSSHKeyPath,
		});
		logger.info(`Connected to ${server.ip}.`);
	} catch (error) {
		const message = `Could not connect to ${server.ip}. ${error}`;
		throw new Error(message);
	}
}
