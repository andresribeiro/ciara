import os from "node:os";
import path from "node:path";

export async function getCaddyfilePath(customCaddyfile: string | undefined) {
	if (customCaddyfile) {
		console.log("Using custom Caddyfile");
		return customCaddyfile;
	} else {
		console.log("No custom Caddyfile provided.");
		console.log("Generating Caddyfile");
		const generatedCaddyFile = `
	  localhost {
			response "Hello, World!"
		}
	`;
		console.log("Caddyfile generated:");
		console.log(generatedCaddyFile);
		console.log("Saving Caddyfile to disk");
		const tempDir = os.tmpdir();
		const tempFilePath = path.join(tempDir, "ciara-caddyfile");
		try {
			await Bun.write(tempFilePath, generatedCaddyFile);
			console.log(`Generated Caddyfile saved on ${tempFilePath}`);
			return generatedCaddyFile;
		} catch {
			console.log(
				`Could not save geneated Caddyfile on ${tempFilePath}, aborting`,
			);
			throw new Error("caddyfile");
		}
	}
}
