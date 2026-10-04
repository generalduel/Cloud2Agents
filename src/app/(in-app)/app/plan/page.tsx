"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, HelpCircle, TicketCheck, History, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import useCurrentPlan from "@/lib/users/useCurrentPlan";
import useUser from "@/lib/users/useUser";
import useCredits from "@/lib/users/useCredits";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { enableCredits, creditsConfig } from "@/lib/credits/config";
import { type CreditType } from "@/lib/credits/credits";

export default function BillingSettingsPage() {
  const { currentPlan, isLoading, error } = useCurrentPlan();
  const { user } = useUser();
  const { credits, isLoading: creditsLoading } = useCredits();
  const router = useRouter();
  // Check if organization has a plan with quotas
  const plan = currentPlan;
  const quotas = plan?.quotas;

  // Determine subscription status
  const hasSubscription = plan && !plan.default;

  useEffect(() => {
    if (isLoading) return;
    if (!currentPlan) {
      toast.info("You need to subscribe to a plan to continue");
      router.push("/#pricing");
    }
  }, [currentPlan, router, isLoading]);

  // Function to render quota features
  const renderQuotaFeatures = () => {
    if (!quotas) return null;

    // Convert quotas object to array for mapping
    const quotaItems = Object.entries(quotas).map(([key, value]) => {
      // Format the key for display
      const displayName = key
        .replace(/([A-Z])/g, " $1") // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter

      // Format the value based on its type
      let displayValue;
      if (typeof value === "boolean") {
        // Show true/false values as Yes/No
        displayValue = value ? "Yes" : "No";
      } else if (typeof value === "number") {
        // Show numbers as-is
        displayValue = value.toLocaleString();
      } else {
        // Show strings as-is
        displayValue = value;
      }

      return (
        <div
          key={key}
          className="flex items-center justify-between py-2 border-b last:border-0"
        >
          <div className="font-medium text-sm">{displayName}</div>
          <div className="text-sm">{displayValue}</div>
        </div>
      );
    });

    return quotaItems.length > 0 ? (
      <div className="space-y-0 divide-y">{quotaItems}</div>
    ) : (
      <p className="text-sm text-muted-foreground">
        No features information available.
      </p>
    );
  };

  // Function to render credits section
  const renderCreditsSection = () => {
    if (!enableCredits) return null;

    const creditTypes = Object.keys(creditsConfig) as CreditType[];
    const currentCredits = credits || {};

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Your Credits
          </CardTitle>
          <CardDescription>
            Current credit balances for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {creditsLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {creditTypes.map((creditType) => {
                const balance = currentCredits[creditType] || 0;
                const config = creditsConfig[creditType];

                return (
                  <div
                    key={creditType}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="font-medium text-sm">{config.name}</div>
                    <Badge variant="outline" className="px-3 py-1">
                      {balance.toLocaleString()}
                    </Badge>
                  </div>
                );
              })}
              {creditTypes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No credit types configured.
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild className="w-full">
            <Link href="/app/credits/history">
              <History className="mr-2 h-4 w-4" />
              View Credits History
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Since UserOrganizationWithPlan doesn't have customer IDs,
  // we'll just show a contact support message instead
  const customerIdSection = (
    <div className="mt-4 pt-4 border-t">
      <p className="text-xs text-muted-foreground">
        Need help with your subscription? Please contact support and mention
        your user ID:
        <span className="font-mono ml-1 bg-muted px-1 py-0.5 rounded-sm text-xs">
          {user?.id || "Not available"}
        </span>
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Billing & Usage</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and monitor resource usage.
        </p>
      </div>

      <div className={`grid gap-6 ${enableCredits ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              Your subscription plan and billing details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">
                Error loading plan details. Please refresh the page.
              </p>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {plan?.name || "Free Plan"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {!hasSubscription && (
                        <span>Limited features and capabilities</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={hasSubscription ? "default" : "outline"}
                    className="capitalize"
                  >
                    {hasSubscription ? "active" : "free"}
                  </Badge>
                </div>
                {customerIdSection}
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/app/billing">
                Manage Subscription
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/contact">
                Get Help
                <HelpCircle className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/app/redeem-ltd">
                Redeem LTD Code
                <TicketCheck className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Plan Includes</CardTitle>
            <CardDescription>
              Features and capabilities included in your current plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">
                Error loading plan features. Please refresh the page.
              </p>
            ) : (
              renderQuotaFeatures()
            )}
          </CardContent>
        </Card>

        {renderCreditsSection()}
      </div>
    </div>
  );
}
