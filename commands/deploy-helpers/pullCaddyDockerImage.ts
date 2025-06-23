import type { NodeSSH } from "node-ssh";

export async function pullCaddyDockerImages(ssh: NodeSSH) {
	console.log(`Pulling Caddy Docker image`);
	const pullImageResult = await ssh.execCommand(
		`sudo docker pull caddy/caddy:latest`,
	);
	if (
		pullImageResult.stderr &&
		!pullImageResult.stderr.includes("Image is up to date")
	) {
		console.warn("Warning pulling image:", pullImageResult.stderr); // Not a fatal error if image exists
	}
}
