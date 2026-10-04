import { NextRequest, NextResponse } from "next/server";
import { getPaddleClient } from "@/lib/paddle/client";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { plans } from "@/db/schema/plans";
import { eq, or } from "drizzle-orm";
import updatePlan from "@/lib/plans/updatePlan";
import downgradeToDefaultPlan from "@/lib/plans/downgradeToDefaultPlan";
import getOrCreateUser from "@/lib/users/getOrCreateUser";
import {
  EventEntity,
  EventName,
  SubscriptionCanceledEvent,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
  TransactionCompletedEvent,
} from "@paddle/paddle-node-sdk";
import { allocatePlanCredits } from "@/lib/credits/allocatePlanCredits";
import { addCredits } from "@/lib/credits/recalculate";
import { type CreditType } from "@/lib/credits/credits";
import { creditTypeSchema } from "@/lib/credits/config";
import {
  trackCreditsPurchased,
  trackSubscriptionCancelled,
  trackSubscriptionCreated,
  trackSubscriptionUpdated,
} from "@/lib/analytics";

class PaddleWebhookHandler {
  private event: EventEntity;
  private paddleClient: ReturnType<typeof getPaddleClient>;

  constructor(event: EventEntity) {
    this.event = event;
    this.paddleClient = getPaddleClient();
  }

  async handleSubscriptionCreated() {
    const subscription = this.event.data as SubscriptionCreatedEvent["data"];
    console.log("Subscription created event received", subscription.id);
    const priceId = subscription.items[0]?.price?.id;
    if (!priceId) {
      console.log("No price ID found in subscription items");
      return;
    }

    const dbPlan = await this._getPlanFromPaddlePriceId(priceId);
    if (!dbPlan) {
      console.log(`Plan not found for Paddle price ID: ${priceId}`);
      return;
    }

    const user = await this._getUserFromCustomer(subscription.customerId);
    if (!user) {
      console.log(
        `User not found for Paddle customer ID: ${subscription.customerId}`
      );
      return;
    }

    await db
      .update(users)
      .set({ paddleSubscriptionId: subscription.id })
      .where(eq(users.id, user.id));

    await updatePlan({
      userId: user.id,
      newPlanId: dbPlan.id,
    });

    await trackSubscriptionCreated(user.id, {
      provider: "paddle",
      plan_id: dbPlan.id,
      subscription_id: subscription.id,
    });

    await allocatePlanCredits({
      userId: user.id,
      planId: dbPlan.id,
      paymentId: subscription.id,
      paymentMetadata: {
        source: "paddle_subscription_created",
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        status: subscription.status,
      },
    });
  }

  async handleSubscriptionUpdated() {
    const subscription = this.event.data as SubscriptionUpdatedEvent["data"];
    console.log("Subscription updated event received", subscription.id);
    const priceId = subscription.items[0]?.price?.id;
    if (!priceId) return;

    const dbPlan = await this._getPlanFromPaddlePriceId(priceId);
    if (!dbPlan) {
      console.log(`Plan not found for Paddle price ID: ${priceId}`);
      return;
    }

    const user = await this._getUserFromCustomer(subscription.customerId);
    if (!user) {
      console.log(
        `User not found for updated subscription customer ID: ${subscription.customerId}`
      );
      return;
    }

    if (
      subscription.status !== "active" &&
      subscription.status !== "trialing"
    ) {
      console.log(
        `Subscription status is ${subscription.status}, skipping plan update/credits`
      );
      if (subscription.status === "canceled") {
        await downgradeToDefaultPlan({ userId: user.id });
        await trackSubscriptionCancelled(user.id, {
          provider: "paddle",
          subscription_id: subscription.id,
        });
      }
      return;
    }

    await updatePlan({
      userId: user.id,
      newPlanId: dbPlan.id,
    });

    await trackSubscriptionUpdated(user.id, {
      provider: "paddle",
      plan_id: dbPlan.id,
      subscription_id: subscription.id,
      status: subscription.status,
    });

    await allocatePlanCredits({
      userId: user.id,
      planId: dbPlan.id,
      paymentId: `${subscription.id}_${subscription.updatedAt || new Date().toISOString()}`,
      paymentMetadata: {
        source: "paddle_subscription_updated",
        subscriptionId: subscription.id,
        status: subscription.status,
      },
    });
  }

  async handleSubscriptionCanceled() {
    const subscription = this.event.data as SubscriptionCanceledEvent["data"];
    const user = await db
      .select()
      .from(users)
      .where(eq(users.paddleSubscriptionId, subscription.id))
      .limit(1)
      .then((res) => res[0]);

    if (user) {
      await downgradeToDefaultPlan({ userId: user.id });
      await trackSubscriptionCancelled(user.id, {
        provider: "paddle",
        subscription_id: subscription.id,
      });
    }
  }

