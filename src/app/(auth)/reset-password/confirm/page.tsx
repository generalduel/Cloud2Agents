import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ResetPasswordConfirmClient } from "./reset-password-confirm-client";

function ResetPasswordConfirmShimmer() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy
      aria-label="Loading reset form"
    >
      <div className="mb-8 space-y-3">
        <Skeleton className="h-8 w-3/4 max-w-[280px]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<ResetPasswordConfirmShimmer />}>
      <ResetPasswordConfirmClient />
    </Suspense>
  );
}
