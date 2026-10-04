# syntax=docker.io/docker/dockerfile:1
#
# Production (standalone), Node 24. From repo root:
#   docker build -f docker/prod/Dockerfile -t indie-kit .
#   docker run --rm -p 3000:3000 --env-file .env.local indie-kit
#
# Install runs in the same stage as `next build` (no COPY of node_modules between stages)
# to avoid flaky large cross-stage copies on some Docker engines.

FROM node:24-alpine AS base

RUN apk add --no-cache libc6-compat

FROM base AS builder
WORKDIR /app

# Minimal copy for frozen install (postinstall → fumadocs-mdx)
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
COPY source.config.ts tsconfig.json ./
COPY src/content/docs ./src/content/docs

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate && \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Full tree (.dockerignore skips node_modules; keeps prior install)
COPY . .

COPY .env .env.production

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
