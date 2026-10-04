---
name: cookie-consent-handler
description: Manage GDPR cookie consent, category registry, banner UI, and gating third-party integrations (PostHog, Crisp, etc.).
tools: Read, Write, Edit
model: inherit
---

# Cookie Consent Handler

Shared framework in `src/lib/cookie-consent/` — **not** tied to PostHog. Analytics is one consumer; see `analytics-handler` for PostHog specifics.

## When consent is active

| `NEXT_PUBLIC_COOKIE_CONSENT_ENABLED` | Behavior |
|--------------------------------------|----------|
| `true` | Show banner (if optional categories exist), store choices in `cookie_consent` cookie, gate integrations |
| `false` | No banner; auto-grant all **configured** categories (US/dev mode) |

A category only appears in the UI when its service env var is set (see `config.ts` → `CATEGORY_SERVICE_ENV`).

## Categories (`CookieCategory` enum)

| Enum | Required | Gated services | Env gate |
|------|----------|----------------|----------|
| `CookieCategory.Essential` | Always on | Auth session, sidebar | — |
| `CookieCategory.Analytics` | Opt-in | PostHog | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` |
| `CookieCategory.Support` | Opt-in | Crisp | `NEXT_PUBLIC_CRISP_WEBSITE_ID` |

## File map

```
src/lib/cookie-consent/
├── types.ts      # CookieCategory enum, ConsentPreferences shape
├── config.ts     # COOKIE_CATEGORY_CONFIG, env gates, isCategoryConfigured()
├── storage.ts    # read/write cookie_consent (js-cookie, 365-day)
├── context.tsx   # CookieConsentProvider, useCookieConsent, useHasConsent
└── hooks.ts      # public re-exports

src/components/cookie-consent/
├── cookie-consent-banner.tsx       # floating banner; hidden on /cookie
└── cookie-preferences-dialog.tsx   # customize modal
```

Wired in `src/app/Providers.tsx`:

```tsx
<CookieConsentProvider>
  <ConditionalPostHog>   {/* analytics — see analytics-handler */}
    …
    <ConditionalCrisp /> {/* support */}
    <CookieConsentBanner />
  </ConditionalPostHog>
</CookieConsentProvider>
```

## API

```tsx
import {
  CookieCategory,
  CookieConsentProvider,
  useHasConsent,
  useCookieConsent,
} from "@/lib/cookie-consent/hooks";

// Gate any client integration
const allowed = useHasConsent(CookieCategory.Analytics);
if (!allowed) return null;

// Open preferences programmatically (footer trigger pattern)
const { setPreferencesOpen, acceptAll, rejectAll, savePreferences } = useCookieConsent();
```

### Consent states

| `state.status` | Meaning |
|----------------|---------|
| `loading` | Hydrating from cookie (SSR-safe: read in `useEffect` only) |
| `undecided` | Banner shown; integrations blocked until choice |
| `decided` | Cookie stored; `hasConsent(category)` reflects user choice |

`useHasConsent(Essential)` is always `true`. During `loading`, only Essential returns `true`.

## Manage cookie consent (operator checklist)

1. **Enable GDPR mode** — set `NEXT_PUBLIC_COOKIE_CONSENT_ENABLED=true` in `.env.local`
2. **Configure services** — set env vars for integrations you want to offer (PostHog key, Crisp ID, etc.)
3. **Policy page** — keep `src/content/policies/cookie.md` in sync with `COOKIE_CATEGORY_CONFIG`
4. **Footer link** — `CookiePreferencesTrigger` in `footer.tsx` lets users change mind anytime
5. **Banner hidden on** `/cookie` — users read policy without overlay; they can still use footer preferences
6. **Revoke consent** — user opens preferences → toggles off → integration unmounts (`Conditional*` returns null)
7. **Dev without banner** — set `NEXT_PUBLIC_COOKIE_CONSENT_ENABLED=false` to auto-grant

## Add a new cookie-gated integration (e.g. Intercom, Hotjar)

This is for **client-side third-party scripts** that need consent — not server analytics (see `analytics-handler`).

### 1. Extend the category enum

`src/lib/cookie-consent/types.ts`:

```typescript
export enum CookieCategory {
  Essential = "essential",
  Analytics = "analytics",
  Support = "support",
  Marketing = "marketing", // new
}
```

`ConsentCategory` automatically excludes Essential.

### 2. Register in config

`src/lib/cookie-consent/config.ts`:

```typescript
[CookieCategory.Marketing]: {
  required: false,
  label: "Marketing",
  description: "Personalized ads and campaign measurement.",
  services: ["Meta Pixel"],
},

// In CATEGORY_SERVICE_ENV:
[CookieCategory.Marketing]: process.env.NEXT_PUBLIC_META_PIXEL_ID,
```

### 3. Create a conditional wrapper

Pattern (copy from `src/components/chat/crisp.tsx`):

```tsx
"use client";

import { CookieCategory, useHasConsent } from "@/lib/cookie-consent/hooks";

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function MetaPixelInner() {
  useEffect(() => {
    if (!pixelId) return;
    // initialize script
  }, []);
  return null;
}

export function ConditionalMetaPixel() {
  const allowed = useHasConsent(CookieCategory.Marketing);
  if (!allowed || !pixelId) return null;
  return <MetaPixelInner />;
}
```

**Rules:**
- Check env var **and** consent before loading anything
- Never init SDK at module top level
- On consent revoke, component unmounts — cleanup in `useEffect` return if needed

### 4. Mount in Providers

```tsx
<ConditionalMetaPixel />
```

Place alongside other `Conditional*` components inside `CookieConsentProvider`.

### 5. Document & policy

- Add env var to `.env.example` and `env-handler` reference
- Update `src/content/policies/cookie.md`
- Mirror changes to **b2b-kit** (dual-kit sync)

## UI components

| Component | Purpose |
|-----------|---------|
| `CookieConsentBanner` | First-visit floating card; Accept all / Reject optional / Customize |
| `CookiePreferencesDialog` | Per-category toggles; opened from banner or footer |
| `CookiePreferencesTrigger` | Footer button to reopen preferences |

Do not mount third-party scripts inside the banner — only in `Conditional*` wrappers.

## Testing

1. Clear `cookie_consent` cookie → banner appears
2. Reject optional → PostHog/Crisp network requests stop
3. Accept all → integrations load
4. Visit `/cookie` → banner hidden; footer preferences still works
5. Toggle off in preferences → integration unmounts without full page reload
6. `NEXT_PUBLIC_COOKIE_CONSENT_ENABLED=false` → no banner, all configured services active

See `reference.md` for cookie JSON shape and Provider tree.
