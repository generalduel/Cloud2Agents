CREATE TABLE IF NOT EXISTS "razorpay_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"receivedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "monthlyRazorpayPlanId" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "yearlyRazorpayPlanId" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "onetimeRazorpayItemId" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "razorpayCustomerId" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "razorpaySubscriptionId" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "razorpayCancelsAt" timestamp;