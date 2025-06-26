import pino from "pino";

export const logger = pino({
	base: null,
	level: "debug",
	transport: {
		target: "pino-pretty",
	},
});
