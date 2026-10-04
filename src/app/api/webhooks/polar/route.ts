import { NextRequest, NextResponse } from "next/server";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import type { Order } from "@polar-sh/sdk/models/components/order";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import APIError from "@/lib/api/errors";
import getOrCreateUser from "@/lib/users/getOrCreateUser";
import { users } from "@/db/schema/user";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import updatePlan from "@/lib/plans/updatePlan";
import downgradeToDefaultPlan from "@/lib/plans/downgradeToDefaultPlan";
import { addCredits } from "@/lib/credits/recalculate";
import { type CreditType } from "@/lib/credits/credits";
import { creditTypeSchema } from "@/lib/credits/config";
import { allocatePlanCredits } from "@/lib/credits/allocatePlanCredits";
import { getPlanFromPolarProductId } from "@/lib/plans/getPlanFromPolarProductId";
import {
  trackCreditsPurchased,
  trackSubscriptionCancelled,
  trackSubscriptionCreated,
  trackSubscriptionUpdated,
} from "@/lib/analytics";

function metaString(
  v: string | number | boolean | null | undefined
): string | undefined {
  if (v === null || v === undefined) return undefined;
  return String(v);
}

async function resolveUserFromPolarCustomer(customer: {
  externalId?: string | null;
  email?: string | null;
  name?: string | null;
}) {
  if (customer.externalId) {
    const row = await db
      .select()
      .from(users)
      .where(eq(users.id, customer.externalId))
      .limit(1);
    if (row[0]) {
      return row[0];
    }
  }
  if (customer.email) {
    const { user } = await getOrCreateUser({
      emailId: customer.email,
      name: customer.name ?? undefined,
    });
    return user;
  }
  return null;
}

async function syncPolarSubscription(userId: string, sub: Subscription) {
  const dbPlan = await getPlanFromPolarProductId(sub.productId);
  if (!dbPlan) {
    console.warn(
      "Polar: no local plan for product",
      sub.productId,
      "subscription",
      sub.id
    );
    return;
  }

  await db
    .update(users)
    .set({
      polarSubscriptionId: sub.id,
      polarCustomerId: sub.customer.id,
    })
    .where(eq(users.id, userId));

  await updatePlan({ userId, newPlanId: dbPlan.id });

  await trackSubscriptionCreated(userId, {
    provider: "polar",
    plan_id: dbPlan.id,
    subscription_id: sub.id,
  });

  await allocatePlanCredits({
    userId,
    planId: dbPlan.id,
    paymentId: sub.id,
    paymentMetadata: {
      source: "polar_subscription",
      subscriptionId: sub.id,
      productId: sub.productId,
    },
  });
}

