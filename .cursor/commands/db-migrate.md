---
name: db-migrate
description: Run, generate, or troubleshoot Drizzle database migrations. Use after pulling kit updates, changing src/db/schema, or when migrate/push fails.
argument-hint: [apply | generate | status | troubleshoot]
---

# Database Migration Command

You are the database migration operator for Indie Kit. Follow this workflow exactly. Use **pnpm** for all commands (see `.cursor/rules/use-pnpm.mdc`).

## Quick reference

| Goal | Command |
|------|---------|
| Apply pending migrations (kit user after `git pull`) | `pnpm db:migrate` |
| Generate migration after schema change (maintainer) | `pnpm db:generate` |
| Prototype schema only (solo dev, **not** for kit releases) | `pnpm db:push` |
| Skip auto-migrate on dev start | `SKIP_DB_MIGRATE=1 pnpm dev` |
| Skip auto-migrate in Docker | `SKIP_DB_MIGRATE=1` on the `app` service |

---

## Phase 0: Detect mode

Parse `$ARGUMENTS` (default: `apply`).

| Mode | When |
|------|------|
| `apply` | User pulled changes, app fails on DB columns/tables, or routine post-pull sync |
| `generate` | You or the user changed files under `src/db/schema/` |
| `status` | Check what Drizzle thinks is applied vs pending |
| `troubleshoot` | `db:migrate` or `db:push` failed |

If unclear, ask once: **"Apply pending migrations, or generate a new one after schema changes?"**

---

## Phase 1: Preconditions (all modes)

Run these checks before touching the database:

1. **Env loaded** — `DATABASE_URL` must be set. Indie Kit loads, in order:
   - `.env`
   - `.env.local` (overrides; typical for local Neon/dev DB)
   - `drizzle.config.ts` reads both via dotenv

2. **Never commit secrets** — do not add `.env` / `.env.local` to git.

3. **Confirm DB reachable** (apply/troubleshoot only):
   ```bash
   cd /path/to/indie-kit && set -a && source .env 2>/dev/null; source .env.local 2>/dev/null; set +a
   psql "$DATABASE_URL" -c "SELECT 1"
   ```
   If `psql` is unavailable, skip and rely on `pnpm db:migrate` output.

4. **Kit vs customized project** — if the user added their own tables/columns, warn that kit migrations only cover `src/db/schema/`. Custom schema may need manual merge.

---

## Phase 2: Apply migrations (`apply`)

**Audience:** Kit users who pulled upstream changes.

### Step 2.1 — Run migrate

```bash
pnpm db:migrate
```

Equivalent to `drizzle-kit migrate` with project config (`drizzle.config.ts`, folder `./drizzle`).

### Step 2.2 — What happens under the hood

1. Drizzle reads `drizzle/**/*.sql` in journal order (`drizzle/meta/_journal.json`)
2. Connects to DB, reads `drizzle.__drizzle_migrations`
3. Runs only **pending** SQL files
4. Logs each applied migration (idempotent — safe to run twice)

### Step 2.3 — Dev vs migrate

- `pnpm dev` does **not** run migrations
- Apply schema with `pnpm db:migrate` when you intend to
- Docker dev entrypoint (`docker/dev/entrypoint-dev.sh`) still runs migrate when `DATABASE_URL` is set; `SKIP_DB_MIGRATE=1` bypasses Docker only

### Step 2.4 — Verify

```bash
pnpm db:migrate   # should print success with no pending migrations
pnpm build        # optional; catches type errors from schema drift
```

Ask the user to smoke-test the feature that required the migration (e.g. sign-in after auth schema change).

### Step 2.5 — Report to user

```
✅ Migrations applied.

Next:
- pnpm db:migrate    (when you want schema applied)
- pnpm dev
- Or: SKIP_DB_MIGRATE=1 pnpm dev   (skip migrate)

If something still breaks, run this command with: troubleshoot
```

---

## Phase 3: Generate migration (`generate`)

**Audience:** Maintainers shipping schema changes to kit users.

### Step 3.1 — Schema change rules

Before generating, ensure schema edits follow `.claude/skills/db-handler/SKILL.md`:

- New tables → `src/db/schema/{domain}.ts`
- FK columns → add indexes
- JSONB → Zod `$type<...>`
- Prefer nullable columns or defaults; avoid breaking drops without explicit user approval

### Step 3.2 — Generate SQL + journal

```bash
pnpm db:generate
# Optional name: pnpm db:generate --name=add_widgets_table
```

This creates:

```
drizzle/
  meta/
    _journal.json      # migration order (COMMIT THIS)
  000X_<name>.sql      # generated SQL (COMMIT THIS)
```

### Step 3.3 — Data migrations (critical)

`drizzle-kit generate` only diffs **schema**. It does **not**:

- Backfill NULL values before `NOT NULL`
- Transform column types with data (e.g. `timestamp` → `boolean`)
- Move `password` from `app_user` → `account`

When a kit upgrade needs data transforms:

1. Run `pnpm db:generate` for structural changes
2. **Edit** the generated `.sql` and add idempotent data steps, e.g.:
   ```sql
   UPDATE "app_user" SET "name" = split_part("email", '@', 1) WHERE "name" IS NULL;
   ```
3. Use `IF NOT EXISTS` / `DO $$ ... $$` blocks for re-runnable scripts
4. Document one-time manual steps in the SQL file header (see `drizzle/upgrades/0001_better_auth_migration.sql`)

### Step 3.4 — Test locally before shipping

