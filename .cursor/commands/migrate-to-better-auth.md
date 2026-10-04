---
name: migrate-to-better-auth
description: Full Auth.js (NextAuth v5) → Better Auth migration for Indie Kit. Code, env, database, UI, impersonation, and verification.
argument-hint: [analyze | migrate | database | verify | troubleshoot]
---

# Auth.js → Better Auth Migration (Indie Kit)

You are migrating an Indie Kit project from **Auth.js / NextAuth v5** to **Better Auth**. Follow every phase in order. Use **pnpm** (`.cursor/rules/use-pnpm.mdc`).

**Official guide:** https://www.better-auth.com/docs/guides/next-auth-migration

**Indie Kit reference (already migrated):** compare against current `src/auth.ts`, `src/db/schema/user.ts`, `src/lib/auth-client.ts`.

**Toolkit:** If `.agents/MIGRATION-MANIFEST.md` exists (from `npx indiekit migrate auth`), read it first — full phase map, B2B scope, and post-patch verification.

---

| User situation | Start at |
|----------------|----------|
| Still on NextAuth after `indiekit migrate auth` | Phase 0.5 (apply patches) → end |
| Still on NextAuth, just pulled kit update | Phase 1 → end |
| DB errors after code pull | Phase 7 (database) |
| Magic link 500 / `app_user` not found | Phase 3.3 + Phase 10 |
| Sign-in works but redirect wrong | Phase 4.3 |
| Only checking what's left | Phase 0 (`analyze`) |

Parse `$ARGUMENTS` (default: run full migration from Phase 0.5 if patches exist, else Phase 1). **Never ask the user to run `--apply-patches` — you do that.**

---

## Phase 0: Analyze (`analyze`)

Scan the repo and report a checklist before changing anything.

### 0.1 — Detect Auth.js remnants

Search for:

```
next-auth
@auth/drizzle-adapter
@auth/core
getServerSession
signIn(
signOut(
useSession
SessionProvider
NEXTAUTH_URL
NEXTAUTH_SECRET
api/auth/[...nextauth]
```

### 0.2 — Detect Better Auth presence

Confirm these exist (target state):

| File | Purpose |
|------|---------|
| `src/auth.ts` | `betterAuth()` server config |
| `src/lib/auth-client.ts` | `createAuthClient()` |
| `src/app/api/auth/[...all]/route.ts` | `toNextJsHandler(auth)` |
| `src/db/schema/user.ts` | `app_user`, `session`, `account`, `verification` |

### 0.3 — Database state

```bash
psql "$DATABASE_URL" -c "\d app_user"
psql "$DATABASE_URL" -c "\d account"
psql "$DATABASE_URL" -c "\d session"
```

| Column/table signal | Meaning |
|---------------------|---------|
| `app_user.password` exists | Pre-migration Auth.js |
| `account.provider` column | Auth.js account table |
| `session.sessionToken` | Auth.js session table |
| `account.providerId` | Better Auth account table |
| `session.token` | Better Auth session table |

### 0.4 — Output analysis report

Print: ✅ done / ❌ missing / ⚠️ partial for each phase below. Then proceed or ask user to confirm.

---

## Phase 0.5: Apply mechanical patches (CLI migration only)

Skip if no `.agents/patches/` or `package.json` already has `better-auth`.

Read `.agents/MIGRATION-MANIFEST.md`, then follow `/apply-auth-patches` (`001-deps` → `002-migration` → `pnpm install`). On failure: `/resolve-patch-conflicts`. Re-run Phase 0 analyze. Phases 1–6 become verify-only; **always run Phases 7–8 and 11–12**.

---

### 1.1 — Install / remove packages

```bash
pnpm remove next-auth @auth/drizzle-adapter bcryptjs
pnpm add better-auth
```

Keep `drizzle-orm` and `postgres` / `@neondatabase/serverless` as-is.

### 1.2 — Verify `package.json`

- `better-auth` in `dependencies`
- No `next-auth`, `@auth/drizzle-adapter`, `bcryptjs`

---

## Phase 2: Database schema (`src/db/schema/user.ts`)

Replace Auth.js Drizzle schema with Better Auth tables.

### 2.1 — `app_user` (was `users` with password)

**Remove:** `password` column  
**Add:** `emailVerified` (boolean), `updatedAt`, `role`, `banned`, `banReason`, `banExpires`  
**Keep:** all Indie Kit billing/credits columns (`planId`, `credits`, `stripeCustomerId`, etc.)

```typescript
export const users = pgTable("app_user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires", { mode: "date" }),
  // ... existing Indie Kit columns unchanged
});
```

### 2.2 — `session` (Better Auth format)

```typescript
export const sessions = pgTable("session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  impersonatedBy: text("impersonatedBy"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
```

