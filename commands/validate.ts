import path from "node:path";
import { type } from "arktype";

const ServersType = type({
	"+": "reject",
	ip: "string",
	port: type("string.integer.parse").to("0 < number.integer <= 65536"),
	user: "string",
});

const HealthcheckType = type({
	"+": "reject",
	path: "string",
	interval: "number.integer > 0",
	timeout: "number.integer > 0",
	retries: "number.integer > 0",
});

const FirewallInboundType = type({
	"+": "reject",
	port: type("number.integer").to("0 < number.integer <= 65536"),
	allow: type("'*'").or(type("string").array()),
});

const FirewallType = type({
	"+": "reject",
	inbound: FirewallInboundType.array(),
});

const ProxyType = type({
	"+": "reject",
	port: type("number.integer").to("0 < number.integer <= 65536"),
	"domains?": type("string").array(),
	"caddyfile?": type("string"),
});

const CiaraConfig = type({
	"+": "reject",
	servers: ServersType.array().atLeastLength(1),
	"env?": "string",
	"healthchecks?": HealthcheckType.array(),
	firewall: FirewallType,
	proxy: ProxyType,
});

export async function validateCommand() {
	const configPath = path.join(process.cwd(), "ciara.config.json");
	const file = Bun.file(configPath);
	const exists = await file.exists();
	if (!exists) {
		console.error("ciara.config.json does not exists.");
		return;
	}
	const text = await file.text();
	const data = CiaraConfig(JSON.parse(text));
	if (data instanceof type.errors) {
		for (const validationError of data) {
			console.log(validationError.message);
		}
		console.error("Invalid configuration.");
		return;
	}
	console.log("Successfully validated configuration");
}
