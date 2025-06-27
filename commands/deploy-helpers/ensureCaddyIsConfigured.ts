import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";
import type { ProxyType } from "../validate";
import { dockerNetworkName } from "./ensureDockerNetworkIsConfigured";

const caddyContainerName = "caddy";
const remoteCaddyParentFolder = "/root/conf";
const remoteCaddyfilePath = `${remoteCaddyParentFolder}/Caddyfile`;

export async function ensureCaddyIsConfigured(
	ssh: NodeSSH,
	appContainerName: string,
	proxySettings: typeof ProxyType.infer,
) {
	logger.info(`Ensuring Caddy is configured.`);
	logger.info(`Copying Caddyfile to ${remoteCaddyfilePath}.`);
	const caddyfileContent = proxySettings.caddyfile
		? await Bun.file(proxySettings.caddyfile).text()
		: `
	  :80, :443
    reverse_proxy ${appContainerName}:${proxySettings.port}
	`;
	const copyResult = await executeCommand(
		ssh,
		`sudo mkdir -p ${remoteCaddyParentFolder} && echo '${caddyfileContent}' | sudo tee ${remoteCaddyfilePath}`,
	);
	if (copyResult.stderr) {
		logger.error(`Failed to copy Caddyfile: ${copyResult.stderr}`);
		throw new Error("Failed to copy Caddyfile.");
	}
	logger.info("Caddyfile copied.");
	logger.info("Checking if Caddy container is running.");
	const checkResult = await executeCommand(
		ssh,
		`docker ps -f name=${caddyContainerName} --format "{{.Names}}"`,
	);
	const isCaddyRunning = checkResult.stdout.trim() === caddyContainerName;
	if (isCaddyRunning) {
		logger.info("Caddy is already running. Reloading configuration.");
		const reloadResult = await executeCommand(
			ssh,
			`docker exec -w /etc/caddy ${caddyContainerName} caddy reload`,
		);
		if (reloadResult.code !== 0) {
			logger.error(`Error reloading Caddy: ${reloadResult.stderr}`);
			throw new Error("Error reloading Caddy.");
		}
		logger.info("Caddy configuration reloaded.");
	} else {
		logger.info("Caddy is not running.");
		logger.info("Removing old containers.");
		await executeCommand(ssh, `docker rm -f ${caddyContainerName}`); // We don't care if it fails (e.g., if it doesn't exist)
		logger.info("Old containers removed.");
		logger.info("Pulling latest Caddy image.");
		const pullResult = await executeCommand(ssh, "docker pull caddy:latest");
		if (pullResult.code !== 0) {
			logger.error(`Failed to pull Caddy image: ${pullResult.stderr}`);
			throw new Error("Failed to pull Caddy image.");
		}
		logger.info("Starting Caddy container.");
		const startResult = await executeCommand(
			ssh,
			`docker run -d --name ${caddyContainerName} --network ${dockerNetworkName} -p 80:80 -p 443:443 -p 443:443/udp -v ${remoteCaddyParentFolder}:/etc/caddy -v caddy_data:/data -v caddy_config:/config caddy:latest`,
		);
		if (startResult.code !== 0) {
			logger.error(`Failed to start Caddy container: ${startResult.stderr}`);
			throw new Error("Failed to start Caddy container.");
		}
		logger.info("Caddy container started.");
	}
	logger.info("Caddy is up and running.");
}
