import os from "node:os";
import path from "node:path";
import { $ } from "bun";
import type { NodeSSH } from "node-ssh";
import { executeCommand, RESET, YELLOW } from "../../utils/executeCommand";
import { logger } from "../../utils/logger";

const dockerBuilderName = "ciara-builder";
const supportedArchitectures = ["amd64", "arm64"];

export async function buildImage(
	ssh: NodeSSH,
	builderHost: string,
	appName: string,
	alreadyBuiltImageName: string | null,
	isDeployingOnMultipleServers: boolean,
) {
	if (alreadyBuiltImageName) {
		logger.info("Image is already built. Uploading it to remote server.");
		const remoteFilePath = `/tmp/${alreadyBuiltImageName}`;
		const localImagePath = `${path.join(os.tmpdir(), alreadyBuiltImageName)}${alreadyBuiltImageName}.tar`;
		try {
			await ssh.putFile(localImagePath, remoteFilePath);
		} catch (error) {
			throw new Error(`Could not upload image to remote server: ${error}`);
		}
		logger.info("Image uploaded to remote server. Loading into Docker.");
		const loadDockerImageResult = await executeCommand(
			ssh,
			`docker load -i ${remoteFilePath}`,
		);
		if (loadDockerImageResult.code !== 0) {
			throw new Error(
				`Could not load image into Docker: ${loadDockerImageResult.stderr}`,
			);
		}
		logger.info("Loaded as Docker image.");
		return { imageName: alreadyBuiltImageName };
	}

	logger.info("Starting application build.");
	const buildId = Date.now();
	const imageName = `${appName.toLowerCase()}:${buildId}`;
	try {
		logger.info("Checking builder architecture.");
		const architectureResult = await executeCommand(
			ssh,
			`dpkg --print-architecture`,
		);
		if (architectureResult.code !== 0) {
			throw new Error(`Error while checking builder architecture.`);
		}
		const builderArchitecture = architectureResult.stdout;
		if (!supportedArchitectures.includes(builderArchitecture)) {
			throw new Error(`Invalid builder architecture.`);
		}
		logger.info("Checked builder architecture.");
		if (builderHost === "local") {
			const proc = Bun.spawn(["dpkg", "--print-architecture"]);
			const localArchitecture = (await new Response(proc.stdout).text()).trim();
			if (localArchitecture !== builderArchitecture) {
				throw new Error(
					`When building locally, your computer should have the same architecture of your server. Your local computer is ${localArchitecture} but your server is ${builderArchitecture}.`,
				);
			}
		}
		logger.info("Builder architecture checked.");
		const removeContextProcess = Bun.spawn({
			cmd: ["docker", "context", "rm", dockerBuilderName],
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		});
		await removeContextProcess.exited;
		// we don't care if it fails (e.g., if this context doesn't exist)
		logger.info("Creating a builder instance.");
		if (builderHost === "local") {
			for await (const line of $`docker context create ${dockerBuilderName}`.lines()) {
				line.length > 0 && logger.debug(line);
			}
		} else {
			for await (const line of $`docker context create ${dockerBuilderName} --docker host=ssh://root@${builderHost}`.lines()) {
				line.length > 0 && logger.debug(line);
			}
		}
		logger.info("A builder instance is available and ready.");
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
			throw new Error(`Docker build failed: ${exit_code}`);
		}
		logger.info("Docker image built.");
		if (builderHost === "local") {
			logger.info("Saving image on a local folder.");
			const localImagePath = `${path.join(os.tmpdir(), imageName)}${imageName}.tar`;
			const remoteFilePath = `/tmp/${imageName}`;
			const removeContextProcess = Bun.spawn({
				cmd: ["docker", "save", "-o", localImagePath, imageName],
				stdin: "inherit",
				stdout: "inherit",
				stderr: "inherit",
			});
			await removeContextProcess.exited;
			if (removeContextProcess.exitCode !== 0) {
				throw new Error("Could not save image on a local folder.");
			}
			logger.info("Image saved on local folder.");
			logger.info("Uploading image to remote server.");
			try {
				await ssh.putFile(localImagePath, remoteFilePath);
			} catch (error) {
				throw new Error(`Could not upload image to remote server: ${error}`);
			}
			logger.info("Image uploaded to remote server. Loading into Docker.");
			const loadDockerImageResult = await executeCommand(
				ssh,
				`docker load -i ${remoteFilePath}`,
			);
			if (loadDockerImageResult.code !== 0) {
				throw new Error(
					`Could not load image into Docker: ${loadDockerImageResult.stderr}`,
				);
			}
			logger.info("Loaded as Docker image.");
		} else if (isDeployingOnMultipleServers) {
			const remoteImagePath = `${path.join(os.tmpdir(), imageName)}${imageName}.tar`;
			const localImagePath = `${path.join(os.tmpdir(), imageName)}${imageName}.tar`;
			logger.info(
				"Exporting image from remote server to local computer for to multi-server deployment.",
			);
			const saveImageResult = await executeCommand(
				ssh,
				`docker save -o ${remoteImagePath} ${imageName}`,
			);
			if (saveImageResult.code !== 0) {
				throw new Error("Could not export image on builder.");
			}
			logger.info("Image exported on builder. Copying it into a local folder.");
			try {
				await ssh.getFile(localImagePath, remoteImagePath);
			} catch (error) {
				throw new Error(
					`Could not copy image from builder into a local folder: ${error}`,
				);
			}
			logger.info("Removing exported image on builder.");
			await executeCommand(ssh, `rm ${remoteImagePath}`);
			logger.info("Exported image removed on builder.");
		}
		return { imageName };
	} catch (error) {
		logger.error(error);
		throw error;
	}
}
