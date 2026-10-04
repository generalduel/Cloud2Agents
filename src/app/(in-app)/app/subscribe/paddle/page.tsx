import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { PaddleCheckoutClient } from "./paddle-checkout-client";

function PaddleCheckoutShimmer() {
  return (
    <div
      className="flex h-screen w-full items-center justify-center bg-background"
      aria-busy
      aria-label="Loading checkout"
    >
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-4 w-56 max-w-[90vw]" />
        <Skeleton className="h-3 w-64 max-w-[90vw]" />
      </div>
    </div>
  );
}

export default function PaddleCheckoutPage() {
  return (
    <Suspense fallback={<PaddleCheckoutShimmer />}>
      <PaddleCheckoutClient />
    </Suspense>
  );
}
