# Analytics Reference

## Conditional PostHog mount

```tsx
import { CookieCategory, useHasConsent } from "@/lib/cookie-consent/hooks";

export function ConditionalPostHog({ children }: { children: React.ReactNode }) {
  const hasAnalytics = useHasConsent(CookieCategory.Analytics);
  const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

  if (!posthogKey || !hasAnalytics) return <>{children}</>;

  return <PostHogInnerProvider>{children}</PostHogInnerProvider>;
}
```

When consent is revoked, `hasAnalytics` becomes `false` → provider unmounts → `posthog.reset()` runs.

## Server analytics module

```typescript
// Import from @/lib/analytics — NOT @/lib/posthog/server

export async function trackServerEvent(params: TrackEventParams): Promise<void>;
export async function trackPlanUpdated(distinctId, properties): Promise<void>;
export async function trackSubscriptionCreated(distinctId, properties): Promise<void>;
export async function trackSubscriptionUpdated(distinctId, properties): Promise<void>;
export async function trackSubscriptionCancelled(distinctId, properties): Promise<void>;
export async function trackCreditsPurchased(distinctId, properties): Promise<void>;

export const Analytics = {
  track, planUpdated, subscriptionCreated, subscriptionUpdated,
  subscriptionCancelled, creditsPurchased,
};
```

PostHog implementation: `src/lib/analytics/providers/posthog.ts` + `posthog-client.ts`

```typescript
// Shared singleton — flush only (no shutdown per capture)
export function getPostHogNodeClient(): PostHog | null;

export async function capturePostHogEvent(params: TrackEventParams): Promise<void> {
  const ph = getPostHogNodeClient(); // null if NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN unset
  if (!ph) return;
  ph.capture({ distinctId, event, properties });
  await ph.flush();
}
```

## Feature flags

### Server (`feature-flags.ts`)

```typescript
import { evaluateFeatureFlags, isFeatureEnabled } from "@/lib/analytics";

const flags = await evaluateFeatureFlags({
  distinctId: user.id,
  flagKeys: ["my-flag"],           // narrow eval — one network call
  personProperties: { role: "admin" },
});
flags?.isEnabled("my-flag", false);
flags?.getVariant("my-flag");
flags?.getPayload("my-flag");
```

B2B: add `organizationId` + `organizationProperties` for org-targeted flags.

### Client (`feature-flags-client.ts`)

Re-exported from `posthog-provider.tsx`. Safe wrappers return defaults when PostHog is not mounted.

```tsx
const enabled = useFeatureFlag("my-flag", false);
```

Server flags use `POSTHOG_PROJECT_SECRET_API_KEY` on `posthog-node` (with `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` as the project token). Create the key in [Project secret API keys](https://us.posthog.com/project/137763/settings/project-secret-api-keys).

## Property types (`types.ts`)

```typescript
interface PlanUpdatedProperties {
  plan_id: string;
  plan_name: string;
  organization_id?: string;  // B2B only
}

interface SubscriptionEventProperties {
  provider: string;
  subscription_id: string;
  plan_id?: string;
  status?: string;
  organization_id?: string;
}

interface CreditsPurchasedProperties {
  provider: string;
  credit_type: string;
  amount: number;
  organization_id?: string;
  checkout_session_id?: string;
  order_id?: string;
  transaction_id?: string;
  payment_id?: string;
}
```

## B2B Kit differences

| Concern | Indie Kit | B2B Kit |
|---------|-----------|---------|
| Server `distinctId` | `user.id` | `organization.id` |
| Identify traits | user fields | + `organizationId` |
| Group analytics | — | `posthog.group("organization", org.id, …)` |
| Server properties | user-scoped | include `organization_id` |

## Instrumented call sites

| File | Events |
|------|--------|
| `src/lib/plans/updatePlan.ts` | `plan_updated` |
| `src/app/api/webhooks/stripe/route.ts` | subscription + credits |
| `src/app/api/webhooks/paddle/route.ts` | subscription + credits |
| `src/app/api/webhooks/dodo/route.ts` | subscription + credits |
| `src/app/api/webhooks/polar/route.ts` | subscription + credits |
| `src/app/api/webhooks/razorpay/route.ts` | subscription + credits |
| `src/app/api/webhooks/paypal/route.ts` | subscription + credits |

B2B Kit: server events currently on `updatePlan.ts` + `stripe/route.ts` only.

## Add provider checklist

### Server (`@/lib/analytics`)

- [ ] `src/lib/analytics/providers/<name>.ts` — lazy init, env-gated, no top-level SDK
- [ ] Wire in `server.ts` → `trackServerEvent`
- [ ] Add env vars to `.env.example` + `env-handler`
- [ ] Mirror both kits

### Client (consent-gated)

- [ ] Env gate in `cookie-consent/config.ts` (or reuse Analytics category)
- [ ] `Conditional<Name>` component with `useHasConsent`
- [ ] Mount in `Providers.tsx`
- [ ] Update `cookie.md` policy

## Deprecated

`@/lib/posthog/server` re-exports `trackServerEvent as captureServerEvent`. Do not use in new code.
