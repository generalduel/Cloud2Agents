"use client";

import React, { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type RazorpaySubscriptionResponse = {
  subscription: {
    id: string;
    status: string;
    planName: string | null;
    currentEnd: number | null;
    chargeAt: number | null;
    cancelsAt: string | null;
  } | null;
};

const formatDate = (unix: number | null) =>
  unix ? new Date(unix * 1000).toLocaleDateString() : "—";

const isTrial = (status: string) => status === "authenticated";

function RazorpaySubscriptionManager() {
  const { data, error, isLoading, mutate } =
    useSWR<RazorpaySubscriptionResponse>("/api/app/razorpay");
  const [canceling, setCanceling] = useState(false);
  const sub = data?.subscription;

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const res = await fetch("/api/app/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Failed to cancel subscription.");
        return;
      }
      const result = await res.json();
      await mutate();
      toast.success(
        result.atCycleEnd
          ? "Subscription cancelled. You keep access until the end of the current billing period."
          : "Subscription cancelled."
      );
    } catch (e) {
      console.error("Failed to cancel subscription", e);
      toast.error("Failed to cancel subscription.");
    } finally {
      setCanceling(false);
    }
  };

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-destructive">{error.message}</div>;

  const cancellable =
    sub &&
    !sub.cancelsAt &&
    ["active", "authenticated", "pending", "halted"].includes(sub.status);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/app"
          className="text-sm text-muted-foreground hover:text-primary transition font-medium"
        >
          ← Back
        </Link>
        <h2 className="text-xl font-bold text-foreground">
          Razorpay Subscription
        </h2>
        <Link href="/contact" className="text-sm text-primary underline font-medium">
          Need Help?
        </Link>
      </div>
      {!sub ? (
        <div className="text-muted-foreground">
          No Razorpay subscription found.
        </div>
      ) : (
        <div className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary text-lg">
                {sub.planName ?? "Subscription"}
              </span>
              <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                {sub.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {sub.cancelsAt
                ? `Cancels on ${new Date(sub.cancelsAt).toLocaleDateString()} — you keep access until then`
                : isTrial(sub.status)
                  ? `Trial — first charge on ${formatDate(sub.chargeAt)}`
                  : `Renews on ${formatDate(sub.currentEnd)}`}
            </div>
            <div className="text-xs text-muted-foreground">
              Subscription ID: <span className="font-mono">{sub.id}</span>
            </div>
          </div>
          {cancellable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={canceling}>
                  {canceling ? "Cancelling..." : "Cancel Subscription"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isTrial(sub.status)
                      ? "Your trial ends immediately and you won't be charged."
                      : "Your subscription will not renew. You keep access until the end of the current billing period."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      variant="destructive"
                      disabled={canceling}
                      onClick={handleCancel}
                    >
                      Yes, Cancel Subscription
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  );
}

export default RazorpaySubscriptionManager;
