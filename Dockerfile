FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install --production --frozen-lockfile
ENTRYPOINT ["bun", "run", "index.ts"]
CMD []
