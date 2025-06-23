import type { NodeSSH } from "node-ssh";

export async function copyCaddyfileToServer(
	ssh: NodeSSH,
	localCaddyfile: string,
	remoteCaddyFilePath: string,
) {
	console.log(
		`Copying fro local ${localCaddyfile} to remote ${remoteCaddyFilePath}`,
	);
	await ssh.putFile(localCaddyfile, remoteCaddyFilePath);
	console.log("Succesfully copied Caddyfile from local to server");
}
