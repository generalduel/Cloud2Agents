import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import type { Subscriptions } from "razorpay/dist/types/subscriptions";
import type { Payments } from "razorpay/dist/types/payments";
import type { Orders } from "razorpay/dist/types/orders";
import APIError from "@/lib/api/errors";
import { users } from "@/db/schema/user";
import { razorpayWebhookEvents } from "@/db/schema/razorpay";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import updatePlan from "@/lib/plans/updatePlan";
import downgradeToDefaultPlan from "@/lib/plans/downgradeToDefaultPlan";
import { addCredits } from "@/lib/credits/recalculate";
import { type CreditType } from "@/lib/credits/credits";
import { creditTypeSchema } from "@/lib/credits/config";
import { allocatePlanCredits } from "@/lib/credits/allocatePlanCredits";
import { getPlanFromRazorpayPlanId } from "@/lib/plans/getPlanFromRazorpayPlanId";
import { getRazorpay } from "@/lib/razorpay/client";
import { readRazorpayNotes } from "@/lib/razorpay/checkout";
import {
  trackCreditsPurchased,
  trackSubscriptionCancelled,
  trackSubscriptionCreated,
  trackSubscriptionUpdated,
} from "@/lib/analytics";

type RazorpayWebhookEvent = {
  event: string;
  payload: {
    subscription?: { entity: Subscriptions.RazorpaySubscription };
    payment?: { entity: Payments.RazorpayPayment };
    order?: { entity: Orders.RazorpayOrder };
  };
};

// Statuses in which the customer should have access to the plan
const ENTITLED_STATUSES = ["authenticated", "active", "pending"];

/** Resolve the app user from subscription notes, falling back to the stored subscription id. */
async function resolveUserForSubscription(sub: Subscriptions.RazorpaySubscription) {
  const { userId } = readRazorpayNotes(sub.notes);
  if (userId) {
    const row = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (row[0]) {
      return row[0];
    }
  }
  const row = await db
    .select()
    .from(users)
    .where(eq(users.razorpaySubscriptionId, sub.id))
    .limit(1);
  return row[0] ?? null;
}

class RazorpayWebhookHandler {
  /**
   * Grants the plan behind the subscription and stores Razorpay ids on the user.
   * Webhooks can arrive late or out of order, so the live status is re-fetched
   * and nothing is granted for a subscription that has already ended.
   */
  async syncSubscription(
    eventSub: Subscriptions.RazorpaySubscription,
    payment?: Payments.RazorpayPayment
  ) {
    const sub = await getRazorpay().subscriptions.fetch(eventSub.id);
    if (!ENTITLED_STATUSES.includes(sub.status)) {
      return null;
    }

    const user = await resolveUserForSubscription(sub);
    if (!user) {
      throw new APIError(`Could not resolve user for subscription ${sub.id}`);
    }

    const dbPlan = await getPlanFromRazorpayPlanId(sub.plan_id);
    if (!dbPlan) {
      throw new APIError(`No local plan for Razorpay plan ${sub.plan_id}`);
    }

    const isNewSubscription = user.razorpaySubscriptionId !== sub.id;
    await db
      .update(users)
      .set({
        razorpaySubscriptionId: sub.id,
        razorpayCustomerId:
          sub.customer_id ?? payment?.customer_id ?? user.razorpayCustomerId,
        // A scheduled cancellation belongs to the previous subscription
        ...(isNewSubscription ? { razorpayCancelsAt: null } : {}),
      })
      .where(eq(users.id, user.id));

    if (user.planId !== dbPlan.id) {
      await updatePlan({ userId: user.id, newPlanId: dbPlan.id });
    }

    return { user, dbPlan, sub };
  }

  // Mandate authorised (first payment, or start of a trial)
  async onSubscriptionAuthenticated(eventSub: Subscriptions.RazorpaySubscription) {
    const synced = await this.syncSubscription(eventSub);
    if (!synced) return;
    await trackSubscriptionCreated(synced.user.id, {
      provider: "razorpay",
      plan_id: synced.dbPlan.id,
      subscription_id: synced.sub.id,
      status: synced.sub.status,
    });
  }

  // activated / resumed / updated (plan change)
  async onSubscriptionActive(eventSub: Subscriptions.RazorpaySubscription) {
    const synced = await this.syncSubscription(eventSub);
    if (!synced) return;
    await trackSubscriptionUpdated(synced.user.id, {
      provider: "razorpay",
      subscription_id: synced.sub.id,
      status: synced.sub.status,
    });
  }

  // Every successful charge (first + renewals) allocates the plan's credits once per payment
  async onSubscriptionCharged(
    eventSub: Subscriptions.RazorpaySubscription,
    payment?: Payments.RazorpayPayment
  ) {
    const synced = await this.syncSubscription(eventSub, payment);
    if (!synced) return;
    await allocatePlanCredits({
      userId: synced.user.id,
      planId: synced.dbPlan.id,
      paymentId: payment?.id ?? `${eventSub.id}_${eventSub.paid_count}`,
      paymentMetadata: {
        source: "razorpay_subscription",
        subscriptionId: eventSub.id,
        razorpayPlanId: eventSub.plan_id,
      },
    });
  }

