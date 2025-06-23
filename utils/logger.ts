import pino from "pino";

export const logger = pino({
	base: null,
	transport: {
		target: "pino-pretty",
	},
});

export function logCommand(command: string) {
	logger.info(`Running "${command}"`);
}