### 2.3 — `account` (Better Auth format)

```typescript
export const accounts = pgTable("account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),  // credential provider hashes live here
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
```

### 2.4 — `verification`

```typescript
export const verifications = pgTable("verification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
```

**Do not** run `db:push` yet — data migration required first (Phase 7).

---

## Phase 3: Auth core

### 3.1 — Create `src/auth.ts`

Use `betterAuth()` with:

- `drizzleAdapter(db, { provider: "pg", schema: { ... } })`
- `user.modelName: "app_user"` + `additionalFields` for Indie Kit columns
- `emailAndPassword` when `appConfig.auth?.enablePasswordAuth`
- `socialProviders.google` when `NEXT_PUBLIC_SIGNIN_ENABLED=true`
- `magicLink` plugin (send via existing `sendMail` + `MagicLinkEmail`)
- `admin` plugin (impersonation)
- `nextCookies()` plugin
- `databaseHooks.user.create.after` → `onUserCreate` + admin role for `SUPER_ADMIN_EMAILS`

Export session type:

```typescript
export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
```

### 3.2 — CRITICAL: Drizzle adapter schema keys

When `user.modelName` is `"app_user"`, adapter schema **must** use that key:

```typescript
database: drizzleAdapter(db, {
  provider: "pg",
  schema: {
    app_user: users,   // NOT `user: users`
    session: sessions,
    account: accounts,
    verification: verifications,
  },
}),
```

Wrong key → `The model "app_user" was not found in the schema object` on magic-link verify.

### 3.3 — Create `src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/react";
import { magicLinkClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), adminClient()],
});
```

### 3.4 — API route

**Delete:** `src/app/api/auth/[...nextauth]/route.ts`  
**Create:** `src/app/api/auth/[...all]/route.ts`

```typescript
import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### 3.5 — Delete legacy auth files

Remove if present (Better Auth replaces them natively):

```
src/lib/auth/session.ts
src/lib/auth/password.ts
src/app/api/auth/signup-request/
src/app/api/auth/complete-signup/
src/app/api/auth/reset-password-request/
src/app/api/auth/reset-password-confirm/
src/app/(auth)/sign-up/set-password/
src/components/auth/SignUpEmail.tsx
```

---

## Phase 4: Route protection & redirects

### 4.1 — `src/proxy.ts`

Replace NextAuth session with:

```typescript
const session = await auth.api.getSession({ headers: req.headers });
const isAuth = !!session?.user;
```

Keep existing matcher paths. Super-admin still checks `SUPER_ADMIN_EMAILS` at runtime.

### 4.2 — `src/lib/auth/withAuthRequired.ts`

```typescript
const session = await auth.api.getSession({ headers: req.headers });
if (!session?.user?.id || !session.user.email) { /* 401 */ }
```

Use `AuthSession` type from `@/auth`. No custom `Session` interface.

### 4.3 — Callback URL preservation

**Problem:** bare `redirect("/sign-in")` drops return URL after login.

**Fix:** use `src/lib/auth/redirect-to-sign-in.ts`:

```typescript
export function buildCallbackUrl(pathname, searchParams?) { ... }
export function redirectToSignIn(callbackUrl = "/app"): never {
  redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
```

Update server pages that gate on auth:

- `src/app/(in-app)/app/credits/buy/page.tsx`
- `src/app/(in-app)/app/subscribe/page.tsx`
- `src/app/(in-app)/app/credits/history/page.tsx`

Pattern:

```typescript
if (!session?.user?.email) {
  redirectToSignIn(buildCallbackUrl("/app/credits/buy", params));
}
```

### 4.4 — Client forms

`src/components/auth/auth-form.tsx` must pass `callbackURL` to Better Auth:

```typescript
const getCallbackUrl = () => callbackUrl || searchParams?.get("callbackUrl") || "/app";

authClient.signIn.social({ provider: "google", callbackURL: getCallbackUrl() });
authClient.signIn.email({ email, password, callbackURL: getCallbackUrl() });
authClient.signIn.magicLink({ email, callbackURL: getCallbackUrl() });
```

---

## Phase 5: UI & API consumer updates

### 5.1 — Sign-in / sign-up / reset

| Component | Better Auth API |
|-----------|-----------------|
| `auth-form.tsx` | `authClient.signIn.social/email/magicLink` |
| `signup-form.tsx` | `authClient.signUp.email` |
| `reset-password-form.tsx` | `authClient.requestPasswordReset` |
| `reset-password-confirm-form.tsx` | `authClient.resetPassword` |
| `sign-out/page.tsx` | `authClient.signOut` |

**Never** use `useSession` from `next-auth/react`. Use `useUser()` (SWR) on the client.

