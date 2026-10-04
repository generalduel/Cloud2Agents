import { auth } from "@/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { users } from "@/db/schema/user";
import {
  createOneTimePaymentCheckout,
  createSubscriptionCheckout,
} from "@/lib/dodopayments";
import { createCheckoutSession } from "@/lib/lemonsqueezy";
import { createPaddleCheckout } from "@/lib/paddle";
import {
  createPaypalOrderLink,
  createPaypalSubscriptionLink,
} from "@/lib/paypal/api";
import {
  PlanProvider,
  PlanType,
  subscribeParams,
  SubscribeParams,
} from "@/lib/plans/getSubscribeUrl";
import { getStripe } from "@/lib/stripe";
import { getPolar } from "@/lib/polar/client";
import { ensurePolarCustomerIdForUser } from "@/lib/polar/ensureCustomer";
import {
  createRazorpayPlanOrder,
  createRazorpaySubscription,
} from "@/lib/razorpay/checkout";
import {
  buildCallbackUrl,
  redirectToSignIn,
} from "@/lib/auth/redirect-to-sign-in";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import React from "react";
import { z } from "zod";

async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<
    SubscribeParams & {
      billing_country?: string;
      billing_state?: string;
      billing_city?: string;
      billing_street?: string;
      billing_zipcode?: string;
      tax_id?: string;
    }
  >;
}) {
  const params = await searchParams;
  const { codename, type, provider, trialPeriodDays } = params;

  try {
    subscribeParams.parse({
      codename,
      type,
      provider,
      trialPeriodDays: trialPeriodDays ? Number(trialPeriodDays) : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/error?code=INVALID_PARAMS&message=${error.message}`
      );
    }
    throw error;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const signInCallback = buildCallbackUrl("/app/subscribe", params);

  if (!session?.user?.email) {
    redirectToSignIn(signInCallback);
  }

  const dbUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!dbUsers?.[0]) {
    redirectToSignIn(signInCallback);
  }

  const user = dbUsers[0];

  //   Step 1: Get the plan
  const plansList = await db
    .select()
    .from(plans)
    .where(eq(plans.codename, codename))
    .limit(1);

  if (!plansList?.[0]) {
    return notFound();
  }

  const plan = plansList[0];

  switch (provider) {
    case PlanProvider.PAYPAL:
      // If this is one time plan then create Order
      // else create subscription
      if (type === PlanType.ONETIME) {
        const orderLink = await createPaypalOrderLink(plan.id, user.id);
        return redirect(orderLink);
      } else {
        const subscriptionLink = await createPaypalSubscriptionLink(
          plan.id,
          user.id,
          type
        );
        return redirect(subscriptionLink);
      }
      break;
    case PlanProvider.STRIPE:
      // Check type and get price id from db
      const key: keyof typeof plan | null =
        type === PlanType.MONTHLY
          ? "monthlyStripePriceId"
          : type === PlanType.YEARLY
            ? "yearlyStripePriceId"
            : type === PlanType.ONETIME
              ? "onetimeStripePriceId"
              : null;

      if (!key) {
        return notFound();
      }
      const priceId = plan[key];
      if (!priceId) {
        return notFound();
      }

      // Check if existing subscription for this user

      if (user.stripeSubscriptionId) {
        // If this is onetime plan then redirect to error page with message to
        // cancel existing subscription
        if (type === PlanType.ONETIME) {
          return redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/error?code=STRIPE_CANCEL_BEFORE_SUBSCRIBING`
          );
        }
        // If this is monthly or yearly plan then redirect to billing page
        return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/app/billing`);
      }

      //  Create checkout session
      const stripeCheckoutSession = await getStripe().checkout.sessions.create({
        mode: type === PlanType.ONETIME ? "payment" : "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        subscription_data: trialPeriodDays
          ? {
              trial_period_days: trialPeriodDays,
            }
          : undefined,
        customer: user.stripeCustomerId ?? undefined,
        customer_email: user.stripeCustomerId
          ? undefined
          : (session?.user?.email ?? undefined),
        billing_address_collection: "required",
        tax_id_collection: {
          enabled: true,
        },
        customer_update: user.stripeCustomerId
          ? user.stripeCustomerId
            ? {
                name: "auto",
                address: "auto",
              }
            : undefined
          : undefined,
        customer_creation: user.stripeCustomerId
          ? undefined
          : type === PlanType.ONETIME
            ? "always"
            : undefined,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/success?provider=${provider}&codename=${codename}&type=${type}&sessionId={CHECKOUT_SESSION_ID}&trialPeriodDays=${trialPeriodDays}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/cancel?provider=${provider}&codename=${codename}&type=${type}&sessionId={CHECKOUT_SESSION_ID}&trialPeriodDays=${trialPeriodDays}`,
      });

      if (!stripeCheckoutSession.url) {
        throw new Error("Checkout session URL not found");
      }
      return redirect(stripeCheckoutSession.url);
    case PlanProvider.LEMON_SQUEEZY:
      const lemonsqueezyKey: keyof typeof plan | null =
        type === PlanType.MONTHLY
          ? "monthlyLemonSqueezyVariantId"
          : type === PlanType.YEARLY
            ? "yearlyLemonSqueezyVariantId"
            : type === PlanType.ONETIME
              ? "onetimeLemonSqueezyVariantId"
              : null;

      if (!lemonsqueezyKey) {
        return notFound();
      }
      const lemonsqueezyVariantId = plan[lemonsqueezyKey];
      if (!lemonsqueezyVariantId) {
        return notFound();
      }

      // Check if existing subscription for this user
      if (user.lemonSqueezySubscriptionId) {
        // If this is onetime plan then redirect to error page with message to
        // cancel existing subscription
        if (type === PlanType.ONETIME) {
          return redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/error?code=LEMON_SQUEEZY_CANCEL_BEFORE_SUBSCRIBING`
          );
        }
        // If this is monthly or yearly plan then redirect to billing page
        return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/app/billing`);
      }

      const checkoutSession = await createCheckoutSession({
        variantId: lemonsqueezyVariantId,
        customerEmail: session?.user?.email ?? "",
      });
      if (!checkoutSession.data.url) {
        throw new Error("Checkout session URL not found");
      }
      return redirect(checkoutSession.data.url);
    case PlanProvider.DODO:
      const dodoKey: keyof typeof plan | null =
        type === PlanType.MONTHLY
          ? "monthlyDodoProductId"
          : type === PlanType.YEARLY
            ? "yearlyDodoProductId"
            : type === PlanType.ONETIME
              ? "onetimeDodoProductId"
              : null;

      if (!dodoKey) {
        return notFound();
      }
      const dodoProductId = plan[dodoKey];
      if (!dodoProductId) {
        return notFound();
      }

      // Check if existing subscription for this user
      if (user.dodoSubscriptionId) {
        // If this is onetime plan then redirect to error page with message to
        // cancel existing subscription
        if (type === PlanType.ONETIME) {
          return redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/error?code=DODO_CANCEL_BEFORE_SUBSCRIBING`
          );
        }
        // If this is monthly or yearly plan then redirect to billing page
        return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/app/billing`);
      }
      const {
        billing_country,
        billing_state,
        billing_city,
        billing_street,
        billing_zipcode,
        tax_id,
      } = params;
      // Check if billing information is provided in the query parameters
      const hasBillingInfo =
        billing_country &&
        billing_state &&
        billing_city &&
        billing_street &&
        billing_zipcode;

      // If not, redirect to the billing form
      if (!hasBillingInfo) {
        // Create the current URL as the callback URL
        const currentUrl = new URL(
          `/app/subscribe`,
          process.env.NEXT_PUBLIC_APP_URL
        );

        // Add all current search params to the URL
        Object.entries(params).forEach(([key, value]) => {
          if (typeof value === "string") {
            currentUrl.searchParams.set(key, value);
          }
        });

        console.log("currentUrl", currentUrl.toString());

        return redirect(
          `/app/subscribe/billing-form?callbackUrl=${encodeURIComponent(
            currentUrl.toString()
          )}`
        );
      }

      // Extract tax ID from query parameters if available
      const taxId = tax_id;

      // Create checkout session based on plan type
      let dodoCheckoutResponse;
      if (type === PlanType.ONETIME) {
        dodoCheckoutResponse = await createOneTimePaymentCheckout({
          productId: dodoProductId,
          customerEmail: session?.user?.email ?? "",
          customerId: user.dodoCustomerId ?? undefined,
          billing: {
            country: billing_country,
            state: billing_state,
            city: billing_city,
            street: billing_street,
            zipcode: billing_zipcode,
          },
          taxId: taxId,
        });
      } else {
        dodoCheckoutResponse = await createSubscriptionCheckout({
          productId: dodoProductId,
          customerEmail: session?.user?.email ?? "",
          customerId: user.dodoCustomerId ?? undefined,
          trialPeriodDays: trialPeriodDays
            ? Number(trialPeriodDays)
            : undefined,
          billing: {
            country: billing_country,
            state: billing_state,
            city: billing_city,
            street: billing_street,
            zipcode: billing_zipcode,
          },
          taxId: taxId,
        });
      }

      if (!dodoCheckoutResponse.payment_link) {
        throw new Error("DodoPayments checkout link not found");
      }
      return redirect(dodoCheckoutResponse.payment_link);
    case PlanProvider.PADDLE:
      const paddleKey: keyof typeof plan | null =
        type === PlanType.MONTHLY
          ? "monthlyPaddlePriceId"
          : type === PlanType.YEARLY
            ? "yearlyPaddlePriceId"
            : type === PlanType.ONETIME
              ? "onetimePaddlePriceId"
              : null;

      if (!paddleKey) {
        return notFound();
      }
      const paddlePriceId = plan[paddleKey];
      if (!paddlePriceId) {
        return notFound();
      }

      // Check if existing subscription for this user
      if (user.paddleSubscriptionId) {
        // If this is onetime plan then redirect to error page with message to
        // cancel existing subscription
        if (type === PlanType.ONETIME) {
          return redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/error?code=PADDLE_CANCEL_BEFORE_SUBSCRIBING`
          );
        }
        // If this is monthly or yearly plan then redirect to billing page
        return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/app/billing`);
      }

      const paddleCheckout = await createPaddleCheckout({
        user: {
          id: user.id,
          email: session.user.email,
          paddleCustomerId: user.paddleCustomerId,
        },
        priceId: paddlePriceId,
      });

      // Redirect to client-side page to open Paddle checkout modal
      if (paddleCheckout.transactionId) {
        return redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/paddle?transactionId=${paddleCheckout.transactionId}`
        );
      }
      break;
    case PlanProvider.POLAR: {
      const polarKey: keyof typeof plan | null =
        type === PlanType.MONTHLY
          ? "monthlyPolarProductId"
          : type === PlanType.YEARLY
            ? "yearlyPolarProductId"
            : type === PlanType.ONETIME
              ? "onetimePolarProductId"
              : null;

      if (!polarKey) {
        return notFound();
      }
      const polarProductId = plan[polarKey];
      if (!polarProductId || typeof polarProductId !== "string") {
        return notFound();
      }

      if (user.polarSubscriptionId) {
        if (type === PlanType.ONETIME) {
          return redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/error?code=POLAR_CANCEL_BEFORE_SUBSCRIBING`
          );
        }
        return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/app/billing`);
      }

      const polar = getPolar();
      const polarCustomerId = await ensurePolarCustomerIdForUser({
        polar,
        user,
      });
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
      const trialDays = trialPeriodDays ? Number(trialPeriodDays) : undefined;
      const polarCheckout = await polar.checkouts.create({
        products: [polarProductId],
        customerId: polarCustomerId,
        allowDiscountCodes: true,
        requireBillingAddress: true,
        trialInterval: trialDays ? "day" : undefined,
        trialIntervalCount: trialDays ?? undefined,
        allowTrial: trialDays ? true : false,
        successUrl: `${baseUrl}/app/subscribe/success?provider=${PlanProvider.POLAR}&codename=${codename}&type=${type}&checkout_id={CHECKOUT_ID}${
          trialPeriodDays ? `&trialPeriodDays=${trialPeriodDays}` : ""
        }`,
        returnUrl: `${baseUrl}/app/subscribe/error?code=POLAR_CHECKOUT_CANCELLED`,
      });

      if (!polarCheckout.url) {
        throw new Error("Polar checkout URL not found");
      }
      return redirect(polarCheckout.url);
    }
    case PlanProvider.RAZORPAY: {
      const razorpayKey: keyof typeof plan | null =
        type === PlanType.MONTHLY
          ? "monthlyRazorpayPlanId"
          : type === PlanType.YEARLY
            ? "yearlyRazorpayPlanId"
            : type === PlanType.ONETIME
              ? "onetimeRazorpayItemId"
              : null;

      if (!razorpayKey) {
        return notFound();
      }
      const razorpayId = plan[razorpayKey];
      if (!razorpayId || typeof razorpayId !== "string") {
        return notFound();
      }

      if (user.razorpaySubscriptionId) {
        if (type === PlanType.ONETIME) {
          return redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/error?code=RAZORPAY_CANCEL_BEFORE_SUBSCRIBING`
          );
        }
        return redirect(`${process.env.NEXT_PUBLIC_APP_URL}/app/billing`);
      }

      // Razorpay Checkout opens client-side; the webhook fulfils the purchase
      const checkoutParams = new URLSearchParams({
        purpose: "plan",
        codename,
        type,
      });
      if (type === PlanType.ONETIME) {
        const order = await createRazorpayPlanOrder({
          razorpayItemId: razorpayId,
          userId: user.id,
          planId: plan.id,
        });
        checkoutParams.set("orderId", order.id);
        checkoutParams.set("orderAmount", String(order.amount));
        checkoutParams.set("currency", order.currency);
      } else {
        const subscription = await createRazorpaySubscription({
          razorpayPlanId: razorpayId,
          type,
          userId: user.id,
          planId: plan.id,
          trialPeriodDays: trialPeriodDays
            ? Number(trialPeriodDays)
            : undefined,
        });
        checkoutParams.set("subscriptionId", subscription.id);
      }
      return redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/razorpay?${checkoutParams.toString()}`
      );
    }
    default:
      return <div>Provider not found</div>;
  }
}

export default SubscribePage;
