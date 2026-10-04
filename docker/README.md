# Docker

## Dev (Postgres + app)

From the repo root:

```bash
pnpm docker:dev
```

Same as:

```bash
docker compose -f docker/dev/compose.yaml up --build
```

You get:

- **Next.js** — [http://localhost:3000](http://localhost:3000)
- **Inngest dev** — [http://localhost:8288](http://localhost:8288)
- **React Email preview** — [http://localhost:3001](http://localhost:3001)
- **PostgreSQL** — `localhost:5432` (credentials in `docker/dev/compose.yaml`)

Optional: `.env.local` at the repo root is loaded by Compose when present.

On startup, the app runs **`pnpm db:migrate`** when `DATABASE_URL` is set. To skip it, set `SKIP_DB_MIGRATE=1` on the `app` service.

**New dependencies:** `docker compose -f docker/dev/compose.yaml exec app pnpm install`, or `docker compose ... down -v` and bring the stack up again with `--build`.

## Production image

Build from the repo root:

```bash
pnpm docker:build
```

Run (use your real env/secrets):

```bash
docker run --rm -p 3000:3000 --env-file .env.local indie-kit
```

Uses **Next.js standalone** output. `pnpm` in the image is pinned to match `package.json` → `"packageManager"`.
