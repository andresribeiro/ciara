import type { NodeSSH } from "node-ssh";

export async function setupCaddyfilePermissions(
	ssh: NodeSSH,
	remoteCaddyfilePath: string,
) {
	console.log("Setting permissions for Caddyfile.");
	await ssh.execCommand(`sudo chmod 644 ${remoteCaddyfilePath}`);
	console.log("Permissions set for Caddyfile");
}
