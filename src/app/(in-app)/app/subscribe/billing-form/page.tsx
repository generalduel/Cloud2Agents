import { Suspense } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { BillingFormClient } from "./billing-form-client";

function BillingFormShimmer() {
  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-foreground/10 rounded-lg"
      aria-busy
      aria-label="Loading billing form"
    >
      <div className="w-full max-w-md space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="pb-3 space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="h-20 w-full rounded-md" />
            <div className="px-0 pt-4">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BillingFormPage() {
  return (
    <Suspense fallback={<BillingFormShimmer />}>
      <BillingFormClient />
    </Suspense>
  );
}