  // cancelled (incl. cancel-at-cycle-end once the cycle ends), completed, halted, paused
  async onSubscriptionEnded(sub: Subscriptions.RazorpaySubscription) {
    if (sub.status === "halted") {
      // Halted subscriptions can revive when the customer retries payment —
      // cancel it so a new subscription can't end up with two live mandates.
      try {
        await getRazorpay().subscriptions.cancel(sub.id, false);
      } catch (error) {
        console.error("Razorpay: failed to cancel halted subscription", sub.id, error);
      }
    }

    const row = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.razorpaySubscriptionId, sub.id))
      .limit(1);
    if (!row[0]) {
      return;
    }
    await downgradeToDefaultPlan({ userId: row[0].id });
    await trackSubscriptionCancelled(row[0].id, {
      provider: "razorpay",
      subscription_id: sub.id,
      status: sub.status,
    });
  }

  async onOrderPaid(
    order: Orders.RazorpayOrder,
    payment?: Payments.RazorpayPayment
  ) {
    const notes = readRazorpayNotes(order.notes);
    const paymentId = payment?.id ?? order.id;

    if (notes.type === "credits_purchase") {
      const { creditType, amount, userId } = notes;
      if (!creditType || !amount || !userId) {
        throw new APIError("Invalid credits purchase notes");
      }
      const parsedCreditType = creditTypeSchema.safeParse(creditType);
      if (!parsedCreditType.success) {
        throw new APIError(`Invalid credit type: ${creditType}`);
      }
      const creditAmount = parseInt(amount, 10);
      if (Number.isNaN(creditAmount) || creditAmount <= 0) {
        throw new APIError(`Invalid credit amount: ${amount}`);
      }

      try {
        await addCredits(
          userId,
          parsedCreditType.data as CreditType,
          creditAmount,
          `razorpay_payment_${paymentId}`,
          {
            reason: "Purchase via Razorpay",
            razorpayOrderId: order.id,
            amountPaid: Number(order.amount_paid),
            currency: order.currency,
          }
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
          return;
        }
        throw error;
      }
      await trackCreditsPurchased(userId, {
        provider: "razorpay",
        credit_type: parsedCreditType.data,
        amount: creditAmount,
        order_id: order.id,
        payment_id: paymentId,
      });
      return;
    }

    // Subscription invoices also emit order.paid — those carry no `type` note
    if (notes.type === "plan_purchase") {
      const { userId, planId } = notes;
      if (!userId || !planId) {
        throw new APIError("Invalid plan purchase notes");
      }
      await db
        .update(users)
        .set(
          payment?.customer_id ? { razorpayCustomerId: payment.customer_id } : {}
        )
        .where(eq(users.id, userId));
      await updatePlan({ userId, newPlanId: planId });
      await allocatePlanCredits({
        userId,
        planId,
        paymentId: `razorpay_payment_${paymentId}`,
        paymentMetadata: {
          source: "razorpay_order",
          orderId: order.id,
        },
      });
    }
  }
}

/** Records the event id; returns false if this delivery was already processed. */
async function claimEvent(eventId: string | null, event: string) {
  if (!eventId) return true;
  const inserted = await db
    .insert(razorpayWebhookEvents)
    .values({ id: eventId, event })
    .onConflictDoNothing()
    .returning({ id: razorpayWebhookEvents.id });
  return inserted.length > 0;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Razorpay webhook not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (
    !signature ||
    !Razorpay.validateWebhookSignature(body, signature, secret)
  ) {
    return new NextResponse(null, { status: 403 });
  }

  const event = JSON.parse(body) as RazorpayWebhookEvent;
  const eventId = req.headers.get("x-razorpay-event-id");
  if (!(await claimEvent(eventId, event.event))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const sub = event.payload.subscription?.entity;
  const payment = event.payload.payment?.entity;
  const order = event.payload.order?.entity;
  const handler = new RazorpayWebhookHandler();

  try {
    switch (event.event) {
      case "subscription.authenticated":
        if (sub) await handler.onSubscriptionAuthenticated(sub);
        break;
      case "subscription.activated":
      case "subscription.resumed":
      case "subscription.updated":
        if (sub) await handler.onSubscriptionActive(sub);
        break;
      case "subscription.charged":
        if (sub) await handler.onSubscriptionCharged(sub, payment);
        break;
      case "subscription.cancelled":
      case "subscription.completed":
      case "subscription.halted":
      case "subscription.paused":
        if (sub) await handler.onSubscriptionEnded(sub);
        break;
      case "order.paid":
        if (order) await handler.onOrderPaid(order, payment);
        break;
      default:
        break;
    }
  } catch (error) {
    if (error instanceof APIError) {
      // Acknowledge so Razorpay doesn't retry (and eventually disable the webhook)
      console.error(`Razorpay webhook ${event.event}:`, error.message);
      return NextResponse.json({ received: true, message: error.message });
    }
    // Unexpected failure — release the event id so Razorpay's retry is processed
    if (eventId) {
      await db
        .delete(razorpayWebhookEvents)
        .where(eq(razorpayWebhookEvents.id, eventId));
    }
    throw error;
  }

  return NextResponse.json({ received: true });
}

export const maxDuration = 20;
