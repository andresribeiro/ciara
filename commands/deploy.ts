import { NodeSSH } from "node-ssh";
import { logger } from "../utils/logger";
import { connectToSSH } from "./deploy-helpers/connectToSSH";
import { copyCaddyfileToServer } from "./deploy-helpers/copyCaddyfileToServer";
import { disableSSHPasswordLogins } from "./deploy-helpers/disableSSHPasswordLogins";
import { ensureDockerIsInstalled } from "./deploy-helpers/ensureDockerIsInstalled";
import { ensureFail2banIsConfigured } from "./deploy-helpers/ensureFail2banIsConfigured";
import { getCaddyfilePath } from "./deploy-helpers/getCaddyfilePath";
import { pruneImages } from "./deploy-helpers/pruneImages";
import { pullCaddyDockerImages } from "./deploy-helpers/pullCaddyDockerImage";
import { readCiaraConfig } from "./deploy-helpers/readCiaraConfig";
import { setupCaddy } from "./deploy-helpers/setupCaddy";
import { setupCaddyfilePermissions } from "./deploy-helpers/setupCaddyfilePermissions";
import { setupPersistentFolder } from "./deploy-helpers/setupPersistentFolder";
import { startNewContainer } from "./deploy-helpers/startNewContainer";
import { stopOldContainer } from "./deploy-helpers/stopOldContainer";

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
			await disableSSHPasswordLogins(ssh);
			// const localCaddyFilePath = await getCaddyfilePath(config.proxy.caddyfile);
			// const { remoteCaddyfilePath, remoteCaddyServicePath } =
			// 	await setupPersistentFolder(ssh);
			// await copyCaddyfileToServer(ssh, localCaddyFilePath, remoteCaddyfilePath);
			// await setupCaddyfilePermissions(ssh, remoteCaddyfilePath);
			// await pullCaddyDockerImages(ssh);
			// await setupCaddy(ssh);
			// await startNewContainer(ssh);
			// await stopOldContainer(ssh);
			// await pruneImages(ssh);

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
