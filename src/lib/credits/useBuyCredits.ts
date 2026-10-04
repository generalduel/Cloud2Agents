"use client";

import { useMemo } from "react";
import useCurrentPlan from "@/lib/users/useCurrentPlan";
import { getCreditsBuyUrl, getCreditsPrice, type CreditType } from "./credits";
import { creditsConfig } from "./config";
import { PlanProvider } from "../plans/getSubscribeUrl";

interface UseBuyCreditsResult {
  price: number | undefined;
  currency: string | undefined;
  isLoading: boolean;
  error: Error | undefined;
  getBuyCreditsUrl: (provider: PlanProvider) => string;
}

const useBuyCredits = (
  creditType: CreditType,
  amount: number
): UseBuyCreditsResult => {
  const { currentPlan, isLoading, error } = useCurrentPlan();

  const result = useMemo(() => {
    // If plan data is still loading, return loading state
    if (isLoading) {
      return {
        price: undefined,
        currency: undefined,
        isLoading: true,
        error: undefined,
        getBuyCreditsUrl: () => "",
      };
    }

    try {
      // Pass user's current plan for personalized pricing, fallback to base price for non-authenticated users
      const validCurrentPlan =
        currentPlan && currentPlan.codename && currentPlan.quotas
          ? {
              id: currentPlan.id,
              codename: currentPlan.codename,
              quotas: currentPlan.quotas,
            }
          : undefined;

      const price = getCreditsPrice(creditType, amount, validCurrentPlan);
      const currency = creditsConfig[creditType].currency;

      return {
        price,
        currency,
        isLoading: false,
        error: undefined,
        getBuyCreditsUrl: (provider: PlanProvider) =>
          getCreditsBuyUrl({ creditType, amount, provider }),
      };
    } catch (error) {
      return {
        price: undefined,
        currency: undefined,
        isLoading: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
        getBuyCreditsUrl: (provider: PlanProvider) =>
          getCreditsBuyUrl({ creditType, amount, provider }),
      };
    }
  }, [creditType, amount, currentPlan, isLoading, error]);

  return result;
};

export default useBuyCredits;
