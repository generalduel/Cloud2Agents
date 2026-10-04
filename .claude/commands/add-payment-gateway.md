---
name: add-payment-gateway
description: A comprehensive guide and checklist for adding a new payment gateway (e.g., Stripe, Polar, LemonSqueezy) to the application.
---

# Add Payment Gateway Command

Use this guide whenever you need to integrate a new payment provider into the application. Adding a payment gateway touches multiple layers of the stack: Database, Admin UI, Checkout flows (Subscriptions & Credits), Customer Portal, and Webhooks.

## 1. Database Schema Updates
**Files to modify:**
- `src/db/schema/plans.ts`: Add columns for the provider's product or price IDs (e.g., `monthlyProviderProductId`, `yearlyProviderProductId`, `onetimeProviderProductId`).
  *Why: To map our internal plans to the specific pricing entities in the payment provider's system.*
- `src/db/schema/user.ts`: Add columns for the provider's customer and subscription IDs (e.g., `providerCustomerId`, `providerSubscriptionId`).
  *Why: To link our internal user to the external payment provider's customer record and track their active subscription status.*
- **Action:** Run `pnpm exec drizzle-kit generate` and `pnpm exec drizzle-kit push` to apply changes.

## 2. Admin UI & Validations
**Files to modify:**
- `src/lib/validations/plan.schema.ts`: Add the new database columns to the Zod schema (e.g., `monthlyProviderProductId: z.string().nullable()`).
  *Why: To validate inputs when super-admins create or edit plans.*
- `src/components/forms/plan-form.tsx`: Add UI input fields for the new provider's IDs under the Monthly, Yearly, and One-time pricing sections.
  *Why: So super-admins can input the provider-specific IDs directly from the dashboard.*

## 3. Core Types & Enums
**Files to modify:**
- `src/lib/plans/getSubscribeUrl.ts`: Add the new provider to the `PlanProvider` enum (e.g., `PROVIDER = "provider"`).
  *Why: To standardize the provider identifier across the app, used in URLs, switch statements, and database records.*

## 4. Provider Client & Utilities
**Files to create/modify:**
- `src/lib/[provider]/client.ts`: Export a **lazy getter** (e.g. `getProviderClient()`) — do not `new ProviderClient(...)` at module load. Follow `getStripe()`, `getDodoClient()`, `getPolar()`, `getRazorpay()`, and `getPaddleClient()` in this repo.
  *Why: Fresh clones must `pnpm build` without every payment env var set.*
- `src/lib/[provider]/ensureCustomer.ts` (Optional but recommended): A helper to create or fetch the customer in the provider's system using our internal `user.id` as the `external_id`.
  *Why: Pre-creating the customer allows us to lock their email address during checkout and ensures reliable webhook matching.*
- `src/lib/plans/getPlanFrom[Provider]ProductId.ts`: A helper to query the database for a plan matching the provider's product/price ID.
  *Why: Needed during webhooks to figure out which internal plan the user just paid for.*
- `src/lib/plans/downgradeToDefaultPlan.ts`: Clear the new provider's subscription ID (e.g., `providerSubscriptionId: null`).
  *Why: To ensure the user's local state reflects the cancelled subscription when they downgrade.*

## 5. Checkout Integration (Subscriptions & Credits)
**Files to modify:**
- `src/app/(in-app)/app/subscribe/page.tsx`: Add a `case PlanProvider.PROVIDER:` block. Fetch the correct product ID from the plan, ensure the customer exists, and create a checkout session. Redirect to the session URL.
  *Why: To handle the checkout session creation and redirect for subscription purchases.*
- `src/app/(in-app)/app/credits/buy/page.tsx`: Add a `case PlanProvider.PROVIDER:` block. Use the provider's specific "Credits" product ID, apply ad-hoc pricing based on the requested amount, attach metadata (`type: "credits_purchase"`, `creditType`, `amount`, `userId`), and redirect.
  *Why: To handle one-off credit purchases via the new provider.*

## 6. Customer Portal (Billing Management)
**Files to modify:**
- `src/app/(in-app)/app/billing/route.ts`: Add logic to redirect to the new provider's customer portal if the user has an active subscription or customer ID with them.
  *Why: So users can manage their subscriptions, update payment methods, or view invoices directly in the provider's hosted portal.*

## 7. Webhooks
**Files to create:**
- `src/app/api/webhooks/[provider]/route.ts`: Create a new webhook handler.
  *Why: To listen for asynchronous events from the provider and update our local database.*
  **Required Events to Handle:**
  - `order.paid` / `checkout.session.completed`: Check metadata for credit purchases (`handleCreditsPurchase`). If it's a plan, allocate plan credits and update the user's plan.
  - `subscription.created`: Store the provider's subscription ID and customer ID on the user record.
  - `subscription.updated` / `subscription.active`: Update the user's plan and allocate plan credits.
  - `subscription.canceled` / `subscription.revoked`: Call `downgradeToDefaultPlan` to remove premium access.

## 8. Error & Success UI
**Files to modify:**
- `src/app/(in-app)/app/subscribe/error/page.tsx`: Add error codes and messages for the new provider (e.g., `PROVIDER_CANCEL_BEFORE_SUBSCRIBING`, `PROVIDER_CHECKOUT_CANCELLED`).
  *Why: To show user-friendly error messages if checkout fails or the user cancels the flow.*
- `src/app/(in-app)/app/credits/buy/success/credits-buy-success-client.tsx`: extend `getProviderDisplayName` when adding a provider label.
  *Why: To show the user which provider processed their payment.*

## 9. Environment Variables
**Files to modify:**
- `.env.example`: Add placeholders for the new provider's API keys, webhook secrets, and generic product IDs (for credits).
- `.env.local`: Add the actual secret values.
  *Why: To configure the provider's SDK securely across different environments.*

---
**Reference — providers without a hosted checkout/portal:** Razorpay (`src/lib/razorpay/`, `src/app/(in-app)/app/subscribe/razorpay/`, `src/app/(in-app)/app/billing/razorpay/`) shows the pattern: create the subscription/order server-side, open the provider's JS checkout on a client page, fulfil purchases only from webhooks, and build an in-app billing page for cancellation.

---
**Final Verification:**
- [ ] Can a super-admin add the provider's IDs to a plan?
- [ ] Can a user checkout for a subscription?
- [ ] Can a user checkout for credits?
- [ ] Do webhooks successfully process and assign plans/credits?
- [ ] Can a user access their billing portal?
- [ ] Does cancelling a subscription downgrade the user?
