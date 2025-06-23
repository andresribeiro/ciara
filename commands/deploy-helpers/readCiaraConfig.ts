import path from "node:path";
import { type } from "arktype";
import { CiaraConfig } from "../validate";

export async function readCiaraConfig() {
	const configPath = path.join(process.cwd(), "ciara.config.json");
	const file = Bun.file(configPath);
	const exists = await file.exists();
	if (!exists) {
		console.error("ciara.config.json does not exists.");
		throw new Error("ciara.config.json does not exists.");
	}
	const text = await file.text();
	const data = CiaraConfig(JSON.parse(text));
	if (data instanceof type.errors) {
		for (const validationError of data) {
			console.error(validationError.message);
		}
		throw new Error("Invalid ciara.config.json.");
	}
	return data;
}
