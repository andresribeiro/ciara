import { NodeSSH } from "node-ssh";
import { connectToSSH } from "./deploy-helpers/connectToSSH";
import { copyCaddyfileToServer } from "./deploy-helpers/copyCaddyfileToServer";
import { ensureDockerIsInstalled } from "./deploy-helpers/ensureDockerIsInstalled";
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
	const servers = config.servers;
	for (const server of servers) {
		try {
			const ssh = new NodeSSH();
			await connectToSSH(ssh, server);
			await ensureDockerIsInstalled(ssh);
			const localCaddyFilePath = await getCaddyfilePath(config.proxy.caddyfile);
			const { remoteCaddyfilePath, remoteCaddyServicePath } =
				await setupPersistentFolder(ssh);
			await copyCaddyfileToServer(ssh, localCaddyFilePath, remoteCaddyfilePath);
			await setupCaddyfilePermissions(ssh, remoteCaddyfilePath);
			await pullCaddyDockerImages(ssh);
			await setupCaddy(ssh);
			await startNewContainer(ssh);
			await stopOldContainer(ssh);
			await pruneImages(ssh);

			console.log(`Deployed on ${server.ip}`);
			console.log(`Disconnecting from ${server.ip}`);
			ssh.dispose();
		} catch (error) {
			console.error(`Could not deploy to ${server.ip}. Aborting: ${error}`);
			throw error;
		}
		console.log("Successfully deployed to all servers");
	}
}
