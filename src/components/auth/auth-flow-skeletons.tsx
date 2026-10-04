import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors `AuthForm` layout (OAuth + divider + credential rows). Server-safe. */
export function AuthFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading sign-in form">
      <Skeleton className="h-12 w-full rounded-md" />
      <div className="relative py-2">
        <Skeleton className="mx-auto h-3 w-40" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}

/** Mirrors `SignUpForm` (name + email + submit). Server-safe. */
export function SignUpFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading sign-up form">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
