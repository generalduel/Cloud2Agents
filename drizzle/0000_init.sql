CREATE TYPE "public"."transaction_type" AS ENUM('credit', 'debit', 'expired');--> statement-breakpoint
CREATE TABLE "contact" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"message" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"userId" text,
	"createdAt" timestamp DEFAULT now(),
	"usedAt" timestamp,
	"expired" boolean DEFAULT false,
	CONSTRAINT "coupon_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"credit_type" text NOT NULL,
	"amount" integer NOT NULL,
	"payment_id" text,
	"expiration_date" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paypal_access_tokens" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paypal_context" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"plan_id" text,
	"user_id" text,
	"frequency" text NOT NULL,
	"paypal_order_id" text,
	"paypal_subscription_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"purchase_type" text DEFAULT 'plan' NOT NULL,
	"credit_type" text,
	"credit_amount" text
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"codename" text,
	"default" boolean DEFAULT false,
	"requiredCouponCount" integer DEFAULT 0,
	"hasOnetimePricing" boolean DEFAULT false,
	"hasMonthlyPricing" boolean DEFAULT false,
	"hasYearlyPricing" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now(),
	"monthlyPrice" integer,
	"monthlyPriceAnchor" integer,
	"monthlyStripePriceId" text,
	"monthlyLemonSqueezyVariantId" text,
	"monthlyDodoProductId" text,
	"monthlyPaddlePriceId" text,
	"monthlyPaypalPlanId" text,
	"monthlyPolarProductId" text,
	"yearlyPrice" integer,
	"yearlyPriceAnchor" integer,
	"yearlyStripePriceId" text,
	"yearlyLemonSqueezyVariantId" text,
	"yearlyDodoProductId" text,
	"yearlyPaddlePriceId" text,
	"yearlyPaypalPlanId" text,
	"yearlyPolarProductId" text,
	"onetimePrice" integer,
	"onetimePriceAnchor" integer,
	"onetimeStripePriceId" text,
	"onetimeLemonSqueezyVariantId" text,
	"onetimeDodoProductId" text,
	"onetimePaddlePriceId" text,
	"onetimePaypalPlanId" text,
	"onetimePolarProductId" text,
	"quotas" jsonb,
	CONSTRAINT "plans_codename_unique" UNIQUE("codename")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"impersonatedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"banReason" text,
	"banExpires" timestamp,
	"credits" jsonb DEFAULT '{}'::jsonb,
	"stripeCustomerId" text,
	"stripeSubscriptionId" text,
	"lemonSqueezyCustomerId" text,
	"lemonSqueezySubscriptionId" text,
	"dodoCustomerId" text,
	"dodoSubscriptionId" text,
	"paddleCustomerId" text,
	"paddleSubscriptionId" text,
	"polarCustomerId" text,
	"polarSubscriptionId" text,
	"planId" text,
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"twitterAccount" text,
	"email" text,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_userId_app_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_app_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paypal_context" ADD CONSTRAINT "paypal_context_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paypal_context" ADD CONSTRAINT "paypal_context_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_app_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_app_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_planId_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;