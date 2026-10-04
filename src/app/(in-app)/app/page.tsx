"use client";
import React from "react";
import useCurrentPlan from "@/lib/users/useCurrentPlan";
import useUser from "@/lib/users/useUser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BookOpenIcon,
  UserIcon,
  ShieldCheckIcon,
  ExternalLinkIcon,
  DatabaseIcon,
  SettingsIcon,
  CreditCardIcon,
} from "lucide-react";
import Link from "next/link";
import useCredits from "@/lib/users/useCredits";

function AppHomepage() {
  const {
    currentPlan,
    isLoading: planLoading,
    error: planError,
  } = useCurrentPlan();
  const {
    credits,
    isLoading: creditsLoading,
    error: creditsError,
  } = useCredits();
  const { user, isLoading: userLoading, error: userError } = useUser();

  const hasError = planError || userError || creditsError;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">In app dashboard</h1>
        <p className="text-muted-foreground">
          Explore the features and data available in your app. This demo
          showcases the hooks and utilities you can use throughout your
          application.
        </p>
      </div>

      {/* Error State */}
      {hasError && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading data:{" "}
            {planError?.message || userError?.message || creditsError?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Display Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Data Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              useUser() Hook Output
            </CardTitle>
            <CardDescription>
              Current user data from the /api/app/me endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : user ? (
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-80">
                {JSON.stringify(user, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">No user data available</p>
            )}
          </CardContent>
        </Card>

        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5" />
              useCurrentPlan() Hook Output
            </CardTitle>
            <CardDescription>
              Current subscription plan and quotas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {planLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : currentPlan ? (
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-80">
                {JSON.stringify(currentPlan, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">No plan data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            useCredits() Hook Output
          </CardTitle>
          <CardDescription>
            Current credits data from the /api/app/me endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          {creditsLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : credits ? (
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-80">
              {JSON.stringify(credits, null, 2)}
            </pre>
          ) : (
            <p className="text-muted-foreground">No credits data available</p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Navigate to different sections of the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1">
              <Link
                href="https://indiekit.pro/app/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpenIcon className="mr-2 h-4 w-4" />
                View Documentation
                <ExternalLinkIcon className="ml-2 h-3 w-3" />
              </Link>
            </Button>

            <Button asChild variant="outline" className="flex-1">
              <Link href="/app/profile">
                <UserIcon className="mr-2 h-4 w-4" />
                View User Profile
              </Link>
            </Button>

            <Button asChild variant="outline" className="flex-1">
              <Link href="/app/credits/history">
                <CreditCardIcon className="mr-2 h-4 w-4" />
                Credits History
              </Link>
            </Button>

            <Button asChild variant="default" className="flex-1">
              <Link href="/super-admin">
                <ShieldCheckIcon className="mr-2 h-4 w-4" />
                Super Admin
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Development Info */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">🔧 Development Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <ul className="list-disc list-inside flex flex-col gap-1">
            <li>Both hooks use SWR for caching and automatic revalidation</li>
            <li>
              Data is fetched from <code>/api/app/me</code> endpoint
            </li>
            <li>
              Super admin status is determined by SUPER_ADMIN_EMAILS environment
              variable
            </li>
            <li>
              All components follow the &apos;use client&apos; directive for
              client-side interactivity
            </li>
            <li>
              Error handling and loading states are built-in to both hooks
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default AppHomepage;
