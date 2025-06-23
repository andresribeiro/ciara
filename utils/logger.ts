import pino from "pino";

export const logger = pino({
	base: null,
	transport: {
		target: "pino-pretty",
	},
});
