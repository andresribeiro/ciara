import type { NodeSSH } from "node-ssh";
import type { ServersType } from "../validate";

export async function connectToSSH(
	ssh: NodeSSH,
	server: typeof ServersType.infer,
) {
	try {
		console.log(
			`Connecting to ${server.ip} via SSH on user ${server.user} on port ${server.port}`,
		);
		await ssh.connect({
			host: server.ip,
			username: server.user,
			port: server.port,
			privateKeyPath: "~/.ssh/id_rsa.pub",
		});
		console.log(`Connected to ${server.ip}`);
	} catch {
		const message = `Could not connect to ${server.ip}`;
		console.error(message);
		throw new Error(message);
	}
}
