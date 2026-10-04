import { Suspense } from "react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { CreditsBuyErrorClient } from "./credits-buy-error-client";

function CreditsBuyErrorShimmer() {
  return (
    <div
      className="container max-w-lg mx-auto py-12"
      aria-busy
      aria-label="Loading error details"
    >
      <Card className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-4 w-56 max-w-full" />
          <div className="flex flex-col sm:flex-row gap-2 items-center w-full pt-2">
            <Skeleton className="h-10 w-full sm:flex-1 sm:max-w-[140px] rounded-md" />
            <Skeleton className="h-10 w-full sm:flex-1 sm:max-w-[160px] rounded-md" />
          </div>
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      </Card>
    </div>
  );
}

export default function CreditsBuyErrorPage() {
  return (
    <Suspense fallback={<CreditsBuyErrorShimmer />}>
      <CreditsBuyErrorClient />
    </Suspense>
  );
}
