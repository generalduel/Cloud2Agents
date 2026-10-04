import type Stripe from "stripe";

function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function getLineItemPriceId(item: Stripe.InvoiceLineItem): string | null {
  return stripeId(item.pricing?.price_details?.price ?? null);
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const fromParent = stripeId(
    invoice.parent?.subscription_details?.subscription ?? null
  );
  if (fromParent) return fromParent;

  for (const line of invoice.lines.data) {
    const fromLine = stripeId(line.subscription);
    if (fromLine) return fromLine;
  }

  return null;
}
