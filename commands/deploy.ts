import { NodeSSH } from "node-ssh";
import { logger } from "../utils/logger";
import { buildImage } from "./deploy-helpers/buildImage";
import { connectToSSH } from "./deploy-helpers/connectToSSH";
import { doHealthcheck } from "./deploy-helpers/doHealthcheck";
import { ensureCaddyIsConfigured } from "./deploy-helpers/ensureCaddyIsConfigured";
import { ensureDockerIsInstalled } from "./deploy-helpers/ensureDockerIsInstalled";
import { ensureDockerNetworkIsConfigured } from "./deploy-helpers/ensureDockerNetworkIsConfigured";
import { ensureFail2banIsConfigured } from "./deploy-helpers/ensureFail2banIsConfigured";
import { ensureFirewallIsConfigured } from "./deploy-helpers/ensureFirewallIsConfigured";
import { ensureSSHPasswordLoginsAreDisabled } from "./deploy-helpers/ensureSSHPasswordLoginsAreDisabled";
import { ensureUnattendedUpgradesAreConfigured } from "./deploy-helpers/ensureUnattendedUpgradesAreConfigured";
import { pruneDocker } from "./deploy-helpers/pruneDocker";
import { readCiaraConfig } from "./deploy-helpers/readCiaraConfig";
import { startNewContainer } from "./deploy-helpers/startNewContainer";
import { stopOldContainers } from "./deploy-helpers/stopOldContainers";

export async function deployCommand() {
	const config = await readCiaraConfig();
	if (!config) {
		return;
	}
	const servers = config.servers;
	let allOk = true;
	const allServersStartTime = Date.now();
	let alreadyBuiltImageName: string | null = null;
	for (const server of servers) {
		const currentServerStartTime = Date.now();
		const ssh = new NodeSSH();
		try {
			await connectToSSH(ssh, server, config.ssh.privateKeyPath);
			await ensureDockerIsInstalled(ssh);
			await ensureFail2banIsConfigured(ssh);
			await ensureSSHPasswordLoginsAreDisabled(ssh);
			await ensureUnattendedUpgradesAreConfigured(
				ssh,
				config.updates.reboots.enabled,
				config.updates.reboots.time,
			);
			await ensureFirewallIsConfigured(ssh, config.firewall);
			const { imageName } = await buildImage(
				ssh,
				config.builder.host,
				config.appName,
				alreadyBuiltImageName,
			);
			alreadyBuiltImageName = imageName;
			await ensureDockerNetworkIsConfigured(ssh);
			const { containerName } = await startNewContainer(
				ssh,
				imageName,
				config.env,
			);
			await ensureCaddyIsConfigured(ssh, containerName, config.proxy);
			await doHealthcheck(
				ssh,
				containerName,
				config.proxy.port,
				config.healthcheck,
			);
			await stopOldContainers(ssh, config.appName);
			await pruneDocker(ssh);
			const currentServerEndTime = Date.now();
			const durationMs = currentServerEndTime - currentServerStartTime;
			const durationSeconds = durationMs / 1000;
			logger.info(
				`Deployed on ${server.ip} in ${durationSeconds.toFixed(2)} seconds.`,
			);
		} catch (error) {
			logger.error(`Could not deploy to ${server.ip}. Aborting. ${error}`);
			allOk = false;
		} finally {
			logger.info(`Disconnecting from ${server.ip}.`);
			ssh.dispose();
		}
	}
	const allServersEndTime = Date.now();
	const durationMs = allServersEndTime - allServersStartTime;
	const durationSeconds = durationMs / 1000;
	if (allOk) {
		if (servers.length === 1) {
			logger.info(
				`Successfully deployed to your server in ${durationSeconds.toFixed(2)} seconds.`,
			);
		} else {
			logger.info(
				`Successfully deployed on ${servers.length} servers in ${durationSeconds.toFixed(2)} seconds.`,
			);
		}
	}
}
