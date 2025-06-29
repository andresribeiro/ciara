import path from "node:path";

export function getConfigPath() {
	return path.join(process.cwd(), "ciara.config.json");
}
