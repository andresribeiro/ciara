import { $ } from "bun";
import { logger } from "../../utils/logger";

const dockerBuilderName = "ciara-builder";

export async function buildImage(builderIp: string, appName: string) {
	logger.info("Starting application build.");
	const buildId = Date.now();
	const imageName = `${appName.toLowerCase()}:${buildId}`;
	try {
		await $`docker context rm ${dockerBuilderName}`.nothrow(); // We don't care if it fails (e.g., if it doesn't exist)
		for await (const line of $`docker context create ${dockerBuilderName} --docker host=ssh://root@${builderIp}`.lines()) {
			line.length > 0 && logger.debug(line);
		}
		logger.info("A builder instance is available and ready.");
		logger.info(`Building Docker image: ${imageName}.`);
		try {
			for await (const line of $`docker --context ${dockerBuilderName} build -t ${imageName} .`.lines()) {
				line.length > 0 && logger.debug(line);
			}
			logger.info("Docker image built.");
		} catch (error) {
			logger.error(`Docker build failed: ${error}`);
			throw new Error(`Docker build failed.`);
		}
		return { imageName };
	} catch (error) {
		logger.error(error);
		throw error;
	}
}
