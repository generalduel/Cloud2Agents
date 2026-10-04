import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { getRazorpay } from "@/lib/razorpay/client";
import { getPlanFromRazorpayPlanId } from "@/lib/plans/getPlanFromRazorpayPlanId";

async function getBillingRow(userId: string) {
  const row = await db
    .select({
      razorpaySubscriptionId: users.razorpaySubscriptionId,
      razorpayCancelsAt: users.razorpayCancelsAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row[0] ?? null;
}

export const GET = withAuthRequired(async (req, context) => {
  const billing = await getBillingRow(context.session.user.id);
  if (!billing?.razorpaySubscriptionId) {
    return NextResponse.json({ subscription: null });
  }

  const sub = await getRazorpay().subscriptions.fetch(
    billing.razorpaySubscriptionId
  );
  const plan = await getPlanFromRazorpayPlanId(sub.plan_id);

  return NextResponse.json({
    subscription: {
      id: sub.id,
      status: sub.status,
      planName: plan?.name ?? null,
      currentEnd: sub.current_end ?? null,
      chargeAt: sub.charge_at ?? null,
      cancelsAt: billing.razorpayCancelsAt,
    },
  });
});

const cancelSchema = z.object({
  action: z.literal("cancel"),
});

export const POST = withAuthRequired(async (req, context) => {
  const parsed = cancelSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const billing = await getBillingRow(context.session.user.id);
  if (!billing?.razorpaySubscriptionId) {
    return NextResponse.json(
      { error: "No active Razorpay subscription" },
      { status: 404 }
    );
  }
  if (billing.razorpayCancelsAt) {
    return NextResponse.json(
      { error: "Subscription is already scheduled to cancel" },
      { status: 409 }
    );
  }

  try {
    const razorpay = getRazorpay();
    const current = await razorpay.subscriptions.fetch(
      billing.razorpaySubscriptionId
    );
    // Trials (authenticated, nothing charged yet) end right away; paid
    // subscriptions keep access until the end of the current billing cycle.
    // The subscription.cancelled webhook downgrades the user when it takes effect.
    const atCycleEnd = current.status === "active" && !!current.current_end;
    const sub = await razorpay.subscriptions.cancel(current.id, atCycleEnd);

    if (atCycleEnd && current.current_end) {
      await db
        .update(users)
        .set({ razorpayCancelsAt: new Date(current.current_end * 1000) })
        .where(eq(users.id, context.session.user.id));
    }
    return NextResponse.json({ status: sub.status, atCycleEnd });
  } catch (error) {
    // Razorpay SDK rejects with { error: { description } }
    const description =
      (error as { error?: { description?: string } })?.error?.description ??
      "Failed to cancel subscription";
    return NextResponse.json({ error: description }, { status: 400 });
  }
});
