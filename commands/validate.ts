import { type } from "arktype";
import { getConfigPath } from "../utils/getConfigPath";
import { logger } from "../utils/logger";

export const ServersType = type({
	"+": "reject",
	ip: "string",
	port: "0 < number.integer <= 65536",
});

const SSHType = type({
	"+": "reject",
	privateKeyPath: "string",
});

export const HealthcheckType = type({
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
	protocols: type("'tcp'").or(type("'udp'")).array(),
});

export const ProxyType = type({
	"+": "reject",
	port: type("number.integer").to("0 < number.integer <= 65536"),
	"domains?": type("string").array(),
	"caddyfile?": type("string"),
});

export const FirewallType = type({
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

const BuilderType = type({
	"+": "reject",
	host: "string",
});

export const CiaraConfig = type({
	"+": "reject",
	appName: "string",
	servers: ServersType.array().atLeastLength(1),
	ssh: SSHType,
	"env?": "string",
	"healthcheck?": HealthcheckType,
	proxy: ProxyType,
	firewall: FirewallType,
	updates: UpdatesType,
	builder: BuilderType,
});

export async function validateCommand() {
	const configPath = getConfigPath();
	const file = Bun.file(configPath);
	const exists = await file.exists();
	if (!exists) {
		logger.error("ciara.config.json does not exists.");
		return false;
	}
	const text = await file.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		logger.error(`Failed to parse ciara.config.json: ${error}`);
		return false;
	}
	const data = CiaraConfig(parsed);
	if (data instanceof type.errors) {
		for (const validationError of data) {
			logger.error(validationError.message);
		}
		return false;
	}
	logger.info("Successfully validated configuration");
	return true;
}