```bash
# Fresh check on a copy or local DB
pnpm db:migrate
pnpm dev
```

### Step 3.5 — Commit checklist

Commit **all** of:

- [ ] `src/db/schema/**` changes
- [ ] `drizzle/*.sql` (new/updated)
- [ ] `drizzle/meta/_journal.json`
- [ ] Any app code that depends on the new schema

**Never** commit only schema TS without the matching `drizzle/` files — kit users will drift.

### Step 3.6 — Remind kit users (release notes)

```md
## After pulling this update

pnpm install
pnpm dev    # migrations run automatically

# Or manually:
pnpm db:migrate
```

---

## Phase 4: Status (`status`)

Run:

```bash
ls -la drizzle/
ls -la drizzle/meta/ 2>/dev/null || echo "No meta journal yet"
```

Then:

```bash
psql "$DATABASE_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;"
```

If the table does not exist, no migrate has ever run (or push-only workflow was used).

Interpret:

| State | Meaning |
|-------|---------|
| Journal files > applied rows | Pending migrations — run `pnpm db:migrate` |
| Equal counts | Up to date |
| Manual SQL run outside Drizzle | May need to baseline journal (troubleshoot) |

---

## Phase 5: Troubleshoot (`troubleshoot`)

Work through in order. Stop when fixed.

### 5.1 — `DATABASE_URL` missing

```
Error: connection string undefined
```

Fix: Add `DATABASE_URL` to `.env` or `.env.local`.

### 5.2 — `column contains null values` (NOT NULL)

```
column "name" of relation "app_user" contains null values
```

Fix pattern:

1. Backfill: `UPDATE "app_user" SET "name" = ... WHERE "name" IS NULL;`
2. Put backfill in a migration SQL file **before** `SET NOT NULL`
3. Run `pnpm db:migrate`

See `drizzle/upgrades/0000_backfill_app_user.sql`.

### 5.3 — `drizzle-kit push` prompts / TTY

Non-interactive environments need:

```bash
pnpm db:push   # uses --force in script
```

**Prefer `db:migrate` for kit users** — push is for solo prototyping only.

### 5.4 — Schema drift (push vs migrate mixed)

Symptoms: migrate says nothing pending but app expects new columns.

1. Compare `src/db/schema/` to live DB: `pnpm exec drizzle-kit push --force` **only** if user accepts push semantics (can drop extra columns)
2. Long-term: standardize on `generate` + `migrate` only

### 5.5 — Auth.js → Better Auth upgrade

Use **`npx indiekit migrate auth --apply-patches`**. The CLI runs upgrade SQL, baselines `0000_init` (push-era DBs have no journal), then `pnpm db:migrate`.

Do **not** apply `drizzle/0000_init.sql` to an existing database. Do **not** use `db:push` for this upgrade (it cannot move passwords / rename session columns).

- **Existing Auth.js DB:** CLI, or `0000_backfill` → `0001_better_auth_migration.sql` → `pnpm db:migrate`
- **Fresh project:** only `pnpm db:migrate`

See `drizzle/upgrades/README.md` and `.cursor/commands/migrate-to-better-auth.md` Phase 7.

### 5.6 — Docker migrate fails

- Confirm `DATABASE_URL` in compose points at `postgres` service
- `docker compose exec app pnpm db:migrate`
- Skip: `SKIP_DB_MIGRATE=1 docker compose ... up`

### 5.7 — Production (Vercel / Railway / Docker prod)

- **Do not** rely on a `predev` hook in production
- Run `pnpm db:migrate` in deploy pipeline **before** `pnpm build` / container start
- Docker prod pattern: `pnpm db:migrate && node server.js`
- Avoid migrate on every serverless cold start (race risk with multiple instances)

---

## Phase 6: push vs migrate (decision table)

| | `db:migrate` | `db:push` |
|---|-------------|-----------|
| Kit releases | ✅ Required | ❌ |
| Version history | ✅ `drizzle/` + journal | ❌ |
| Data backfills | ✅ Edit SQL files | ❌ |
| Solo throwaway prototype | OK | ✅ Faster |
| Production | ✅ | ❌ Risky |

---

## Phase 7: File map

| File | Role |
|------|------|
| `drizzle.config.ts` | Drizzle Kit config (`schema`, `out`, `DATABASE_URL`) |
| `drizzle/meta/_journal.json` | Ordered migration index |
| `drizzle/*.sql` | Versioned migration SQL (auto via `db:migrate`) |
| `drizzle/upgrades/` | One-time version upgrade SQL (manual `psql -f`) |
| `src/db/schema/` | Source of truth for ORM |
| `package.json` | `db:migrate`, `db:generate`, `db:push` |
| `docker/dev/entrypoint-dev.sh` | Auto-migrate in Docker dev |
| `scripts/db-migrate.ts` | Env bootstrap + migrate runner |

---

## Agent rules

When this command completes schema work:

1. **Never** tell users to only run `drizzle-kit push` for kit upgrades — always `pnpm db:migrate` (existing Auth.js DBs: `npx indiekit migrate auth` first)
2. **Always** commit `drizzle/` when changing `src/db/schema/` for kit releases
3. After schema edits, run or instruct `pnpm db:generate` then review SQL before commit
2. **Always** commit `drizzle/` when changing `src/db/schema/` for kit releases
3. After schema edits, run or instruct `pnpm db:generate` then review SQL before commit
4. For destructive changes, get explicit user confirmation
5. Refer schema patterns to `.claude/skills/db-handler/SKILL.md`
