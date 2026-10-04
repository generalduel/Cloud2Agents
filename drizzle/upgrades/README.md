# One-time kit upgrade scripts

These SQL files are **not** run by `pnpm db:migrate`. They target specific version upgrades when `db:migrate` alone is not enough.

## Auth.js → Better Auth

Existing databases were created with `drizzle-kit push`. Do **not** apply `drizzle/0000_init.sql` to them (CREATE TABLE will fail). `db:push` cannot rewrite Auth.js account/session/password data.

**Preferred:**

```bash
npx indiekit migrate auth --apply-patches
```

The CLI runs the upgrade SQL, baselines `0000_init` in `drizzle.__drizzle_migrations`, then `pnpm db:migrate`.

**Manual equivalent** (code already on Better Auth):

```bash
psql "$DATABASE_URL" -f drizzle/upgrades/0000_backfill_app_user.sql
psql "$DATABASE_URL" -f drizzle/upgrades/0001_better_auth_migration.sql
pnpm db:migrate
```

After 0001, `pnpm db:migrate` baselines `0000_init` instead of executing it.

Fresh projects (empty database):

```bash
pnpm db:migrate
```

General Drizzle workflow: `.cursor/commands/db-migrate.md`
