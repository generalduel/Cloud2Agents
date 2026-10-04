import { PlanType } from "@/lib/plans/getSubscribeUrl";
import { getRazorpay } from "./client";

/**
 * Razorpay sends `notes` as `[]` when empty and as an object otherwise.
 * Normalize to a plain string record.
 */
export function readRazorpayNotes(notes: unknown): Record<string, string> {
  if (!notes || Array.isArray(notes) || typeof notes !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(notes as Record<string, unknown>).map(([k, v]) => [
      k,
      String(v),
    ])
  );
}

// https://razorpay.com/docs/payments/international-payments/#supported-currencies
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF",
  "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "JOD", "KWD", "OMR", "TND"]);

// Razorpay rejects orders below 100 subunits (e.g. ₹1.00)
export const RAZORPAY_MIN_AMOUNT = 100;

/** Converts a major-unit amount (e.g. 9.99) to Razorpay's smallest currency unit. */
export function toRazorpayAmount(amount: number, currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(amount);
  }
  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    // Last digit must be 0 for three-decimal currencies
    return Math.round(amount * 100) * 10;
  }
  return Math.round(amount * 100);
}

const envCount = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

// Number of billing cycles before a Razorpay subscription completes.
// Razorpay requires a finite count and caps card mandates at ~10 years.
const totalCount = (type: PlanType) =>
  type === PlanType.YEARLY
    ? envCount(process.env.RAZORPAY_YEARLY_TOTAL_COUNT, 10)
    : envCount(process.env.RAZORPAY_MONTHLY_TOTAL_COUNT, 120);

export async function createRazorpaySubscription(params: {
  razorpayPlanId: string;
  type: PlanType;
  userId: string;
  planId: string;
  trialPeriodDays?: number;
}) {
  const { razorpayPlanId, type, userId, planId, trialPeriodDays } = params;
  return getRazorpay().subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: totalCount(type),
    customer_notify: 1,
    // Trial: the customer authorises the mandate now and is first charged at start_at
    start_at: trialPeriodDays
      ? Math.floor(Date.now() / 1000) + trialPeriodDays * 24 * 60 * 60
      : undefined,
    notes: { userId, planId, type },
  });
}

/** One-time plan purchase — amount and currency come from the Razorpay item. */
export async function createRazorpayPlanOrder(params: {
  razorpayItemId: string;
  userId: string;
  planId: string;
}) {
  const razorpay = getRazorpay();
  const item = await razorpay.items.fetch(params.razorpayItemId);
  if (item.active === false) {
    throw new Error(`Razorpay item ${params.razorpayItemId} is inactive`);
  }
  return razorpay.orders.create({
    amount: Number(item.amount),
    currency: item.currency,
    notes: {
      type: "plan_purchase",
      userId: params.userId,
      planId: params.planId,
    },
  });
}

export async function createRazorpayCreditsOrder(params: {
  amountInSmallestUnit: number;
  currency: string;
  userId: string;
  creditType: string;
  creditAmount: number;
}) {
  return getRazorpay().orders.create({
    amount: params.amountInSmallestUnit,
    currency: params.currency,
    notes: {
      type: "credits_purchase",
      userId: params.userId,
      creditType: params.creditType,
      amount: String(params.creditAmount),
    },
  });
}
