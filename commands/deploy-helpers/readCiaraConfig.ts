import path from "node:path";
import { type } from "arktype";
import { logger } from "../../utils/logger";
import { CiaraConfig } from "../validate";

export async function readCiaraConfig() {
	const configPath = path.join(process.cwd(), "ciara.config.json");
	const file = Bun.file(configPath);
	const exists = await file.exists();
	if (!exists) {
		logger.error("ciara.config.json does not exists.");
		return null;
	}
	const text = await file.text();
	const data = CiaraConfig(JSON.parse(text));
	if (data instanceof type.errors) {
		for (const validationError of data) {
			logger.error(validationError.message);
		}
		return null;
	}
	return data;
}
