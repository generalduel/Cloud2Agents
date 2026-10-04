#!/bin/sh
# Repo is bind-mounted; node_modules is a named volume.
# First start only: copy node_modules from the image, run pnpm once. Later starts: skip install (fast).
# After you change dependencies: docker compose exec app pnpm install   OR   docker compose down -v
set -e
cd /app

if [ -n "$DATABASE_URL" ] && [ "${SKIP_DB_MIGRATE:-0}" != "1" ]; then
  pnpm db:migrate
fi
exec "$@"
