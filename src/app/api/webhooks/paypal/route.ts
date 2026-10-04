import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { eq } from "drizzle-orm";
import updatePlan from "@/lib/plans/updatePlan";
import downgradeToDefaultPlan from "@/lib/plans/downgradeToDefaultPlan";
import { paypalContext } from "@/db/schema/paypal";
import { PAYPAL_BASE_URL, getPaypalAuthToken } from "@/lib/paypal/api";
import { addCredits } from "@/lib/credits/recalculate";
import { CreditType } from "@/lib/credits/credits";
import { allocatePlanCredits } from "@/lib/credits/allocatePlanCredits";
import {
  trackCreditsPurchased,
  trackSubscriptionCancelled,
  trackSubscriptionCreated,
} from "@/lib/analytics";

class PayPalWebhookHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private event: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(event: any) {
    this.event = event;
  }

  async handleOrderCompleted() {
    const orderId = this.event.resource?.id;
    if (!orderId) return;
    const [context] = await db.select().from(paypalContext).where(eq(paypalContext.paypalOrderId, orderId)).limit(1);
    if (!context) return;
    const userId = context.userId;
    if (!userId) return;

    // Check if this is a credit purchase or plan purchase
    if (context.purchaseType === "credits" && context.creditType && context.creditAmount) {
      // Handle credit purchase
      try {
        const creditAmount = parseInt(context.creditAmount);
        if (isNaN(creditAmount) || creditAmount <= 0) {
          console.error("Invalid credit amount:", context.creditAmount);
          return;
        }

        // Add credits with PayPal order ID as payment ID for idempotency
        await addCredits(
          userId,
          context.creditType as CreditType,
          creditAmount,
          orderId,
          {
            reason: "Purchase via PayPal",
            paypalOrderId: orderId,
            paypalContextId: context.id,
          }
        );

        console.log(`Successfully added ${creditAmount} ${context.creditType} credits to user ${userId} via PayPal order ${orderId}`);
        await trackCreditsPurchased(userId, {
          provider: "paypal",
          credit_type: context.creditType,
          amount: creditAmount,
          order_id: orderId,
        });
      } catch (error) {
        console.error("Error adding credits from PayPal:", error);
        // If it's a duplicate payment error, that's okay - idempotency working
        if (error instanceof Error && error.message.includes("already exists")) {
          console.log(`Credits purchase already processed for PayPal order ${orderId}`);
        } else {
          // Don't return early on error - still update the context status
          console.error(`Failed to add credits for PayPal order ${orderId}:`, error);
        }
      }
    } else if (context.planId) {
      // Handle plan purchase
      await updatePlan({ userId, newPlanId: context.planId });

      // Allocate plan-based credits
      await allocatePlanCredits({
        userId,
        planId: context.planId,
        paymentId: orderId,
        paymentMetadata: {
          source: "paypal_order",
          paypalOrderId: orderId,
          paypalContextId: context.id,
        }
      });
    } else {
      console.error("PayPal order completed but no plan or credit information found:", context);
      return;
    }

    await db.update(paypalContext).set({ status: "success" }).where(eq(paypalContext.id, context.id));
  }

  async handleSubscriptionActivated() {
    const subscriptionId = this.event.resource?.id;
    if (!subscriptionId) return;
    const [context] = await db.select().from(paypalContext).where(eq(paypalContext.paypalSubscriptionId, subscriptionId)).limit(1);
    if (!context) return;
    const userId = context.userId;
    const planId = context.planId;
    if (!userId || !planId) return;
    await updatePlan({ userId, newPlanId: planId });

    await trackSubscriptionCreated(userId, {
      provider: "paypal",
      plan_id: planId,
      subscription_id: subscriptionId,
    });

    // Allocate plan-based credits
    await allocatePlanCredits({
      userId,
      planId,
      paymentId: subscriptionId,
      paymentMetadata: {
        source: "paypal_subscription",
        paypalSubscriptionId: subscriptionId,
        paypalContextId: context.id,
      }
    });

    await db.update(paypalContext).set({ status: "success" }).where(eq(paypalContext.id, context.id));
  }

  async handleSubscriptionCancelled() {
    const subscriptionId = this.event.resource?.id;
    if (!subscriptionId) return;
    const [context] = await db.select().from(paypalContext).where(eq(paypalContext.paypalSubscriptionId, subscriptionId)).limit(1);
    if (!context) return;
    const userId = context.userId;
    if (!userId) return;
    await downgradeToDefaultPlan({ userId });
    await trackSubscriptionCancelled(userId, {
      provider: "paypal",
      subscription_id: subscriptionId,
    });
    await db.update(paypalContext).set({ status: "cancelled" }).where(eq(paypalContext.id, context.id));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyPaypalWebhook(req: NextRequest, body: any) {
  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig || !webhookId) {
    return false;
  }
  const authToken = await getPaypalAuthToken();
  const verifyRes = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: body,
    }),
  });
  const verifyData = await verifyRes.json();
  return verifyData.verification_status === "SUCCESS";
}

async function handler(req: NextRequest) {
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const eventType = body.event_type;
      const event = body;
      console.log("[PayPal Webhook] Received event", { eventType, resourceType: event.resource_type || event.resource?.resource_type, id: event.resource?.id });
      // Webhook verification
      const isVerified = await verifyPaypalWebhook(req, body);
      if (!isVerified) {
        console.warn("[PayPal Webhook] Verification failed", { eventType });
        return NextResponse.json({ received: false, error: "Webhook verification failed" }, { status: 401 });
      }
      const handler = new PayPalWebhookHandler(event);
      try {
        // Check resource type before processing
        const resourceType = event.resource_type || event.resource?.resource_type;
        switch (eventType) {
          case "CHECKOUT.ORDER.APPROVED":
          case "PAYMENT.CAPTURE.COMPLETED":
            if (resourceType === "order" || resourceType === "checkout-order" || resourceType === "payment") {
              console.log("[PayPal Webhook] Processing order completed", { orderId: event.resource?.id });
              await handler.handleOrderCompleted();
            } else {
              console.warn("[PayPal Webhook] Skipped: resource type mismatch for order", { resourceType });
            }
            break;
          case "BILLING.SUBSCRIPTION.ACTIVATED":
          case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
            if (resourceType === "subscription") {
              console.log("[PayPal Webhook] Processing subscription activated", { subscriptionId: event.resource?.id });
              await handler.handleSubscriptionActivated();
            } else {
              console.warn("[PayPal Webhook] Skipped: resource type mismatch for subscription activated", { resourceType });
            }
            break;
          case "BILLING.SUBSCRIPTION.CANCELLED":
          case "BILLING.SUBSCRIPTION.EXPIRED":
            if (resourceType === "subscription") {
              console.log("[PayPal Webhook] Processing subscription cancelled", { subscriptionId: event.resource?.id });
              await handler.handleSubscriptionCancelled();
            } else {
              console.warn("[PayPal Webhook] Skipped: resource type mismatch for subscription cancelled", { resourceType });
            }
            break;
          default:
            console.log("[PayPal Webhook] Unhandled event type", { eventType });
            break;
        }
        return NextResponse.json({ received: true });
      } catch (error) {
        console.error("[PayPal Webhook] Handler error", error);
        return NextResponse.json({ received: true, error: "Unexpected error processing webhook" }, { status: 500 });
      }
    } catch (error) {
      console.error("[PayPal Webhook] Invalid webhook payload", error);
      return NextResponse.json({ received: false, error: "Invalid webhook payload" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ received: false, error: "Method not allowed" }, { status: 405 });
  }
}

export const POST = handler;

export const maxDuration = 20;
