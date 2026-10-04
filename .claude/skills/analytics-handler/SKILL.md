---
name: analytics-handler
description: Manage PostHog setup, client/server event tracking, feature flags, and adding or swapping analytics providers.
tools: Read, Write, Edit
model: inherit
---

# Analytics Handler

PostHog is **optional**, **consent-gated**, and **abstracted** behind `@/lib/analytics` for server events. See `cookie-consent-handler` for consent framework.

## Enable PostHog (full setup checklist)

### 1. Environment

`.env.local`:

```bash
NEXT_PUBLIC_COOKIE_CONSENT_ENABLED=true   # recommended for EU
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_…   # Project token (public)
POSTHOG_PROJECT_SECRET_API_KEY=phs_…      # Project secret API key — create in PostHog settings (link below)
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # posthog-node host only
```

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | **Project token** — Project API Key (`phc_…`). Frontend events + client feature flags via `/ingest`. |
| `POSTHOG_PROJECT_SECRET_API_KEY` | **Project secret API key** — create in [PostHog → Project settings → Project secret API keys](https://us.posthog.com/project/137763/settings/project-secret-api-keys) (`phs_…`). Server capture + feature flag evaluation. Never expose to client. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Server SDK host only; client uses `/ingest` proxy |
| `NEXT_PUBLIC_COOKIE_CONSENT_ENABLED` | When `true`, PostHog loads only after Analytics consent |

### 2. Dependencies

Already in `package.json`: `posthog-js`, `posthog-node`. Install with `pnpm add posthog-js posthog-node` if missing.

### 3. Reverse proxy (`next.config.ts`)

Required so ad blockers don't block analytics:

```typescript
skipTrailingSlashRedirect: true,
async rewrites() {
  return [
    { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
    { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    { source: "/ingest/decide", destination: "https://us.i.posthog.com/decide" },
  ];
},
```

EU project? Swap destinations to `eu.i.posthog.com` / `eu-assets.i.posthog.com`.

### 4. Providers wiring

Already in `src/app/Providers.tsx`:

```tsx
<CookieConsentProvider>
  <ConditionalPostHog>
    {children}
    <CookieConsentBanner />
  </ConditionalPostHog>
</CookieConsentProvider>
```

### 5. Verify

1. Clear `cookie_consent` → accept Analytics → check Network tab for `/ingest` requests
2. Sign in → PostHog person identified (`posthog-provider.tsx`)
3. Navigate → `$pageview` events (`posthog-page-view.tsx`)
4. Trigger webhook → server event in PostHog Live Events

## File map

```
src/components/analytics/
├── posthog-provider.tsx    # ConditionalPostHog, identify/reset
└── posthog-page-view.tsx   # manual $pageview on route change

src/lib/analytics/
├── index.ts                # public exports
├── server.ts               # trackServerEvent + typed helpers + Analytics namespace
├── feature-flags.ts        # evaluateFeatureFlags / isFeatureEnabled (server)
├── feature-flags-client.ts # useFeatureFlag hooks (client-only)
├── types.ts                # event property interfaces
└── providers/
    ├── posthog-client.ts   # shared posthog-node singleton
    ├── posthog.ts          # PostHog server capture (internal)
    └── posthog-flags.ts    # evaluateFlags wrapper (internal)

src/lib/posthog/server.ts   # @deprecated shim → use @/lib/analytics
```

**App code imports `@/lib/analytics` or `usePostHog` from `posthog-provider` — never `posthog-node` directly.**

## Manage PostHog (day-to-day)

### Client init (only after consent)

Inside `PostHogInnerProvider`:

```typescript
posthog.init(key, {
  api_host: "/ingest",              // NOT NEXT_PUBLIC_POSTHOG_HOST
  ui_host: "https://us.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: false,          // manual via posthog-page-view.tsx
  capture_pageleave: true,
});
```

### Identify users

Handled in `posthog-provider.tsx` via `useUser()`:
- Signed in → `posthog.identify(user.id, { email, name, role })`
- Signed out → `posthog.reset()`

**Indie Kit:** `distinctId` = `user.id`

**B2B Kit:** also calls `posthog.group("organization", org.id, { name, plan })`, passes `organizationId` in identify traits, and calls `posthog.reloadFeatureFlags()` when the active organization changes.

### Feature flags (client)

Import from `posthog-provider` (consent-safe wrappers):

```tsx
import {
  useFeatureFlag,
  useFeatureFlagVariant,
  useFeatureFlagPayload,
} from "@/components/analytics/posthog-provider";

const showBeta = useFeatureFlag("beta-dashboard", false);
const variant = useFeatureFlagVariant("pricing-test");
const payload = useFeatureFlagPayload("pricing-test"); // pair with enabled/variant hook
```

When PostHog is disabled or Analytics consent is denied, hooks return explicit defaults (`false` / `undefined`).

**UI toggles:** use client hooks only. **API authorization gates:** use server evaluation (below).

### Feature flags (server)

Call **once per request** inside auth wrappers — reuse the snapshot for multiple flags:

```typescript
import { evaluateFeatureFlags, isFeatureEnabled } from "@/lib/analytics";

// Preferred: one eval, many reads
const flags = await evaluateFeatureFlags({
  distinctId: user.id,
  flagKeys: ["beta-api", "new-export"],
  personProperties: { email: user.email, role: user.role },
});
const beta = flags?.isEnabled("beta-api", false) ?? false;

// Single flag shortcut (still one network call)
const enabled = await isFeatureEnabled("beta-api", {
  distinctId: user.id,
  flagKeys: ["beta-api"],
}, false);
```

**B2B Kit:** pass organization context for org-targeted flags (PostHog UI → Target by → `organization`):

```typescript
const flags = await evaluateFeatureFlags({
  distinctId: user.id,
  organizationId: org.id,
  organizationProperties: { name: org.name, plan: org.plan?.codename ?? "" },
  personProperties: { email: user.email, role: user.role },
  flagKeys: ["org-beta-feature"],
});
```

**Performance:** never call `isFeatureEnabled()` in a loop — use `evaluateFeatureFlags()` + snapshot. Pass `flagKeys` to narrow evaluation.

### Track UI events

```tsx
import { usePostHog } from "@/components/analytics/posthog-provider";

const posthog = usePostHog();
if (posthog) {
  posthog.capture("feature_used", { feature_name: "export" });
}
```

`usePostHog()` is `undefined` when key unset or Analytics consent denied.

### Server events

```typescript
import {
  trackSubscriptionCreated,
  trackServerEvent,
  Analytics,
} from "@/lib/analytics";

// Typed helper (preferred)
await trackSubscriptionCreated(user.id, {
  provider: "stripe",
  plan_id: planId,
  subscription_id: subscriptionId,
});

// Generic custom event
await trackServerEvent({
  distinctId: user.id,
  event: "feature_used",
  properties: { feature_name: "export" },
});

// Namespace style
await Analytics.creditsPurchased(user.id, { provider: "stripe", credit_type: "image", amount: 100 });
```

**B2B Kit:** use `organizationId` as `distinctId` and include `organization_id` in properties.

### Built-in server events

| Helper | Event | Triggered from |
|--------|-------|----------------|
| `trackPlanUpdated` | `plan_updated` | `updatePlan.ts` |
| `trackSubscriptionCreated` | `subscription_created` | Payment webhooks |
| `trackSubscriptionUpdated` | `subscription_updated` | Payment webhooks |
| `trackSubscriptionCancelled` | `subscription_cancelled` | Payment webhooks |
| `trackCreditsPurchased` | `credits_purchased` | Payment webhooks |

### Add a new server event

1. Add property type in `src/lib/analytics/types.ts` (if typed)
2. Add helper in `src/lib/analytics/server.ts`
3. Export from `src/lib/analytics/index.ts` and `Analytics` namespace
4. Call from route handler / webhook — **never** import PostHog directly
5. Mirror to b2b-kit

### Disable PostHog

Remove or unset `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`:
- Client: `ConditionalPostHog` renders children only
- Server: `trackServerEvent` no-ops
- Consent UI: Analytics category hidden (no env = not configured)

### PostHog dashboard

- **Live Events** — verify client + server events
- **Persons** — check identify traits after sign-in
- **Groups** (B2B) — filter by `organization` group
- **Feature flags / experiments** — client hooks via `posthog-provider`; server via `@/lib/analytics` (`evaluateFeatureFlags`)

## Add or swap an analytics provider

Two layers — don't confuse them:

| Layer | What | Example |
|-------|------|---------|
| **Client** | Browser SDK, consent-gated | PostHog via `ConditionalPostHog` |
| **Server** | Webhook/API event capture | PostHog via `@/lib/analytics` |

### Swap server provider (e.g. PostHog → Mixpanel)

1. Create `src/lib/analytics/providers/mixpanel.ts`:

```typescript
import type { TrackEventParams } from "../types";

export async function captureMixpanelEvent(params: TrackEventParams): Promise<void> {
  const token = process.env.MIXPANEL_TOKEN;
  if (!token) return;
  // init client, track, flush — lazy, no module-level SDK
}
```

2. Update `src/lib/analytics/server.ts`:

```typescript
import { captureMixpanelEvent } from "./providers/mixpanel";

export async function trackServerEvent(params: TrackEventParams): Promise<void> {
  await captureMixpanelEvent(params);
}
```

3. Keep all call sites on `@/lib/analytics` — zero webhook changes.

**Multi-provider (fan-out):** call both providers inside `trackServerEvent`:

```typescript
await Promise.allSettled([
  capturePostHogEvent(params),
  captureMixpanelEvent(params),
]);
```

### Add a second client analytics SDK

This is a **cookie consent** task, not an analytics-module task:

1. Add category or reuse `CookieCategory.Analytics` in `config.ts`
2. Create `ConditionalMyAnalytics` (pattern: `posthog-provider.tsx`)
3. Mount in `Providers.tsx`
4. Do **not** put client SDK init in `src/lib/analytics/` — that module is server-only

If the new SDK also needs server events, add a provider file under `src/lib/analytics/providers/`.

## Event naming

Use `snake_case` `noun_verb`: `plan_updated`, `credits_purchased`, `subscription_created`.

Include `provider` in billing events: `"stripe"`, `"paddle"`, etc.

## Related skills

- `cookie-consent-handler` — banner, categories, gating Crisp/other scripts
- `env-handler` — env var reference table

See `reference.md` for code snippets and event catalog.