class PolarWebhookHandler {
  async handleCreditsPurchase(order: Order) {
    const metadata = order.metadata;
    if (!metadata || metaString(metadata.type) !== "credits_purchase") {
      return false;
    }

    const creditType = metaString(metadata.creditType);
    const amountRaw = metaString(metadata.amount);
    const userId = metaString(metadata.userId);

    if (!creditType || !amountRaw || !userId) {
      throw new APIError("Invalid credits purchase metadata");
    }

    const parsedCreditType = creditTypeSchema.safeParse(creditType);
    if (!parsedCreditType.success) {
      throw new APIError(`Invalid credit type: ${creditType}`);
    }

    const creditAmount = parseInt(amountRaw, 10);
    if (Number.isNaN(creditAmount) || creditAmount <= 0) {
      throw new APIError(`Invalid credit amount: ${amountRaw}`);
    }

    const user = await resolveUserFromPolarCustomer(order.customer);
    if (!user || user.id !== userId) {
      throw new APIError("User ID mismatch in Polar credits purchase");
    }

    try {
      const paymentId = `polar_order_${order.id}`;
      await addCredits(
        user.id,
        parsedCreditType.data as CreditType,
        creditAmount,
        paymentId,
        {
          reason: "Purchase via Polar",
          polarOrderId: order.id,
          amountPaid: order.totalAmount,
          currency: order.currency,
        }
      );
      await trackCreditsPurchased(user.id, {
        provider: "polar",
        credit_type: parsedCreditType.data,
        amount: creditAmount,
        order_id: order.id,
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        return true;
      }
      throw new APIError(
        `Failed to add credits: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async onOrderPaid(order: Order) {
    if (await this.handleCreditsPurchase(order)) {
      return;
    }

    if (order.billingReason !== "purchase") {
      return;
    }

    const productId = order.productId;
    const dbPlan = await getPlanFromPolarProductId(productId);
    if (!dbPlan) {
      console.log(
        "Polar order.paid: no plan for product",
        productId,
        "— skipping"
      );
      return;
    }

    const user = await resolveUserFromPolarCustomer(order.customer);
    if (!user) {
      throw new APIError("Could not resolve user for Polar order");
    }

    await db
      .update(users)
      .set({ polarCustomerId: order.customer.id })
      .where(eq(users.id, user.id));

    await updatePlan({ userId: user.id, newPlanId: dbPlan.id });

    await allocatePlanCredits({
      userId: user.id,
      planId: dbPlan.id,
      paymentId: `polar_order_${order.id}`,
      paymentMetadata: {
        source: "polar_order",
        orderId: order.id,
        productId: productId ?? undefined,
      },
    });
  }

  async onSubscriptionActive(sub: Subscription) {
    const user = await resolveUserFromPolarCustomer(sub.customer);
    if (!user) {
      throw new APIError("Could not resolve user for Polar subscription");
    }
    await syncPolarSubscription(user.id, sub);
  }

  async onSubscriptionCreated(sub: Subscription) {
    const user = await resolveUserFromPolarCustomer(sub.customer);
    if (!user) {
      return;
    }
    await db
      .update(users)
      .set({
        polarSubscriptionId: sub.id,
        polarCustomerId: sub.customer.id,
      })
      .where(eq(users.id, user.id));
  }

  async onSubscriptionUpdated(sub: Subscription) {
    let userId: string | undefined;
    const row = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.polarSubscriptionId, sub.id))
      .limit(1);

    if (row[0]) {
      userId = row[0].id;
    } else {
      const user = await resolveUserFromPolarCustomer(sub.customer);
      if (!user) {
        return;
      }
      userId = user.id;
      await db
        .update(users)
        .set({
          polarSubscriptionId: sub.id,
          polarCustomerId: sub.customer.id,
        })
        .where(eq(users.id, userId));
    }

    const isActive = sub.status === "active" || sub.status === "trialing";

    if (!isActive) {
      await downgradeToDefaultPlan({ userId });
      await trackSubscriptionCancelled(userId, {
        provider: "polar",
        subscription_id: sub.id,
        status: sub.status,
      });
      return;
    }

    await syncPolarSubscription(userId, sub);

    await trackSubscriptionUpdated(userId, {
      provider: "polar",
      subscription_id: sub.id,
      status: sub.status,
    });
  }

  async onSubscriptionCanceled(sub: Subscription) {
    if (sub.cancelAtPeriodEnd) {
      return;
    }
    const row = await db
      .select()
      .from(users)
      .where(eq(users.polarSubscriptionId, sub.id))
      .limit(1);
    if (!row[0]) {
      return;
    }
    await downgradeToDefaultPlan({ userId: row[0].id });
    await trackSubscriptionCancelled(row[0].id, {
      provider: "polar",
      subscription_id: sub.id,
    });
  }

  async onSubscriptionRevoked(sub: Subscription) {
    const row = await db
      .select()
      .from(users)
      .where(eq(users.polarSubscriptionId, sub.id))
      .limit(1);
    if (!row[0]) {
      return;
    }
    await downgradeToDefaultPlan({ userId: row[0].id });
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Polar webhook not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, headers, secret);
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      return new NextResponse(null, { status: 403 });
    }
    throw e;
  }

  const handler = new PolarWebhookHandler();

  try {
    switch (event.type) {
      case "order.paid":
        await handler.onOrderPaid(event.data);
        break;
      case "subscription.created":
        await handler.onSubscriptionCreated(event.data);
        break;
      case "subscription.active":
        await handler.onSubscriptionActive(event.data);
        break;
      case "subscription.updated":
        await handler.onSubscriptionUpdated(event.data);
        break;
      case "subscription.canceled":
        await handler.onSubscriptionCanceled(event.data);
        break;
      case "subscription.revoked":
        await handler.onSubscriptionRevoked(event.data);
        break;
      default:
        break;
    }
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json({ received: true, message: error.message });
    }
    throw error;
  }

  return new NextResponse(null, { status: 202 });
}

export const maxDuration = 20;
