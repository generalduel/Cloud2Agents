-- Run this BEFORE `pnpm drizzle-kit push` if push fails on app_user.name NOT NULL
-- psql "$DATABASE_URL" -f drizzle/0000_backfill_app_user.sql

UPDATE "app_user"
SET "name" = COALESCE(
  NULLIF(TRIM("name"), ''),
  NULLIF(split_part("email", '@', 1), ''),
  'User'
)
WHERE "name" IS NULL OR TRIM("name") = '';
