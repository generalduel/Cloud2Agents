"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function getErrorMessage(code: string | null, fallbackMessage: string | null) {
  switch (code) {
    case "INVALID_PARAMS":
      return "Invalid parameters provided for credit purchase.";
    case "PRICE_CALCULATION_ERROR":
      return "Unable to calculate the price for the requested credits.";
    case "STRIPE_ERROR":
      return "There was an error processing your payment with Stripe.";
    case "PAYPAL_ERROR":
      return "There was an error processing your payment with PayPal.";
    case "PAYPAL_NOT_IMPLEMENTED":
      return "PayPal support for credits is not yet available.";
    case "UNSUPPORTED_PROVIDER":
      return "The selected payment provider is not supported.";
    case "CREDITS_DISABLED":
      return "Credits are disabled for this application. Check https://docs.indiekit.pro/payments/credits-system to see how to enable them.";
    default:
      return fallbackMessage || "An error occurred during your credit purchase.";
  }
}

function getDetailedMessage(code: string | null) {
  switch (code) {
    case "INVALID_PARAMS":
      return "Please check your credit type and amount selection.";
    case "PRICE_CALCULATION_ERROR":
      return "Please try again or contact support if the problem persists.";
    case "STRIPE_ERROR":
      return "Please try again with a different payment method or contact support.";
    case "PAYPAL_ERROR":
      return "Please try again with a different payment method or contact support.";
    case "PAYPAL_NOT_IMPLEMENTED":
      return "Please use Stripe for now. PayPal support will be added soon.";
    case "UNSUPPORTED_PROVIDER":
      return "Please select Stripe as your payment method.";
    default:
      return "Please try again. If the problem persists, please contact support.";
  }
}

export function CreditsBuyErrorClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <div className="container max-w-lg mx-auto py-12">
      <Card className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold">Credit Purchase Failed</h1>

          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="font-medium">{getErrorMessage(code, message)}</span>
          </div>

          <p className="text-muted-foreground">{getDetailedMessage(code)}</p>

          <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/#credits">Try Again</Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>

          <Button variant="ghost" asChild>
            <Link href="/app">Back to Dashboard</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
