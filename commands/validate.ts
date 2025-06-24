import path from "node:path";
import { type } from "arktype";
import { logger } from "../utils/logger";

export const ServersType = type({
	"+": "reject",
	ip: "string",
	port: type("string.integer.parse").to("0 < number.integer <= 65536"),
	user: "string",
});

export const SSHType = type({
	"+": "reject",
	privateKeyPath: "string",
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

const ProxyType = type({
	"+": "reject",
	port: type("number.integer").to("0 < number.integer <= 65536"),
	"domains?": type("string").array(),
	"caddyfile?": type("string"),
});

const FirewallType = type({
	"+": "reject",
	inbound: FirewallInboundType.array(),
});

const RebootsType = type({
	"+": "reject",
	enabled: "boolean",
	time: "string",
});

const UpdatesType = type({
	"+": "reject",
	reboots: RebootsType,
});

export const CiaraConfig = type({
	"+": "reject",
	servers: ServersType.array().atLeastLength(1),
	ssh: SSHType,
	"env?": "string",
	"healthchecks?": HealthcheckType.array(),
	proxy: ProxyType,
	firewall: FirewallType,
	updates: UpdatesType,
});

export async function validateCommand() {
	const configPath = path.join(process.cwd(), "ciara.config.json");
	const file = Bun.file(configPath);
	const exists = await file.exists();
	if (!exists) {
		logger.error("ciara.config.json does not exists.");
		return false;
	}
	const text = await file.text();
	const data = CiaraConfig(JSON.parse(text));
	if (data instanceof type.errors) {
		for (const validationError of data) {
			logger.error(validationError.message);
		}
		return false;
	}
	logger.info("Successfully validated configuration");
	return true;
}
