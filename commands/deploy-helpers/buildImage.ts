import { $ } from "bun";
import type { NodeSSH } from "node-ssh";
import { executeCommand, RESET, YELLOW } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";

const dockerBuilderName = "ciara-builder";
const supportedArchitectures = ["amd64", "arm64"];

export async function buildImage(
	ssh: NodeSSH,
	builderIp: string,
	appName: string,
) {
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
		logger.info("Checking builder architecture.");
		const architectureResult = await executeCommand(
			ssh,
			`dpkg --print-architecture`,
		);
		if (architectureResult.code !== 0) {
			logger.error(
				`Error while checking builder architecture: ${architectureResult.stderr}`,
			);
			throw new Error(`Error while checking builder architecture.`);
		}
		const builderArchitecture = architectureResult.stdout;
		if (!supportedArchitectures.includes(builderArchitecture)) {
			logger.info(
				`Invalid builder architecture: ${builderArchitecture}. Supported architectures: ${supportedArchitectures.join(",")}.`,
			);
			throw new Error(`Invalid builder architecture.`);
		}
		logger.info("Builder architecture.");
		logger.info("Building Docker image.");
		const cmd = [
			"docker",
			"--context",
			dockerBuilderName,
			"build",
			"--progress",
			"tty",
			"--platform",
			`linux/${builderArchitecture}`,
			"-t",
			imageName,
			".",
		];
		logger.info(`Running ${YELLOW}${cmd.join(" ")}${RESET}`);
		const startTime = Date.now();
		const proc = Bun.spawn({
			cmd,
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		});
		const exit_code = await proc.exited;
		const endTime = Date.now();
		const durationMs = endTime - startTime;
		const durationSeconds = durationMs / 1000;
		logger.info(`Finished in ${durationSeconds.toFixed(2)} seconds.`);
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
