-- Better Auth migration from Auth.js schema (existing / drizzle-kit push databases).
-- Do not run drizzle/0000_init.sql against an existing database — it CREATE TABLEs
-- objects that already exist. Use: npx indiekit migrate auth
-- Manual: this file → baseline 0000_init in drizzle.__drizzle_migrations → pnpm db:migrate
--
-- Run: psql "$DATABASE_URL" -f drizzle/upgrades/0000_backfill_app_user.sql
--      psql "$DATABASE_URL" -f drizzle/upgrades/0001_better_auth_migration.sql

-- ── app_user: new columns ──────────────────────────────────────────────────
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
UPDATE "app_user" SET "updatedAt" = COALESCE("createdAt", now()) WHERE "updatedAt" IS NULL;
ALTER TABLE "app_user" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user';
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "banReason" text;
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "banExpires" timestamp;

-- ── app_user: emailVerified timestamp → boolean ───────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_user' AND column_name = 'emailVerified'
      AND data_type IN ('timestamp without time zone', 'timestamp with time zone')
  ) THEN
    ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "emailVerified_new" boolean DEFAULT false NOT NULL;
    UPDATE "app_user" SET "emailVerified_new" = ("emailVerified" IS NOT NULL);
    ALTER TABLE "app_user" DROP COLUMN "emailVerified";
    ALTER TABLE "app_user" RENAME COLUMN "emailVerified_new" TO "emailVerified";
  END IF;
END $$;

-- ── app_user: name NOT NULL ────────────────────────────────────────────────
UPDATE "app_user"
SET "name" = COALESCE(
  NULLIF(TRIM("name"), ''),
  NULLIF(split_part("email", '@', 1), ''),
  'User'
)
WHERE "name" IS NULL OR TRIM("name") = '';

ALTER TABLE "app_user" ALTER COLUMN "name" SET NOT NULL;

-- ── account: Auth.js → Better Auth ───────────────────────────────────────
DROP TABLE IF EXISTS "account_new";

CREATE TABLE "account_new" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  "scope" text,
  "id_token" text,
  "password" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- OAuth accounts from old Auth.js table
INSERT INTO "account_new" (
  "id", "userId", "accountId", "providerId",
  "access_token", "refresh_token", "accessTokenExpiresAt",
  "scope", "id_token", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  "userId",
  "providerAccountId",
  "provider",
  "access_token",
  "refresh_token",
  CASE WHEN "expires_at" IS NOT NULL THEN to_timestamp("expires_at") ELSE NULL END,
  "scope",
  "id_token",
  now(),
  now()
FROM "account"
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'account' AND column_name = 'provider'
);

-- Credential accounts from app_user.password
INSERT INTO "account_new" ("id", "userId", "accountId", "providerId", "password", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "id",
  "id",
  'credential',
  "password",
  COALESCE("createdAt", now()),
  now()
FROM "app_user"
WHERE "password" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "account_new" an
    WHERE an."userId" = "app_user"."id" AND an."providerId" = 'credential'
  );

DROP TABLE IF EXISTS "account";
ALTER TABLE "account_new" RENAME TO "account";

ALTER TABLE "app_user" DROP COLUMN IF EXISTS "password";

-- ── session: Auth.js → Better Auth ─────────────────────────────────────────
DROP TABLE IF EXISTS "session_new";

CREATE TABLE "session_new" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expiresAt" timestamp NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "impersonatedBy" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "session_new" ("id", "userId", "token", "expiresAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "userId",
  "sessionToken",
  "expires",
  now(),
  now()
FROM "session"
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'session' AND column_name = 'sessionToken'
);

DROP TABLE IF EXISTS "session";
ALTER TABLE "session_new" RENAME TO "session";

-- Push-era DBs have verificationToken, not verification (that table is in 0000_init).
CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- ── verification: migrate from verificationToken if it exists ─────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'verificationToken'
  ) THEN
    INSERT INTO "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid()::text,
      "identifier",
      "token",
      "expires",
      now(),
      now()
    FROM "verificationToken"
    ON CONFLICT DO NOTHING;

    DROP TABLE "verificationToken";
  END IF;
END $$;

DROP TABLE IF EXISTS "authenticator";
