import { NodeSSH } from "node-ssh";
import { logger } from "../utils/logger";
import { buildImage } from "./deploy-helpers/buildImage";
import { connectToSSH } from "./deploy-helpers/connectToSSH";
import { doHealthchecks } from "./deploy-helpers/doHealthchecks";
import { ensureCaddyIsConfigured } from "./deploy-helpers/ensureCaddyIsConfigured";
import { ensureDockerIsInstalled } from "./deploy-helpers/ensureDockerIsInstalled";
import { ensureDockerNetworkIsConfigured } from "./deploy-helpers/ensureDockerNetworkIsConfigured";
import { ensureFail2banIsConfigured } from "./deploy-helpers/ensureFail2banIsConfigured";
import { ensureFirewallIsConfigured } from "./deploy-helpers/ensureFirewallIsConfigured";
import { ensureSSHPasswordLoginsAreDisabled } from "./deploy-helpers/ensureSSHPasswordLoginsAreDisabled";
import { ensureUnattendedUpgradesAreConfigured } from "./deploy-helpers/ensureUnattendedUpgradesAreConfigured";
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
	for (const server of servers) {
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
			await ensureFirewallIsConfigured(ssh);
			const { imageName } = await buildImage(
				config.servers[0]?.ip as string,
				config.appName,
			);
			await ensureDockerNetworkIsConfigured(ssh);
			const { containerName } = await startNewContainer(ssh, imageName);
			await ensureCaddyIsConfigured(ssh, containerName, config.proxy);
			await doHealthchecks(ssh);
			await stopOldContainers(ssh);
			logger.info(`Deployed on ${server.ip}.`);
		} catch (error) {
			logger.error(`Could not deploy to ${server.ip}. Aborting. ${error}`);
			allOk = false;
		} finally {
			logger.info(`Disconnecting from ${server.ip}.`);
			ssh.dispose();
		}
		if (allOk) {
			logger.info("Successfully deployed to all servers.");
		}
	}
}
