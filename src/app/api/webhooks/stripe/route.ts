import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import APIError from "@/lib/api/errors";
import getOrCreateUser from "@/lib/users/getOrCreateUser";
import { users } from "@/db/schema/user";
import { plans } from "@/db/schema/plans";
import { db } from "@/db";
import { eq, or } from "drizzle-orm";
import updatePlan from "@/lib/plans/updatePlan";
import downgradeToDefaultPlan from "@/lib/plans/downgradeToDefaultPlan";
import { addCredits } from "@/lib/credits/recalculate";
import { type CreditType } from "@/lib/credits/credits";
import { creditTypeSchema } from "@/lib/credits/config";
import { allocatePlanCredits } from "@/lib/credits/allocatePlanCredits";
import {
  getInvoiceSubscriptionId,
  getLineItemPriceId,
} from "@/lib/stripe/invoice-helpers";
import {
  trackCreditsPurchased,
  trackSubscriptionCancelled,
  trackSubscriptionCreated,
  trackSubscriptionUpdated,
} from "@/lib/analytics";

class StripeWebhookHandler {
  private data: Stripe.Event.Data;
  private eventType: string;

  constructor(data: Stripe.Event.Data, eventType: string) {
    this.data = data;
    this.eventType = eventType;
  }
  async handleOutsidePlanManagementProductInvoicePaid() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Invoice = this.data.object;
    console.log("eventType", this.eventType);
    console.log("Outside plan management product invoice paid", object);
    // TODO: Implement your own logic here ex: update user credits (if you have a credits system)
  }

  /**
   * Handles credits purchase from checkout session
   * @param checkoutSession - Stripe checkout session
   * @param user - User object
   */
  async handleCreditsPurchase(checkoutSession: Stripe.Checkout.Session, user: { id: string; email: string }) {
    const metadata = checkoutSession.metadata;
    
    if (!metadata || metadata.type !== "credits_purchase") {
      return false; // Not a credits purchase
    }

    const { creditType, amount, userId } = metadata;
    
    // Validate metadata
    if (!creditType || !amount || !userId) {
      throw new APIError("Invalid credits purchase metadata");
    }

    if (userId !== user.id) {
      throw new APIError("User ID mismatch in credits purchase");
    }

    // Validate credit type
    const parsedCreditType = creditTypeSchema.safeParse(creditType);
    if (!parsedCreditType.success) {
      throw new APIError(`Invalid credit type: ${creditType}`);
    }

    const creditAmount = parseInt(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      throw new APIError(`Invalid credit amount: ${amount}`);
    }

    try {
      // Use checkout session ID as payment ID for idempotency
      const paymentId = checkoutSession.id;
      
      // Add credits with idempotency protection
      await addCredits(
        user.id, 
        parsedCreditType.data as CreditType, 
        creditAmount, 
        paymentId,
        {
          reason: "Purchase via Stripe",
          checkoutSessionId: checkoutSession.id,
          paymentIntentId: checkoutSession.payment_intent,
          amountPaid: checkoutSession.amount_total,
          currency: checkoutSession.currency,
        }
      );

      console.log(`Successfully added ${creditAmount} ${creditType} credits to user ${user.id} via payment ${paymentId}`);
      await trackCreditsPurchased(user.id, {
        provider: "stripe",
        credit_type: parsedCreditType.data,
        amount: creditAmount,
        checkout_session_id: checkoutSession.id,
      });
      return true; // Credits purchase handled
    } catch (error) {
      console.error("Error adding credits:", error);
      // If it's a duplicate payment error, that's okay - idempotency working
      if (error instanceof Error && error.message.includes("already exists")) {
        console.log(`Credits purchase already processed for payment ${checkoutSession.id}`);
        return true;
      }
      throw new APIError(`Failed to add credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async onInvoicePaid() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Invoice = this.data.object;

    if (!object.customer_email) {
      return;
    }

    const { user } = await getOrCreateUser({
      emailId: object.customer_email,
      name: object.customer_name,
    });
    // Get first item
    const item = object.lines.data[0];
    if (!item) {
      throw new APIError("No item found in invoice");
    }

    if (item.subscription) {
      // Subscription is created, skip "customer.subscription.created" or "customer.subscription.updated" will handle this
      return;
    }

    const priceId = getLineItemPriceId(item);

    if (priceId) {
      // Check if item is a subscription
      const dbPlan = await this._getPlanFromStripePriceId(priceId);

      if (!dbPlan) {
        await this.handleOutsidePlanManagementProductInvoicePaid();
      } else {
        await updatePlan({
          userId: user.id,
          newPlanId: dbPlan.id,
        });

        // Allocate plan-based credits
        await allocatePlanCredits({
          userId: user.id,
          planId: dbPlan.id,
          paymentId: object.id,
          paymentMetadata: {
            source: "stripe_invoice",
            invoiceId: object.id,
            customerId: object.customer,
            subscriptionId: getInvoiceSubscriptionId(object),
          }
        });
      }
    } else {
      await this.handleOutsidePlanManagementProductInvoicePaid();
    }
  }

  async _getPlanFromStripePriceId(priceId: string) {
    const plan = await db
      .select()
      .from(plans)
      .where(
        or(
          eq(plans.monthlyStripePriceId, priceId),
          eq(plans.yearlyStripePriceId, priceId),
          eq(plans.onetimeStripePriceId, priceId)
        )
      )
      .limit(1);

    if (plan.length === 0) {
      return null;
    }

    return plan[0];
  }

  async onSubscriptionUpdated() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Subscription = this.data.object;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.stripeSubscriptionId, object.id))
      .limit(1);
    if (!user?.[0]) {
      // Subscription is not for this user, skip
      return;
    }

    const price = object.items.data[0].price;
    if (!price) {
      throw new APIError("No price found in subscription");
    }

    const isActive = object.status === "active" || object.status === "trialing";

    if (!isActive) {
      // Subscription is cancelled, downgrade to free plan
      await downgradeToDefaultPlan({ userId: user[0].id });
      await trackSubscriptionCancelled(user[0].id, {
        provider: "stripe",
        subscription_id: object.id,
        status: object.status,
      });
      return;
    }

    const dbPlan = await this._getPlanFromStripePriceId(price.id);
    if (!dbPlan) {
      // TIP: Handle outside plan management subscription
      return;
    }

    await updatePlan({ userId: user[0].id, newPlanId: dbPlan.id });

    await trackSubscriptionUpdated(user[0].id, {
      provider: "stripe",
      plan_id: dbPlan.id,
      subscription_id: object.id,
      status: object.status,
    });

    // Allocate plan-based credits
    await allocatePlanCredits({
      userId: user[0].id,
      planId: dbPlan.id,
      paymentId: object.id,
      paymentMetadata: {
        source: "stripe_subscription_updated",
        subscriptionId: object.id,
        status: object.status,
      }
    });
  }

  async _getStripeCustomer(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer
  ): Promise<Stripe.Customer | null> {
    if (typeof customer === "string") {
      const response = await getStripe().customers.retrieve(customer);
      if (response.deleted) {
        return null;
      }
      return response;
    }
    if (customer.deleted) {
      return null;
    }
    return customer;
  }

  async onSubscriptionCreated() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Subscription = this.data.object;
    const price = object.items.data[0].price;

    if (!price) {
      throw new APIError("No price found in subscription");
    }

    const customer = await this._getStripeCustomer(object.customer);
    if (!customer || !customer.email) {
      throw new APIError("No customer found in subscription");
    }
    const { user } = await getOrCreateUser({
      emailId: customer.email,
      name: customer.name,
    });
    const dbPlan = await this._getPlanFromStripePriceId(price.id);

    if (!dbPlan) {
      // TIP: Handle outside plan management subscription
      throw new APIError("Plan not found");
    }
    await db
      .update(users)
      .set({ stripeSubscriptionId: object.id })
      .where(eq(users.id, user.id));
    await updatePlan({ userId: user.id, newPlanId: dbPlan.id });

    await trackSubscriptionCreated(user.id, {
      provider: "stripe",
      plan_id: dbPlan.id,
      subscription_id: object.id,
    });

    // Allocate plan-based credits
    await allocatePlanCredits({
      userId: user.id,
      planId: dbPlan.id,
      paymentId: object.id,
      paymentMetadata: {
        source: "stripe_subscription_created",
        subscriptionId: object.id,
        customerId: customer.id,
      }
    });
  }

  async onSubscriptionDeleted() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Subscription = this.data.object;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.stripeSubscriptionId, object.id))
      .limit(1);
    if (!user?.[0]) {
      // Subscription is not for this user, skip
      return;
    }
    await downgradeToDefaultPlan({ userId: user[0].id });
    await trackSubscriptionCancelled(user[0].id, {
      provider: "stripe",
      subscription_id: object.id,
    });
  }

  async onCustomerCreated() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Customer = this.data.object;
    if (!object.email) {
      throw new APIError("No email found in customer");
    }
    const { user } = await getOrCreateUser({
      emailId: object.email,
      name: object.name,
    });
    await db
      .update(users)
      .set({ stripeCustomerId: object.id })
      .where(eq(users.id, user.id));
  }

  async onCheckoutSessionCompleted() {
    // @ts-expect-error Stripe types are not fully compatible with Next.js
    const object: Stripe.Checkout.Session = this.data.object;

    // Only proceed if payment was successful
    if (object.payment_status !== "paid") {
      return;
    }

    // If this is a subscription checkout, let subscription events handle it
    if (object.mode === "subscription") {
      return;
    }

    const customer = await this._getStripeCustomer(object.customer as string);
    if (!customer || !customer.email) {
      throw new APIError("No customer found in checkout session");
    }
    const { user } = await getOrCreateUser({
      emailId: customer.email,
      name: customer.name,
    });

    await db
      .update(users)
      .set({
        stripeCustomerId: customer.id,
      })
      .where(eq(users.id, user.id));

    // First, check if this is a credits purchase
    const isCreditsHandled = await this.handleCreditsPurchase(object, user);
    if (isCreditsHandled) {
      return; // Credits purchase was handled successfully
    }

    // If not credits, handle as plan purchase
    // Get line items to find the plan
    const lineItems = await getStripe().checkout.sessions.listLineItems(object.id);

    if (lineItems.data.length === 0) {
      throw new APIError("No line items found in checkout session");
    }

    const firstItem = lineItems.data[0];
    if (!firstItem.price) {
      throw new APIError("No price found in checkout session line item");
    }

    const dbPlan = await this._getPlanFromStripePriceId(firstItem.price.id);

    if (!dbPlan) {
      // Handle outside plan management product - could be credits or other products
      console.log("No plan found for price ID:", firstItem.price.id, "- may be credits or other product");
      return;
    }

    await updatePlan({
      userId: user.id,
      newPlanId: dbPlan.id,
    });

    // Allocate plan-based credits
    await allocatePlanCredits({
      userId: user.id,
      planId: dbPlan.id,
      paymentId: object.id,
      paymentMetadata: {
        source: "stripe_checkout",
        checkoutSessionId: object.id,
        paymentIntentId: object.payment_intent,
        customerId: customer.id,
        amountTotal: object.amount_total,
        currency: object.currency,
      }
    });
  }
}

async function handler(req: NextRequest) {
  if (req.method === "POST") {
    let data;
    let eventType;
    // Check if webhook signing is configured.
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      // Retrieve the event by verifying the signature using the raw body and secret.
      let event: Stripe.Event;
      const signature = req.headers.get("stripe-signature") as string;

      try {
        const body = await req.text();
        event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error(`⚠️ Webhook signature verification failed.`, err);
        return NextResponse.json({
          received: true,
          error: "Webhook signature verification failed",
        });
      }
      // Extract the object from the event.
      data = event.data;
      eventType = event.type;
    } else {
      // Webhook signing is recommended, but if the secret is not configured in `config.js`,
      // retrieve the event data directly from the request body.
      const body = await req.json();
      data = body.data;
      eventType = body.type;
    }

    const handler = new StripeWebhookHandler(data, eventType);
    try {
      switch (eventType) {
        case "invoice.paid":
          await handler.onInvoicePaid();
          break;
        case "checkout.session.completed":
          await handler.onCheckoutSessionCompleted();
          break;
        case "customer.created":
          await handler.onCustomerCreated();
          break;
        case "customer.subscription.created":
          await handler.onSubscriptionCreated();
          break;
        case "customer.subscription.updated":
          await handler.onSubscriptionUpdated();
          break;
        case "customer.subscription.deleted":
          await handler.onSubscriptionDeleted();
          break;
        default:
          // Unhandled event type
          break;
      }
    } catch (error) {
      if (error instanceof APIError) {
        return NextResponse.json({
          received: true,
          message: error.message,
        });
      }
    }
    // Return a response to acknowledge receipt of the event.
    return NextResponse.json({ received: true });
  }
}

export const POST = handler;

export const maxDuration = 20;
