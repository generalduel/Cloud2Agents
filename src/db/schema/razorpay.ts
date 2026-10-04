import { text, timestamp, pgTable } from "drizzle-orm/pg-core";

// Razorpay retries webhooks (at-least-once, ~5s timeout) — processed event ids
// from the `x-razorpay-event-id` header make delivery idempotent.
export const razorpayWebhookEvents = pgTable("razorpay_webhook_events", {
  id: text("id").primaryKey(),
  event: text("event").notNull(),
  receivedAt: timestamp("receivedAt", { mode: "date" }).defaultNow().notNull(),
});
