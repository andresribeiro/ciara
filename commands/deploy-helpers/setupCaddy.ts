import type { NodeSSH } from "node-ssh";

const caddyContainerName = "caddy-ciara";

export async function setupCaddy(ssh: NodeSSH) {
	console.log(
		`Checking if Caddy container (${caddyContainerName}) is already running...`,
	);
	const checkRunningResult = await ssh.execCommand(
		`sudo docker ps --filter "name=${caddyContainerName}" --format "{{.ID}}"`,
	);
	if (checkRunningResult.stdout.trim() !== "") {
		console.log(
			`Caddy container (${caddyContainerName}) is already running. Skipping image pull and new container start.`,
		);
		return;
	} else {
		console.log(`Caddy container (${caddyContainerName}) is NOT running.`);
		// start setup container
	}
}
