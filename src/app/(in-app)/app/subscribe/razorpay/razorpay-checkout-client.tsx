"use client";

import { Loader2 } from "lucide-react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { appConfig } from "@/lib/config";
import useUser from "@/lib/users/useUser";

type RazorpayCheckoutOptions = {
  key: string;
  name: string;
  description?: string;
  subscription_id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  prefill?: { name?: string; email?: string };
  handler: () => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

export function RazorpayCheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const opened = useRef(false);

  const purpose = searchParams.get("purpose");
  const subscriptionId = searchParams.get("subscriptionId");
  const orderId = searchParams.get("orderId");
  const orderAmount = searchParams.get("orderAmount");
  const currency = searchParams.get("currency");

  // Success / cancel destinations are built here (never taken from the URL)
  const urls = useCallback(() => {
    if (purpose === "credits") {
      const query = new URLSearchParams({
        provider: "razorpay",
        creditType: searchParams.get("creditType") ?? "",
        amount: searchParams.get("amount") ?? "",
      }).toString();
      return {
        success: `/app/credits/buy/success?${query}`,
        cancel: `/app/credits/buy/cancel?${query}`,
      };
    }
    const query = new URLSearchParams({
      provider: "razorpay",
      codename: searchParams.get("codename") ?? "",
      type: searchParams.get("type") ?? "",
    }).toString();
    return {
      success: `/app/subscribe/success?${query}`,
      cancel: `/app/subscribe/error?code=RAZORPAY_CHECKOUT_CANCELLED`,
    };
  }, [purpose, searchParams]);

  const openCheckout = useCallback(() => {
    if (!window.Razorpay) return;
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      setError("Razorpay is not configured.");
      return;
    }
    if (!subscriptionId && !orderId) {
      setError("Checkout reference is missing.");
      return;
    }
    const { success, cancel } = urls();
    const checkout = new window.Razorpay({
      key,
      name: appConfig.projectName,
      ...(subscriptionId
        ? { subscription_id: subscriptionId }
        : {
            order_id: orderId ?? undefined,
            amount: orderAmount ? Number(orderAmount) : undefined,
            currency: currency ?? undefined,
          }),
      prefill: { name: user?.name, email: user?.email },
      handler: () => router.replace(success),
      modal: { ondismiss: () => router.replace(cancel) },
    });
    checkout.open();
  }, [subscriptionId, orderId, orderAmount, currency, urls, user, router]);

  useEffect(() => {
    if (!scriptLoaded || isLoading || opened.current) return;
    opened.current = true;
    openCheckout();
  }, [scriptLoaded, isLoading, openCheckout]);

  useEffect(() => {
    // Script already loaded by an earlier visit — onLoad won't fire again
    if (window.Razorpay) setScriptLoaded(true);
    const timer = setTimeout(() => setShowRetry(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/app")}
          className="text-sm underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setError("Failed to load payment system.")}
      />
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Opening secure checkout...</p>
        {showRetry ? (
          <button
            type="button"
            onClick={() => openCheckout()}
            className="text-sm underline cursor-pointer"
          >
            Click here if checkout doesn&apos;t open
          </button>
        ) : null}
      </div>
    </div>
  );
}