  async handleTransactionCompleted() {
    const transaction = this.event.data as TransactionCompletedEvent["data"];
    if (
      transaction.status !== "completed" &&
      transaction.status !== "billed" &&
      transaction.status !== "paid"
    ) {
      return;
    }

    // Handle credit purchases via custom data
    if (
      transaction.customData &&
      typeof transaction.customData === "object" &&
      "purchaseType" in transaction.customData &&
      transaction.customData.purchaseType === "credits"
    ) {
      await this._handleCreditsPurchase(transaction);
      return;
    }

    // Handle plan purchases
    const priceId = transaction.items[0]?.price?.id;
    if (!priceId) return;

    const dbPlan = await this._getPlanFromPaddlePriceId(priceId);
    if (!dbPlan) {
      console.log(`Plan not found for Paddle price ID: ${priceId}`);
      return;
    }

    const user = await this._getUserFromCustomer(transaction.customerId!);
    if (!user) return;

    await updatePlan({
      userId: user.id,
      newPlanId: dbPlan.id,
    });

    await allocatePlanCredits({
      userId: user.id,
      planId: dbPlan.id,
      paymentId: transaction.id,
      paymentMetadata: {
        source: "paddle_transaction_completed",
        transactionId: transaction.id,
        subscriptionId: transaction.subscriptionId,
        amount: transaction.details?.totals?.total,
        currency: transaction.currencyCode,
      },
    });
  }

  private async _handleCreditsPurchase(
    transaction: TransactionCompletedEvent["data"]
  ) {
    if (!transaction.customData || typeof transaction.customData !== "object") {
      return;
    }

    const customData = transaction.customData as Record<string, unknown>;
    const userId = typeof customData.userId === "string" ? customData.userId : null;
    const creditTypeRaw = typeof customData.creditType === "string" ? customData.creditType : null;
    const creditAmountRaw = typeof customData.creditAmount === "string" ? customData.creditAmount : null;

    if (!userId || !creditTypeRaw || !creditAmountRaw) {
      console.error("Missing required credit purchase data in customData");
      return;
    }

    // Validate credit type
    const parsedCreditType = creditTypeSchema.safeParse(creditTypeRaw);
    if (!parsedCreditType.success) {
      console.error(`Invalid credit type: ${creditTypeRaw}`);
      return;
    }

    const creditAmount = parseInt(creditAmountRaw);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      console.error(`Invalid credit amount: ${creditAmountRaw}`);
      return;
    }

    // Verify user matches transaction customer
    const user = await this._getUserFromCustomer(transaction.customerId!);
    if (!user) {
      console.error(`User not found for customer ID: ${transaction.customerId}`);
      return;
    }

    if (user.id !== userId) {
      console.error("User ID mismatch for credit purchase", {
        metadataUserId: userId,
        actualUserId: user.id,
      });
      return;
    }

    try {
      await addCredits(
        userId,
        parsedCreditType.data as CreditType,
        creditAmount,
        transaction.id,
        {
          reason: "Purchase via Paddle",
          paddleTransactionId: transaction.id,
          amount: transaction.details?.totals?.total,
          currency: transaction.currencyCode,
        }
      );
      console.log(
        `Successfully added ${creditAmount} ${creditTypeRaw} credits to user ${userId}`
      );
      await trackCreditsPurchased(userId, {
        provider: "paddle",
        credit_type: parsedCreditType.data,
        amount: creditAmount,
        transaction_id: transaction.id,
      });
    } catch (error) {
      console.error("Error adding credits:", error);
      // If it's a duplicate payment error, that's okay - idempotency working
      if (error instanceof Error && error.message.includes("already exists")) {
        console.log(
          `Credits purchase already processed for transaction ${transaction.id}`
        );
      } else {
        throw error;
      }
    }
  }

  async _getPlanFromPaddlePriceId(priceId: string) {
    const plan = await db
      .select()
      .from(plans)
      .where(
        or(
          eq(plans.monthlyPaddlePriceId, priceId),
          eq(plans.yearlyPaddlePriceId, priceId),
          eq(plans.onetimePaddlePriceId, priceId)
        )
      )
      .limit(1);
    return plan[0] || null;
  }

  async _getUserFromCustomer(customerId: string) {
    if (!customerId) return null;

    let user = await db
      .select()
      .from(users)
      .where(eq(users.paddleCustomerId, customerId))
      .limit(1)
      .then((res) => res[0]);

    if (!user && this.paddleClient) {
      try {
        const customer = await this.paddleClient.customers.get(customerId);
        if (customer && customer.email) {
          const result = await getOrCreateUser({
            emailId: customer.email,
            name: customer.name ?? "",
          });
          user = result.user;
          await db
            .update(users)
            .set({ paddleCustomerId: customerId })
            .where(eq(users.id, user.id));
        }
      } catch (e) {
        console.error("Failed to fetch customer from Paddle", e);
      }
    }
    return user;
  }
}

export async function POST(req: NextRequest) {
  const paddle = getPaddleClient();
  if (!paddle) {
    return NextResponse.json(
      { error: "Paddle client not initialized" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("paddle-signature");
  const body = await req.text();
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Missing signature or secret" },
      { status: 401 }
    );
  }

  let event: EventEntity;
  try {
    event = await paddle.webhooks.unmarshal(body, secret, signature);
  } catch (e) {
    console.error("Webhook signature verification failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!event) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const handler = new PaddleWebhookHandler(event);

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
        await handler.handleSubscriptionCreated();
        break;
      case EventName.SubscriptionUpdated:
        await handler.handleSubscriptionUpdated();
        break;
      case EventName.SubscriptionCanceled:
        await handler.handleSubscriptionCanceled();
        break;
      case EventName.TransactionCompleted:
        await handler.handleTransactionCompleted();
        break;
      default:
        console.log(`Unhandled Paddle event: ${event.eventType}`);
    }
  } catch (error) {
    console.error("Error handling Paddle event:", error);
    return NextResponse.json(
      { error: "Error processing event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