### 5.2 — Server pages

```typescript
import { auth } from "@/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
```

### 5.3 — Impersonation

`src/app/api/super-admin/users/[id]/impersonate/route.ts`:

```typescript
const response = await auth.api.impersonateUser({
  body: { userId: id },
  headers: req.headers,
  asResponse: true,
});
// Forward Set-Cookie headers from response
```

Requires `admin` plugin in `auth.ts`.

### 5.4 — Providers

Remove `SessionProvider` from app layout if present. Better Auth uses cookies via `nextCookies()` — no client provider wrapper needed.

---

## Phase 6: Environment variables

### 6.1 — Replace in `.env` / `.env.local`

| Remove | Add |
|--------|-----|
| `NEXTAUTH_URL` | `BETTER_AUTH_URL` (same value as `NEXT_PUBLIC_APP_URL`) |
| `NEXTAUTH_SECRET` | `BETTER_AUTH_SECRET` |

If user has existing `AUTH_SECRET`, reuse it:

```bash
# .env.local
BETTER_AUTH_SECRET="${AUTH_SECRET}"
BETTER_AUTH_URL="${NEXT_PUBLIC_APP_URL}"
```

Generate new secret if none exists:

```bash
openssl rand -base64 32
```

### 6.2 — Keep unchanged

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SUPER_ADMIN_EMAILS
NEXT_PUBLIC_SIGNIN_ENABLED
DATABASE_URL
```

### 6.3 — Remove legacy session layers

Delete unused Auth.js-era helpers (no callers after Better Auth migration):

- `src/lib/session/index.ts` (iron-session)
- `src/lib/encryption/edge-jwt.ts` (signup/reset tokens — Better Auth handles natively)
- Remove `iron-session` from `package.json`, `SESSION_SECRET` and `AUTH_SECRET` from `.env.example` / CI / docker
- `002-migration.patch` removes `src/lib/session` and `edge-jwt`
- Only `BETTER_AUTH_SECRET` is required — see [session management](https://better-auth.com/docs/concepts/session-management)

### 6.4 — Update `.env.example` and CI

`.env.example` → Better Auth vars  
`.github/workflows/ci.yml` → `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

---

## Phase 7: Database migration (`database`)

Existing kit databases were created with `drizzle-kit push` and have **no** `drizzle.__drizzle_migrations` history. `drizzle/0000_init.sql` is a full-schema CREATE for **fresh** databases only — applying it to an existing DB fails with "already exists".

**Preferred:** let the CLI do SQL + baseline + migrate:

```bash
npx indiekit migrate auth --apply-patches
# DATABASE_URL set → runs upgrades, baselines 0000_init, then pnpm db:migrate
# Opt out: --skip-db
```

`db:push` cannot move passwords or rename `sessionToken` → `token`. Do not use it as the Auth.js upgrade path.

### 7.1 — CLI (existing Auth.js database)

Runs, in order:

1. `drizzle/upgrades/0000_backfill_app_user.sql`
2. `drizzle/upgrades/0001_better_auth_migration.sql` (creates `verification` if missing, rewrites account/session)
3. Insert `0000_init` hash into `drizzle.__drizzle_migrations` so `pnpm db:migrate` will not re-CREATE tables
4. `pnpm db:migrate`

### 7.2 — Manual equivalent

```bash
psql "$DATABASE_URL" -f drizzle/upgrades/0000_backfill_app_user.sql
psql "$DATABASE_URL" -f drizzle/upgrades/0001_better_auth_migration.sql
pnpm db:migrate
```

`pnpm db:migrate` now refuses Auth.js-shaped DBs (points at the CLI). After 0001, it baselines `0000_init` when `account.providerId` already exists.

`0001` does:

- Adds Better Auth columns to `app_user`
- Converts `emailVerified` timestamp → boolean
- Migrates `account` (OAuth + credential passwords)
- Migrates `session` (`sessionToken` → `token`)
- Creates `verification` if needed and moves `verificationToken`
- Drops `app_user.password`, `authenticator`

### 7.3 — Set admin roles (optional)

Users in `SUPER_ADMIN_EMAILS` get `role = 'admin'` on **next sign-up** via hook. For existing users:

```sql
UPDATE "app_user" SET "role" = 'admin'
WHERE "email" IN ('admin@example.com');
```

### 7.4 — Fresh project (no Auth.js data)

Skip upgrades. Only:

```bash
pnpm db:migrate
```

---

## Phase 8: Verification (`verify`)

Run checklist — all must pass:

### 8.1 — Build

```bash
pnpm build
```

### 8.2 — Auth flows (manual)

