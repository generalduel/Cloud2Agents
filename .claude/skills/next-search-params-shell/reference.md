# Next.js App Router — server shell + Suspense + `useSearchParams`

Use when an `app/**/page.tsx` needs URL query params via **`useSearchParams`** for client UI: magic links (`?token=`), error pages (`?code=&message=`), payment return URLs, onboarding steps, etc.

## Why this pattern

- `useSearchParams()` runs only in a **Client Component** and can suspend during static rendering — Next expects a **`<Suspense>`** boundary with an explicit fallback.
- **`page.tsx` stays a Server Component** so the whole route is not `'use client'`, preserving predictable streaming/hydration.

## File layout (co-located in the segment)

| File | Role |
|------|------|
| `page.tsx` | **Server**: `<Suspense fallback={<FeatureShimmer />}><FeatureClient /></Suspense>` — no `'use client'`. |
| `*-client.tsx` | **`'use client'`**: `useSearchParams()`, normalize params, invalid vs happy path. |
| `*-form.tsx` | **`'use client'`** (optional): `react-hook-form`, submit/API — props like `token: string` when submission always requires a value. |

**Naming**: align with route, e.g. `reset-password-confirm-client.tsx`, `credits-buy-error-client.tsx`.

### Server `page.tsx`

1. `import { Suspense } from "react"`.
2. Local **`FeatureShimmer`** — mirrors **real layout** (container, Card, spacing, control heights).
3. Use **`Skeleton`** from `@/components/ui/skeleton`.
4. Root: **`aria-busy`** + **`aria-label`**.
5. **No** pointless `async` + `searchParams` on `page.tsx` unless you genuinely need server reads alongside the client branch.

### Client `*-client.tsx`

1. `'use client'`.
2. `useSearchParams()` → `.get('key')`; **`trim()`** tokens / tiny normalizers.
3. **Invalid params**: render error UI immediately — **avoid** `useEffect` solely to flip an error flag.
4. Happy path: compose `<FeatureForm … />` or inline simple UI.

### Optional `*-form.tsx`

Extract when the client mixes param branching with a large form, or reuse is needed.

- Pass **narrow types** (`token: string`) so handlers do not duplicate empty checks.

## References in indie-kit

- `src/app/(auth)/reset-password/confirm/` — client + form split
- `src/app/(auth)/sign-up/` — Suspense + sign-up form (Better Auth)
- `src/app/(in-app)/app/credits/buy/error/` — client only (no form)
- `src/app/(in-app)/app/subscribe/paddle/` — Paddle overlay checkout from `transactionId` / `_ptxn`
- `(auth)/sign-in` / `sign-up` — **`Suspense`** around **`AuthForm`** / **`SignUpForm`** with **`auth-flow-skeletons.tsx`**

Canonical Cursor/Claude rule (keep in sync when changing fundamentals): `.claude/rules/next-app-router-search-params-shell.md`

## Anti-patterns

- `'use client'` on `page.tsx` only for `useSearchParams` with **no** Suspense.
- Parsing params on server **and** client without a clear reason (single source of truth unless SSR copy is needed).
- Generic centered spinners instead of layout-matched skeletons when mirroring layout is cheap.

## Skeleton template

Adapt names and layout classes to match the route.

```tsx
// page.tsx — server
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ExampleClient } from "./example-client";

function ExampleShimmer() {
  return (
    <div className="…" aria-busy aria-label="Loading…">
      <Skeleton className="h-8 w-3/4 max-w-[280px]" />
    </div>
  );
}

export default function ExamplePage() {
  return (
    <Suspense fallback={<ExampleShimmer />}>
      <ExampleClient />
    </Suspense>
  );
}
```

```tsx
// example-client.tsx — client
"use client";

import { useSearchParams } from "next/navigation";

function normalizeToken(raw: string | null): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

export function ExampleClient() {
  const searchParams = useSearchParams();
  const token = normalizeToken(searchParams.get("token"));

  if (!token) {
    return null; /* invalid-link UI */
  }

  return <ExampleForm token={token} />;
}
```
