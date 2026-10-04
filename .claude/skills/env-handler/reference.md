# Environment Variables Reference

## Files & Purpose

| File | Git Status | Purpose | Content Style |
|------|------------|---------|---------------|
| `.env` | Committed ✅ | **Team shared local dev** | Real shared dev keys and toggles the whole team uses after clone |
| `.env.local` | Ignored 🚫 | **Personal overrides & secrets** | Your machine only — never committed (`.env.*` is gitignored) |
| `.env.example` | Committed ✅ | **Template / documentation** | Placeholders for vars not in `.env`; copy missing keys from here |
| **Production** | Host env (Vercel, etc.) | **Live deployment** | Set in the platform's environment variable UI — not in git |

**Workflow:** shared stuff in `.env` → personal extras in `.env.local` → prod on Vercel (or your host).

## Optional service clients (lazy initialization)

Optional integrations must **not** instantiate SDK clients at module load — otherwise `pnpm build` fails when env vars are unset on a fresh clone.

| Service | Getter | Module | Runtime requirement |
|---------|--------|--------|---------------------|
| Stripe | `getStripe()` | `@/lib/stripe` | `STRIPE_SECRET_KEY` |
| Dodo Payments | `getDodoClient()` | `@/lib/dodopayments/client` | `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_API_URL` |
| S3 | `getS3Client()` | `@/lib/s3/client` | `AWS_REGION` |
| Polar | `getPolar()` | `@/lib/polar/client` | `POLAR_ACCESS_TOKEN` |
| Razorpay | `getRazorpay()` | `@/lib/razorpay/client` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Paddle | `getPaddleClient()` | `@/lib/paddle/client` | `PADDLE_API_KEY` (returns `null` if unset) |
| PostHog (server) | `trackServerEvent()`, `evaluateFeatureFlags()` | `@/lib/analytics` | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`; `POSTHOG_PROJECT_SECRET_API_KEY` for server flag eval |

### Analytics & consent (client)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_COOKIE_CONSENT_ENABLED` | `true` = show banner and gate optional integrations. `false` = auto-grant all categories. |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | **Project token** — PostHog Project API Key (`phc_…`). Frontend events + client feature flags. Empty = PostHog disabled. |
| `POSTHOG_PROJECT_SECRET_API_KEY` | **Project secret API key** — create in [PostHog → Project settings → Project secret API keys](https://us.posthog.com/project/137763/settings/project-secret-api-keys) (`phs_…`). Server capture + feature flag evaluation. Never expose to client. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Server-side PostHog host only. Client uses `/ingest` reverse proxy. |
| `NEXT_PUBLIC_CRISP_WEBSITE_ID` | Master switch for Crisp live chat. |

Call getters **inside** route handlers, server actions, or functions — never at module top level in new code.

## Best Practices

### 1. Variable Naming
-   **Server Secrets**: `UPPER_CASE` (e.g., `STRIPE_SECRET_KEY`)
-   **Public/Client**: Prefix with `NEXT_PUBLIC_` (e.g., `NEXT_PUBLIC_STRIPE_KEY`)

### 2. Security
-   Never commit real API keys to `.env.example`.
-   If you accidentally commit a key, rotate it immediately.

### 3. CI (GitHub Actions)
-   Push/PR builds run only when `github.repository_owner == 'Indie-Kit'`.
-   Forks skip the build job; use **Actions → CI → Run workflow** manually.
-   Configure `CI_*` secrets/vars in the upstream repo for automatic CI.

### 4. Deployment (Vercel)
-   Add `.env.local` values to **Project Settings → Environment Variables** in production.

## Example

**Local development:**

`.env.example` (committed):
```bash
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`.env.local` (git-ignored):
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
STRIPE_SECRET_KEY="sk_test_..."
```
