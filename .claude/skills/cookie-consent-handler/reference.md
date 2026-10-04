# Cookie Consent Reference

## Provider tree (`Providers.tsx`)

```tsx
<CookieConsentProvider>
  <ThemeProvider>
    <ConditionalPostHog>
      <SWRConfig>
        {children}
        <ConditionalCrisp />
        <CookieConsentBanner />
      </SWRConfig>
    </ConditionalPostHog>
  </ThemeProvider>
</CookieConsentProvider>
```

Order matters: `CookieConsentProvider` wraps everything; each `Conditional*` reads consent from context.

## Consent cookie

| Field | Value |
|-------|-------|
| Name | `cookie_consent` |
| Max-age | 365 days |
| Library | `js-cookie` (`storage.ts`) |

```json
{
  "v": 1,
  "decidedAt": "2026-08-14T12:00:00.000Z",
  "categories": {
    "analytics": true,
    "support": false
  }
}
```

Keys in `categories` match `CookieCategory` enum values (excluding `essential`).

## Banner visibility

Shown when **all** are true:
- `NEXT_PUBLIC_COOKIE_CONSENT_ENABLED === "true"`
- `hasConfigurableConsentCategories()` (at least one optional category has env configured)
- `state.status === "undecided"`
- pathname **not** in `HIDDEN_PATHS` (`["/cookie"]`)

## Footer preferences trigger

```tsx
import { CookiePreferencesTrigger } from "@/components/cookie-consent/cookie-consent-banner";

<CookiePreferencesTrigger className="text-sm text-muted-foreground hover:text-primary" />
```

## Config helpers

| Function | Returns |
|----------|---------|
| `isCategoryConfigured(category)` | Whether env var for that category is set |
| `getConfiguredConsentCategories()` | Optional categories with env configured |
| `hasConfigurableConsentCategories()` | Whether banner/preferences should appear |

## Hydration safety

Consent is read in `useEffect` only — never during SSR. `useHasConsent` returns conservative defaults while `status === "loading"`.

## Dual-kit sync

Cookie consent framework is identical in indie-kit and b2b-kit. Same relative paths; adapt only if a kit lacks a specific integration component.
