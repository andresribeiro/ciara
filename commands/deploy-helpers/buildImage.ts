import { $ } from "bun";
import { logger } from "../../utils/logger";

const dockerBuilderName = "ciara-builder";

export async function buildImage(builderIp: string, appName: string) {
	logger.info("Starting application build.");
	const buildId = Date.now();
	const imageName = `${appName.toLowerCase()}:${buildId}`;
	try {
		const removeContextProcess = Bun.spawn({
			cmd: ["docker", "context", "rm", dockerBuilderName],
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		});
		await removeContextProcess.exited;
		// we don't care if it fails (e.g., if this context doesn't exist)
		logger.info("Creating a builder instance.");
		for await (const line of $`docker context create ${dockerBuilderName} --docker host=ssh://root@${builderIp}`.lines()) {
			line.length > 0 && logger.debug(line);
		}
		logger.info("A builder instance is available and ready.");
		logger.info("Building Docker image.");
		const proc = Bun.spawn({
			cmd: [
				"docker",
				"--context",
				dockerBuilderName,
				"build",
				"--progress",
				"tty",
				"-t",
				imageName,
				".",
			],
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		});
		const exit_code = await proc.exited;
		if (exit_code !== 0) {
			logger.error(`Docker build failed: ${exit_code}`);
			throw new Error(`Docker build failed.`);
		}
		logger.info("Docker image built.");
		return { imageName };
	} catch (error) {
		logger.error(error);
		throw error;
	}
}
