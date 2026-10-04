"use server";

import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  buildCallbackUrl,
  redirectToSignIn,
} from "@/lib/auth/redirect-to-sign-in";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { plans, Quotas } from "@/db/schema/plans";
import { PlanProvider } from "@/lib/plans/getSubscribeUrl";
import { getStripe } from "@/lib/stripe";
import { getPolar } from "@/lib/polar/client";
import { ensurePolarCustomerIdForUser } from "@/lib/polar/ensureCustomer";
import {
  createRazorpayCreditsOrder,
  RAZORPAY_MIN_AMOUNT,
  toRazorpayAmount,
} from "@/lib/razorpay/checkout";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  creditBuyParams,
  getCreditsPrice,
  type CreditType,
} from "@/lib/credits/credits";
import { createPaypalCreditOrderLink } from "@/lib/paypal/api";
import { createCreditCheckout } from "@/lib/dodopayments";
import { createPaddleCreditCheckout } from "@/lib/paddle";
import { creditsConfig, enableCredits } from "@/lib/credits/config";

async function CreditsBuyPage({
  searchParams,
}: {
  searchParams: Promise<{
    creditType: CreditType;
    amount: string;
    provider: PlanProvider;
    billing_country?: string;
    billing_state?: string;
    billing_city?: string;
    billing_street?: string;
    billing_zipcode?: string;
    tax_id?: string;
  }>;
}) {
  if (!enableCredits) {
    return redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/error?code=CREDITS_DISABLED&message=Credits are disabled`
    );
  }
  const params = await searchParams;
  const { creditType, amount, provider } = params;

  try {
    creditBuyParams.parse({
      creditType,
      amount: Number(amount),
      provider,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/error?code=INVALID_PARAMS&message=${error.message}`
      );
    }
    throw error;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const signInCallback = buildCallbackUrl("/app/credits/buy", params);

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
  const creditAmount = Number(amount);

  // Get user's current plan for pricing calculation
  let userPlan: { id: string; codename: string; quotas: Quotas } | undefined =
    undefined;
  if (user.planId) {
    const currentPlan = await db
      .select({
        id: plans.id,
        codename: plans.codename,
        quotas: plans.quotas,
      })
      .from(plans)
      .where(eq(plans.id, user.planId))
      .limit(1)
      .then((res) => res[0]);

    if (currentPlan.codename && currentPlan.quotas) {
      userPlan = {
        id: currentPlan.id,
        codename: currentPlan.codename,
        quotas: currentPlan.quotas,
      };
    }
  }

  // Calculate the price for the credits with user's plan
  let totalPrice: number;
  try {
    totalPrice = getCreditsPrice(creditType, creditAmount, userPlan);
  } catch (error) {
    return redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/error?code=PRICE_CALCULATION_ERROR&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Failed to calculate price"
      )}`
    );
  }

  switch (provider) {
    case PlanProvider.PAYPAL:
      // Create PayPal order for credit purchase

      const paypalOrderUrl = await createPaypalCreditOrderLink(
        creditType,
        creditAmount,
        totalPrice * 100, // Convert to cents
        user.id
      );

      // Success: redirect immediately to PayPal checkout
      return redirect(paypalOrderUrl);

    case PlanProvider.STRIPE:
      // Create a one-time payment checkout session
      const stripeCheckoutSession = await getStripe().checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${creditAmount} ${creditType} Credits`,
                description: `Purchase of ${creditAmount} credits for ${creditType}`,
              },
              unit_amount: Math.round(totalPrice * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        customer: user.stripeCustomerId ?? undefined,
        customer_email: user.stripeCustomerId
          ? undefined
          : (session?.user?.email ?? undefined),
        billing_address_collection: "required",
        tax_id_collection: {
          enabled: true,
        },
        customer_update: user.stripeCustomerId
          ? {
              name: "auto",
              address: "auto",
            }
          : undefined,
        customer_creation: user.stripeCustomerId ? undefined : "always",
        metadata: {
          creditType,
          amount: creditAmount.toString(),
          userId: user.id,
          type: "credits_purchase",
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/success?provider=${provider}&creditType=${creditType}&amount=${creditAmount}&sessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/cancel?provider=${provider}&creditType=${creditType}&amount=${creditAmount}&sessionId={CHECKOUT_SESSION_ID}`,
      });

      if (!stripeCheckoutSession.url) {
        console.error(
          "Checkout session URL not created",
          stripeCheckoutSession
        );
        throw new Error("Checkout session URL not found");
      }

      // Success: redirect immediately to Stripe checkout
      return redirect(stripeCheckoutSession.url);

    case PlanProvider.DODO:
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
          `/app/credits/buy`,
          process.env.NEXT_PUBLIC_APP_URL
        );

        // Add all current search params to the URL
        Object.entries(params).forEach(([key, value]) => {
          if (typeof value === "string") {
            currentUrl.searchParams.set(key, value);
          }
        });

        return redirect(
          `/app/subscribe/billing-form?callbackUrl=${encodeURIComponent(
            currentUrl.toString()
          )}`
        );
      }

      // Extract tax ID from query parameters if available
      const taxId = tax_id;

      // Create checkout session based on plan type
      const dodoProductId = process.env.DODO_CREDITS_PRODUCT_ID;

      if (!dodoProductId) {
        throw new Error("Dodo product ID not found");
      }

      const dodoCheckoutResponse = await createCreditCheckout({
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
        creditAmount: creditAmount,
        creditType: creditType,
        userId: user.id,
        totalPrice: totalPrice, // Pass the calculated price for pay-what-you-want
      });

      if (!dodoCheckoutResponse.payment_link) {
        throw new Error("DodoPayments checkout link not found");
      }
      return redirect(dodoCheckoutResponse.payment_link);

    case PlanProvider.PADDLE:
      const paddleProductId = process.env.PADDLE_CREDITS_PRODUCT_ID;
      if (!paddleProductId) {
        throw new Error("Paddle credits product ID not found in environment variables");
      }

      // Create Paddle checkout
      const paddleCheckout = await createPaddleCreditCheckout({
        user: {
          id: user.id,
          email: session.user.email,
          paddleCustomerId: user.paddleCustomerId,
        },
        productId: paddleProductId,
        creditAmount: creditAmount,
        creditType: creditType,
        totalPrice: totalPrice,
      });

      if (paddleCheckout.transactionId) {
        return redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/paddle?transactionId=${paddleCheckout.transactionId}`
        );
      }

      if (!paddleCheckout.url) {
        throw new Error("Paddle checkout URL not found");
      }
      return redirect(paddleCheckout.url);

    case PlanProvider.POLAR: {
      const polarCreditsProductId = process.env.POLAR_CREDITS_PRODUCT_ID;
      if (!polarCreditsProductId) {
        throw new Error("POLAR_CREDITS_PRODUCT_ID is not configured");
      }
      const polar = getPolar();
      const polarCustomerId = await ensurePolarCustomerIdForUser({
        polar,
        user,
      });
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
      const unitCents = Math.round(totalPrice * 100);
      const polarCheckout = await polar.checkouts.create({
        products: [polarCreditsProductId],
        prices: {
          [polarCreditsProductId]: [
            {
              amountType: "fixed",
              priceAmount: unitCents,
              priceCurrency: "usd",
            },
          ],
        },
        metadata: {
          type: "credits_purchase",
          creditType,
          amount: String(creditAmount),
          userId: user.id,
        },
        customerId: polarCustomerId,
        allowDiscountCodes: true,
        requireBillingAddress: true,
        successUrl: `${baseUrl}/app/credits/buy/success?provider=${PlanProvider.POLAR}&creditType=${creditType}&amount=${creditAmount}&checkout_id={CHECKOUT_ID}`,
        returnUrl: `${baseUrl}/app/credits/buy/cancel?provider=${PlanProvider.POLAR}&creditType=${creditType}&amount=${creditAmount}`,
      });
      if (!polarCheckout.url) {
        throw new Error("Polar checkout URL not found");
      }
      return redirect(polarCheckout.url);
    }

    case PlanProvider.RAZORPAY: {
      const currency = creditsConfig[creditType].currency;
      const amountInSmallestUnit = toRazorpayAmount(totalPrice, currency);
      if (amountInSmallestUnit < RAZORPAY_MIN_AMOUNT) {
        return redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/error?code=PRICE_CALCULATION_ERROR&message=${encodeURIComponent(
            "Amount is below Razorpay's minimum order value"
          )}`
        );
      }
      const order = await createRazorpayCreditsOrder({
        amountInSmallestUnit,
        currency,
        userId: user.id,
        creditType,
        creditAmount,
      });
      const checkoutParams = new URLSearchParams({
        purpose: "credits",
        orderId: order.id,
        orderAmount: String(order.amount),
        currency: order.currency,
        creditType,
        amount: String(creditAmount),
      });
      return redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe/razorpay?${checkoutParams.toString()}`
      );
    }

    default:
      return redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/error?code=UNSUPPORTED_PROVIDER&message=Payment provider not supported`
      );
  }
}

export default CreditsBuyPage;
