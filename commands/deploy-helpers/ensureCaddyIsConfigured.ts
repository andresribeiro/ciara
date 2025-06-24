import type { NodeSSH } from "node-ssh";
import { logCommand, logger } from "../../utils/logger";

export async function ensureCaddyIsConfigured(
	ssh: NodeSSH,
	customCaddyfile: string | undefined,
) {
	logger.info(`Ensuring Caddy is configured.`);
	logger.info("Checking if Caddy is already installed.");
	const checkCaddyCommand = "which caddy";
	logCommand(checkCaddyCommand);
	const checkResult = await ssh.execCommand(checkCaddyCommand);
	if (checkResult.code === 0) {
		logger.info("Caddy is already installed. Skipping installation.");
	} else {
		logger.info("Caddy not found. Installing Caddy.");
		logger.info("Installing necessary tools.");
		const installNecessaryDepsCommand =
			"sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl";
		const installNecessaryDepsResult = await ssh.execCommand(
			installNecessaryDepsCommand,
		);
		if (installNecessaryDepsResult.code !== 0) {
			logger.error(
				`Failed to install necessary tools: ${installNecessaryDepsResult.stderr}`,
			);
			throw new Error("Failed to install necessary tools");
		}
		logger.info("Installed Necessary tools.");
		logger.info("Downloading Caddy public key.");
		const downloadPublicKeyCommand =
			"curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg";
		const downloadPublicKeyResult = await ssh.execCommand(
			downloadPublicKeyCommand,
		);
		if (downloadPublicKeyResult.code !== 0) {
			logger.error(
				`Failed to download Caddy public key: ${downloadPublicKeyResult.stderr}`,
			);
			throw new Error("Failed to download Caddy public key.");
		}
		logger.info("Downloaded Caddy public key.");
		logger.info("Adding Caddy repository.");
		const addCaddyRepositoryCommand =
			"curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list";
		const addCaddyRepositoryResult = await ssh.execCommand(
			addCaddyRepositoryCommand,
		);
		if (addCaddyRepositoryResult.code !== 0) {
			logger.error(
				`Failed to add Caddy repository: ${addCaddyRepositoryResult.stderr}`,
			);
			throw new Error("Failed to add Caddy repository.");
		}
		logger.info("Caddy repository added.");
		logger.info("Installing Caddy.");
		const installCaddyCommand =
			"sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt install -y caddy";
		const installCaddyResult = await ssh.execCommand(installCaddyCommand);
		if (installCaddyResult.code !== 0) {
			logger.error(`Failed to install Caddy: ${installCaddyResult.stderr}`);
			throw new Error("Failed to install Caddy.");
		}
		logger.info("Caddy installed successfully.");
	}
	const remoteCaddyfilePath = "/etc/caddy/Caddyfile";
	logger.info(`Copying Caddyfile to ${remoteCaddyfilePath}.`);
	const caddyfileContent = customCaddyfile
		? await Bun.file(customCaddyfile).text()
		: `
	  :2024
    respond "Hello from Caddy!"
	`;
	const copyCaddyfileCommand = `echo '${caddyfileContent}' | sudo tee ${remoteCaddyfilePath} && caddy fmt --overwrite ${remoteCaddyfilePath}`;
	logCommand(copyCaddyfileCommand);
	const copyResult = await ssh.execCommand(copyCaddyfileCommand);
	if (copyResult.stderr) {
		logger.error(`Failed to copy Caddyfile: ${copyResult.stderr}`);
		throw new Error("Failed to copy Caddyfile.");
	}
	logger.info("Caddyfile copied.");
	logger.info("Checking if Caddy service is running.");
	const checkCaddyStatus = "systemctl is-active caddy";
	logCommand(checkCaddyStatus);
	const caddyStatusResult = await ssh.execCommand(checkCaddyStatus);
	const isCaddyAlreadyRunning = caddyStatusResult.stdout === "active";
	if (isCaddyAlreadyRunning) {
		logger.info("Caddy is already running.");
		logger.info("Reloading Caddy configuration.");
		const reloadCommand = `caddy reload --config ${remoteCaddyfilePath} --adapter caddyfile`;
		logCommand(reloadCommand);
		const reloadResult = await ssh.execCommand(reloadCommand);
		if (
			!reloadResult.stderr.includes("adapted") &&
			!reloadResult.stdout.includes("adapted")
		) {
			logger.error(`Error reloading Caddy: ${reloadResult.stderr}`);
			throw new Error("Error reloading Caddy.");
		}
		logger.info("Caddy configuration reloaded.");
	} else {
		logger.info("Caddy is not already running.");
		logger.info("Starting Caddy service.");
		const startCaddyService =
			"sudo systemctl daemon-reload && sudo systemctl enable --now caddy";
		logCommand(startCaddyService);
		const startCaddyResult = await ssh.execCommand(startCaddyService);
		if (startCaddyResult.stderr) {
			logger.error(`Failed to start Caddy: ${startCaddyResult.stderr}`);
			throw new Error(`Failed to start Caddy service.`);
		}
		logger.info("Caddy service started.");
		logger.info("Checking Caddy service status.");
		const checkCaddyServiceStatus = "systemctl status caddy";
		logCommand(checkCaddyServiceStatus);
		const statusResult = await ssh.execCommand(checkCaddyServiceStatus);
		if (!statusResult.stdout.includes("active (running)")) {
			logger.error(`Caddy service is not running.: ${statusResult.stdout}`);
			throw new Error(`Caddy service is not running.`);
		}
		logger.info("Caddy service is active and running.");
		logger.info("Checking if Caddy is configured to start on boot.");
		const caddyServiceFilePath = "/etc/systemd/system/caddy.service";
		const checkServiceFileCommand = `sudo test -f ${caddyServiceFilePath}`;
		logCommand(checkServiceFileCommand);
		const checkServiceFileResult = await ssh.execCommand(
			checkServiceFileCommand,
		);
		if (checkServiceFileResult.stderr) {
			logger.info("Caddy is not configured no start on boot.");
			logger.info("Configuring Caddy to start on boot.");
			logger.info("Creating Caddy systemd service file.");
			const serviceFileContent = `
        Description=Caddy
        Documentation=https://caddyserver.com/docs/
        After=network.target

        [Service]
        ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
        ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile
        TimeoutStopSec=5s
        LimitNOFILE=1048576
        LimitNPROC=512
        PrivateTmp=true
        ProtectSystem=full
        AmbientCapabilities=CAP_NET_BIND_SERVICE

        [Install]
        WantedBy=multi-user.target
      `;
			const createServiceFileCommand = `echo "${serviceFileContent.trim()}" | sudo tee ${caddyServiceFilePath}`;
			logCommand(createServiceFileCommand);
			const createServiceFileResult = await ssh.execCommand(
				createServiceFileCommand,
			);
			if (createServiceFileResult.stderr) {
				logger.error(
					`Failed to create Caddy service file: ${createServiceFileResult.stderr}`,
				);
				throw new Error("Failed to create Caddy systemd service file.");
			}
			logger.info("Caddy systemd service file created successfully.");
			logger.info("Caddy is now configured to start on boot.");
		}
	}
}
