import { NodeSSH } from "node-ssh";
import { logger } from "../utils/logger";
// import { buildAndDeployApplication } from "./deploy-helpers/buildAndDeployApplication";
import { connectToSSH } from "./deploy-helpers/connectToSSH";
// import { ensureCaddyIsConfigured } from "./deploy-helpers/ensureCaddyIsConfigured";
import { ensureDockerIsInstalled } from "./deploy-helpers/ensureDockerIsInstalled";
import { ensureFail2banIsConfigured } from "./deploy-helpers/ensureFail2banIsConfigured";
import { ensureSSHPasswordLoginsAreDisabled } from "./deploy-helpers/ensureSSHPasswordLoginsAreDisabled";
import { ensureUnattendedUpgradesAreConfigured } from "./deploy-helpers/ensureUnattendedUpgradesAreConfigured";
import { readCiaraConfig } from "./deploy-helpers/readCiaraConfig";

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
			// await buildAndDeployApplication(ssh, config.appName);
			// await ensureCaddyIsConfigured(ssh, config.proxy.caddyfile);

			logger.info(`Deployed on ${server.ip}.`);
			logger.info(`Disconnecting from ${server.ip}.`);
		} catch (error) {
			logger.error(`Could not deploy to ${server.ip}. Aborting. ${error}`);
			allOk = false;
		} finally {
			ssh.dispose();
		}
		if (allOk) {
			logger.info("Successfully deployed to all servers.");
		}
	}
}
