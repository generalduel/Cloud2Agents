# Dev image — used by docker/dev/compose.yaml (Next + Inngest + React Email + Postgres)
# Build: docker compose -f docker/dev/compose.yaml build
#
# Install must run after the full tree is present: `postinstall` → `fumadocs-mdx` reads
# source.config.ts and ./src/content/docs (same order as Vercel). Copying only package.json
# first breaks esbuild with "source.config.ts cannot be marked as external".
# Base: Node 24 (bookworm-slim).

FROM node:24-bookworm-slim
ENV CI=1

WORKDIR /app

# Same pnpm as lockfile (package.json packageManager); @latest can ignore overrides → frozen-lockfile mismatch.
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY docker/dev/entrypoint-dev.sh /entrypoint-dev.sh
RUN chmod +x /entrypoint-dev.sh

COPY . .


RUN pnpm install --frozen-lockfile

EXPOSE 3000 8288 3001

ENTRYPOINT ["/entrypoint-dev.sh"]
CMD ["pnpm", "dev:docker"]
