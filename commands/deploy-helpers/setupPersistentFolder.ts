import type { NodeSSH } from "node-ssh";

export async function setupPersistentFolder(ssh: NodeSSH) {
	const remoteCaddyfileDir = "/var/lib/caddy";
	const remoteCaddyfilePath = `${remoteCaddyfileDir}/Caddyfile`;
	const remoteCaddyDataPath = "/var/lib/caddy/data";
	const remoteCaddyConfigPath = "/var/lib/caddy/config";
	const remoteCaddyServicePath = "/etc/systemd/system/caddy.service";
	console.log("Creating persistent folders");
	const mkdirResult = await ssh.execCommand(
		`sudo mkdir -p ${remoteCaddyfileDir} ${remoteCaddyDataPath} ${remoteCaddyConfigPath}`,
	);
	if (mkdirResult.stderr) {
		console.error("Could not create persistent folders:", mkdirResult.stderr);
		throw new Error("Could not create persistent folders");
	}
	return { remoteCaddyfilePath, remoteCaddyServicePath };
}
