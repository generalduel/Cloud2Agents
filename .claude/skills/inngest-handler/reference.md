# Inngest Reference (SDK v4)

## File structure
- **Client** (no event registry): [`src/lib/inngest/client.ts`](../../../src/lib/inngest/client.ts) — `new Inngest({ id, isDev, middleware? })`
- **Registry**: [`src/lib/inngest/functions/index.ts`](../../../src/lib/inngest/functions/index.ts)
- **Definitions**: `src/lib/inngest/functions/*.ts` — colocate `eventType(...)` + `createFunction` in each module

## `createFunction` (v4)
- **Arg 1**: `{ id, triggers, retries?, rateLimit?, ... }`
- **Arg 2**: `async ({ event, step, logger, ... }) => { ... }`
- **Event-driven**: `triggers: [myEvent]` where `myEvent = eventType("name", { schema: staticSchema<...>() })`
- **Cron**: `triggers: { cron: "0 2 * * *" }` (no `eventType`)

## Code snippets

### Colocate event + function
```typescript
import { eventType, staticSchema } from "inngest";
import { inngest } from "../client";

export const myEvent = eventType("app/my.event", {
  schema: staticSchema<{ userId: string }>(),
});

export const myFunction = inngest.createFunction(
  { id: "my-function", triggers: [myEvent] },
  async ({ event, step }) => {
    // event.data typed from myEvent
  }
);
```

### Basic step
```typescript
const result = await step.run("step-id", async () => {
  return await db.select().from(table).where(eq(table.id, id));
});
```

### Sleep (delay)
```typescript
await step.sleep("wait-10m", "10m");
await step.sleepUntil("wait-for-launch", new Date("2026-01-01"));
```

### Wait for event (typed)
Define the waited event with `eventType` (same file or a small shared module if many functions need it):

```typescript
const approvalReceived = eventType("app/approval.received", {
  schema: staticSchema<{ proposalId: string; approved: boolean }>(),
});

const result = await step.waitForEvent("wait-approval", {
  event: approvalReceived,
  match: "data.proposalId",
  timeout: "3d",
  ifExpression: "event.data.approved == true", // optional
});
```

### Send events
Prefer typed payloads when you have an `eventType`:

```typescript
await inngest.send(myEvent.create({ userId: "..." }));
```

From inside a step, you can still use `step.sendEvent` with the shapes your SDK supports; prefer consistency with `eventType` + `.create()` where possible.

### Invoke another function (v4)
Do **not** pass a raw string function id. Pass an **imported function** (or `referenceFunction` for cross-app):

```typescript
import { otherWorker } from "./other-worker";

const result = await step.invoke("call-worker", {
  function: otherWorker,
  data: { jobId: 123 },
});
```

### Config object (first argument to `createFunction`)
```typescript
{
  id: "function-id",
  triggers: [someEvent], // or { cron: "..." }
  concurrency: { limit: 5, key: "event.data.userId" },
  rateLimit: { limit: 100, period: "1h" },
  debounce: { period: "1m", key: "event.data.id" },
  priority: { run: "event.data.isVip ? 100 : 0" },
  retries: 3,
  cancelOn: [{ event: "app/process.cancel", match: "data.id" }],
  onFailure: async ({ error, step }) => { /* ... */ },
}
```

### Error handling
```typescript
import { NonRetriableError } from "inngest";

throw new NonRetriableError("Config missing"); // no retry
throw new Error("API unavailable"); // retried
```
