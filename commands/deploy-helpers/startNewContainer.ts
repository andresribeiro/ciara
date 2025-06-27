import dotenv from "dotenv";
import type { NodeSSH } from "node-ssh";
import { executeCommand } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";
import { dockerNetworkName } from "./ensureDockerNetworkIsConfigured";

async function parseEnv(envFile: string) {
	const fileContent = await Bun.file(envFile).text();
	return dotenv.parse(fileContent);
}

export async function startNewContainer(
	ssh: NodeSSH,
	imageName: string,
	envFile: string | undefined,
) {
	const containerName = imageName.replace(":", "-");
	logger.info(`Starting ${containerName}.`);
	let envArgs = "";
	if (envFile) {
		try {
			const env = await parseEnv(envFile);
			envArgs = Object.entries(env)
				.map(([key, value]) => {
					// escape single quotes within the value for cases like MY_SECRET="that's-that-me-espresso"
					// ' -> '\''
					const escapedValue = value.replace(/'/g, "'\\''");
					return `-e ${key}='${escapedValue}'`;
				})
				.join(" ");
		} catch (error) {
			logger.error(`Could not read environment variables: ${error}`);
			throw new Error("Could not read environment variables.");
		}
	}
	const startContainerResult = await executeCommand(
		ssh,
		`docker run -d --restart always --network ${dockerNetworkName} --name ${containerName} ${envArgs} ${imageName}`,
	);
	if (startContainerResult.code !== 0) {
		logger.error("Error starting new container.");
		throw new Error("Error starting new container.");
	}
	logger.info(`Started ${imageName}.`);
	return { containerName };
}
