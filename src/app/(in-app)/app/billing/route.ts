import { db } from "@/db";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getDodoClient } from "@/lib/dodopayments/client";
import { paypalContext } from "@/db/schema/paypal";
import { createPaddleCustomerPortalSession } from "@/lib/paddle";
import { users } from "@/db/schema/user";
import { getPolar } from "@/lib/polar/client";

export const GET = withAuthRequired(async (req, context) => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, context.session.user.id))
    .limit(1)
    .then((users) => users[0]);

  if (process.env.POLAR_ACCESS_TOKEN && user.polarCustomerId) {
    const polar = getPolar();
    const customerSession = await polar.customerSessions.create({
      customerId: user.polarCustomerId ?? "",
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app`,
    });
    return redirect(customerSession.customerPortalUrl);
  }

  // Razorpay has no hosted customer portal — manage the subscription in-app
  if (user.razorpaySubscriptionId) {
    return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/app/billing/razorpay`);
  }

  const dodoCustomerId = user.dodoCustomerId;
  if (dodoCustomerId) {
    const customerPortalSession =
      await getDodoClient().customers.customerPortal.create(dodoCustomerId);
    return redirect(customerPortalSession.link);
  }

  const paddleCustomerId = user.paddleCustomerId;
  if (paddleCustomerId) {
    const portalSession =
      await createPaddleCustomerPortalSession(paddleCustomerId);
    if (portalSession.urls?.general?.overview) {
      return redirect(portalSession.urls.general.overview);
    } else {
      return NextResponse.json({
        message: "Unable to create Paddle customer portal session.",
      });
    }
  }

  const stripeCustomerId = user.stripeCustomerId;

  if (stripeCustomerId) {
    // create customer portal link
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app`,
    });
    return redirect(portalSession.url);
  }
  const lemonSqueezyCustomerId = user.lemonSqueezyCustomerId;
  if (lemonSqueezyCustomerId) {
    // TODO: Get lemonSqueezy customer and redirect to lemonSqueezy customer portal
  }

  // Check if has paypal context
  const paypalContexts = await db
    .select()
    .from(paypalContext)
    .where(eq(paypalContext.userId, user.id));
  if (paypalContexts.length > 0) {
    return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/app/billing/paypal`);
  }

  return NextResponse.json({
    message: "You are not subscribed to any plan.",
  });
});