- [ ] Magic link sign-in → lands on `callbackUrl` (e.g. `/app/credits/buy`)
- [ ] Google OAuth (if `GOOGLE_CLIENT_*` set)
- [ ] Email/password sign-in (if `enablePasswordAuth`)
- [ ] Sign-up with email
- [ ] Reset password email + confirm
- [ ] Sign-out
- [ ] Super-admin impersonation
- [ ] Protected API `GET /api/app/me` returns 200 when logged in

### 8.3 — Session shape

`session.user` should include Indie Kit fields via `additionalFields` + DB join in `getUser()`.

### 8.4 — No NextAuth remnants

```bash
rg "next-auth|NEXTAUTH|getServerSession|SessionProvider" src/
```

Should return zero hits (except marketing copy if any).

---

## Phase 9: Troubleshoot (`troubleshoot`)

| Error | Fix |
|-------|-----|
| `model "app_user" was not found in schema object` | Phase 3.2 — use `app_user: users` in drizzle adapter |
| `column "name" contains null values` | Phase 7.1 backfill SQL |
| Magic link 500 on verify | Phase 3.2 + Phase 7.2 |
| `INVALID_TOKEN` on magic link | Token expired (5 min) or wrong `BETTER_AUTH_SECRET` |
| Google warn: missing clientId | Set `GOOGLE_CLIENT_ID/SECRET` or ignore if magic-link only |
| Users logged out after migration | Expected — Auth.js sessions don't carry over; users re-login |
| Password login fails | Confirm credential row in `account` with `providerId = 'credential'`. **Existing bcrypt hashes from Auth.js do not work** — Better Auth uses scrypt; users must use reset-password |
| `callbackUrl` lost | Phase 4.3 |
| `BETTER_AUTH_SECRET` undefined | Phase 6.1 |

---

## Phase 10: What NOT to do

- ❌ Keep custom NextAuth API routes alongside Better Auth
- ❌ Custom `Session` type with manual `impersonatedBy` casting — use `AuthSession`
- ❌ `bcryptjs` for passwords — Better Auth uses scrypt by default
- ❌ `user: users` in drizzle adapter when `modelName: "app_user"`
- ❌ Skip data migration SQL on existing databases
- ❌ Tell users to only `db:push` — use upgrade SQL + `db:migrate`

---

## Phase 11: Stale agent docs

Grep agent directories for leftover Auth.js instructions. These files are **not** patched — they keep teaching NextAuth after the code has moved.

```bash
rg -n "next-auth|NextAuth|NEXTAUTH_|Auth\\.js" .cursor .claude .agent .windsurf --glob '!**/patches/**' --glob '!**/migrate-to-better-auth.md' --glob '!**/better-auth.mdc'
```

Rewrite what you find:

- `DATABASE_MODELS_AND_AUTH` in `core-rules` → Better Auth + `auth.api.getSession`
- `skills/auth-handler/SKILL.md` and `reference.md` → Better Auth patterns
- `next-search-params-shell` — remove deleted `sign-up/set-password` references
- `features.tsx` marketing badge → Better Auth (not NextAuth)
- `copywriter` skill → Better Auth (not Auth.js)
- `security-manager` — Better Auth / `useUser` (not NextAuth providers)

Do **not** overwrite unrelated user rules. Only replace Auth.js-specific sentences.

---

## File map (target state)

| File | Role |
|------|------|
| `src/auth.ts` | Better Auth server |
| `src/lib/auth-client.ts` | Better Auth client |
| `src/app/api/auth/[...all]/route.ts` | Auth API handler |
| `src/db/schema/user.ts` | Better Auth + Indie Kit user schema |
| `src/proxy.ts` | Cookie session via `auth.api.getSession` |
| `src/lib/auth/withAuthRequired.ts` | API route guard |
| `src/lib/auth/redirect-to-sign-in.ts` | callbackUrl helper |
| `drizzle/upgrades/0000_backfill_app_user.sql` | Pre-migration backfill |
| `drizzle/upgrades/0001_better_auth_migration.sql` | Auth.js → Better Auth data migration |
| `.env.example` | `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` |

---

## Agent execution order

When running full migration (`migrate`):

1. Phase 0 — analyze (report)
2. Phase 1 — dependencies
3. Phase 2 — schema TS
4. Phase 3 — auth core + delete legacy
5. Phase 4 — proxy, guards, callbacks
6. Phase 5 — UI consumers
7. Phase 6 — env
8. Phase 7 — database SQL + migrate
9. Phase 8 — verify build + smoke test
10. Phase 11 — rewrite leftover NextAuth instructions in agent rules/skills
11. Report summary with anything still manual (Google OAuth keys, admin role SQL)

For DB-only issues after code is updated: start at **Phase 7**.  
For general Drizzle workflow: `.cursor/commands/db-migrate.md`.
