import { Suspense } from "react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { CreditsBuySuccessClient } from "./credits-buy-success-client";

function CreditsBuySuccessShimmer() {
  return (
    <div
      className="container max-w-lg mx-auto py-12"
      aria-busy
      aria-label="Loading purchase confirmation"
    >
      <Card className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <div className="flex items-center justify-center gap-2 w-full">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-36" />
          </div>
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-4 w-48 max-w-full" />
          <div className="flex flex-col sm:flex-row gap-2 items-center w-full pt-2">
            <Skeleton className="h-10 w-full sm:flex-1 sm:max-w-[180px] rounded-md" />
            <Skeleton className="h-10 w-full sm:flex-1 sm:max-w-[160px] rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function CreditsBuySuccessPage() {
  return (
    <Suspense fallback={<CreditsBuySuccessShimmer />}>
      <CreditsBuySuccessClient />
    </Suspense>
  );
}
