"use client";

import { useSearchParams } from "next/navigation";

import { BillingForm } from "./billing-form";

const DEFAULT_CALLBACK = "/app/subscribe";

function normalizeCallbackUrl(raw: string | null): string {
  const t = raw?.trim();
  return t ? t : DEFAULT_CALLBACK;
}

export function BillingFormClient() {
  const searchParams = useSearchParams();
  const callbackUrl = normalizeCallbackUrl(searchParams.get("callbackUrl"));

  return <BillingForm callbackUrl={callbackUrl} />;
}
