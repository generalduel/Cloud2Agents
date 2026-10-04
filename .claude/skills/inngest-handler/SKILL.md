---
name: inngest-handler
description: Create and manage Inngest functions for reliable background jobs, workflows, and scheduled tasks (TypeScript SDK v4).
---

# Inngest Function Handler Skill

This skill defines the standards for building durable, multi-step workflows using **Inngest TypeScript SDK v4**.

## 🚨 HARD RULES (Strictly Follow)

1.  **NO `setTimeout` / `setInterval`**:
    -   ❌ **Bad**: `await new Promise(r => setTimeout(r, 1000))`
    -   ✅ **Good**: `await step.sleep("wait-1s", "1s")`
    -   *Reason*: Serverless functions time out; Inngest sleeps persist for up to a year.

2.  **NO Side Effects Outside Steps**:
    -   Any database write, API call, or non-deterministic logic (random, date) **MUST** be wrapped in `step.run()`.
    -   *Reason*: Inngest functions execute multiple times (memoization). Code outside steps runs every time.

3.  **Deterministic Steps**:
    -   Steps are memoized by their ID (1st arg). IDs must be unique and stable.
    -   Do not dynamically generate step IDs unless you know what you are doing (e.g., inside loops with index).

4.  **Return Data from Steps**:
    -   If you need a value later, return it from the step.
    -   ❌ **Bad**: `let userId; await step.run(..., () => { userId = ... })`
    -   ✅ **Good**: `const userId = await step.run(..., () => { return ... })`

## SDK v4 shape (this repo)

- **`src/lib/inngest/client.ts`**: only `new Inngest({ id, isDev, middleware? })` — no `EventSchemas`, no shared event registry on the client.
- **Per-function module** (`src/lib/inngest/functions/*.ts`): define triggers with `eventType(..., { schema: staticSchema<...>() })` next to `createFunction`, export the event constant if callers need `inngest.send(yourEvent.create({ ... }))`.
- **`createFunction`**: first argument is **options + `triggers`**; second is the **handler** (no separate “trigger” argument).

```typescript
import { eventType, staticSchema } from "inngest";
import { inngest } from "../client";

const orderCreated = eventType("shop/order.created", {
  schema: staticSchema<{ userId: string; orderId: string }>(),
});

export const processOrder = inngest.createFunction(
  { id: "process-order", triggers: [orderCreated] },
  async ({ event, step }) => {
    // event.data is typed from orderCreated
  }
);

export { orderCreated }; // optional: for inngest.send(orderCreated.create(...)) elsewhere
```

**Cron** (no `eventType`): use `triggers: { cron: "0 2 * * *" }` in the same options object.

**Multiple triggers**: `triggers: [eventA, { cron: "0 * * * *" }]` or the shapes your SDK version accepts.

Reference: [Inngest TypeScript docs](https://www.inngest.com/docs/typescript), [v3 → v4 migration](https://www.inngest.com/docs/reference/typescript/v4/migrations/v3-to-v4).

## Core Patterns

### 1. Multi-Step Execution
Wrap all logic in steps to ensure retriability and resumability. Colocate event types in the same file as the function.

```typescript
import { eventType, staticSchema } from "inngest";
import { inngest } from "../client";

const orderCreated = eventType("shop/order.created", {
  schema: staticSchema<{ userId: string; orderId: string }>(),
});

const paymentSuccess = eventType("shop/payment.success", {
  schema: staticSchema<{ orderId: string }>(),
});

export const processOrder = inngest.createFunction(
  { id: "process-order", triggers: [orderCreated] },
  async ({ event, step }) => {
    const user = await step.run("get-user", async () => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, event.data.userId))
        .limit(1);
      return user;
    });

    await step.sleep("wait-for-payment", "1h");

    const payment = await step.waitForEvent("wait-payment", {
      event: paymentSuccess,
      match: "data.orderId",
      timeout: "24h",
    });

    if (!payment) {
      await step.run("cancel-order", async () => {
        /* ... */
      });
    }
  }
);
```

### 2. Parallelism
Run steps concurrently to speed up execution.

```typescript
const [user, subscription] = await Promise.all([
  step.run("fetch-user", () => db.select().from(users).where(/* ... */)),
  step.run("fetch-sub", () => getStripe().subscriptions.retrieve(/* ... */)),
]);
```

### 3. Working with Loops
Inside loops, ensure step IDs are unique.

```typescript
const items = event.data.items;
for (const item of items) {
  await step.run(`process-item-${item.id}`, async () => {
    await processItem(item);
  });
}
```

## Configuration & Flow Control

Options (`id`, `rateLimit`, `debounce`, etc.) and **`triggers`** live on the **first** argument to `createFunction`.

### Rate Limiting & Throttling
**Multi-Tenancy Tip**: Use `organizationId` as the key to limit per tenant.

```typescript
inngest.createFunction(
  {
    id: "sync-crm",
    rateLimit: { limit: 10, period: "1m", key: "event.data.organizationId" },
    throttle: { limit: 5, period: "1s" },
    triggers: [crmSyncEvent],
  },
  async ({ event, step }) => {
    /* ... */
  }
);
```

### Debounce

```typescript
inngest.createFunction(
  {
    id: "index-product",
    debounce: { period: "10s", key: "event.data.productId" },
    triggers: [productUpdated],
  },
  async ({ event, step }) => {
    /* ... */
  }
);
```

### Priority

```typescript
inngest.createFunction(
  {
    id: "generate-report",
    priority: { run: "event.data.plan === 'enterprise' ? 100 : 0" },
    triggers: [reportRequested],
  },
  async ({ event, step }) => {
    /* ... */
  }
);
```

## Error Handling

### Automatic Retries
Inngest retries steps automatically on error (default ~4-5 times with backoff).
-   **Customize**: `retries: 10` in the function options object.

### Non-Retriable Errors
Stop execution immediately if the error is fatal (e.g., 400 Bad Request).

```typescript
import { NonRetriableError } from "inngest";

await step.run("validate", async () => {
  if (!isValid) throw new NonRetriableError("Invalid payload");
});
```

### Failure Handlers (Rollbacks)
`onFailure` stays on the first argument; **handler** is the second argument only.

```typescript
const transferInit = eventType("bank/transfer.init", {
  schema: staticSchema<{ transferId: string }>(),
});

export const riskyFunc = inngest.createFunction(
  {
    id: "risky-transfer",
    onFailure: async ({ error, event, step }) => {
      await step.run("rollback-funds", async () => {
        await reverseTransfer(event.data.transferId);
      });
      await step.run("notify-admin", async () => {
        await sendAlert(`Transfer failed: ${error.message}`);
      });
    },
    triggers: [transferInit],
  },
  async ({ step }) => {
    /* ... */
  }
);
```

## Registration
**MANDATORY**: All functions must be imported and exported in `src/lib/inngest/functions/index.ts`.

## Serving (Next.js App Router)
Route: `src/app/api/inngest/route.ts` uses `serve({ client: inngest, functions })`. Set `maxDuration` on that route if functions run long on serverless (see Inngest checkpointing docs).
