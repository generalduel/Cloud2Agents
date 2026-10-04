"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Trash2,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { plans } from "@/db/schema/plans";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Minus, CreditCard } from "lucide-react";
import { enableCredits } from "@/lib/credits/config";

interface UserDetails {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  emailVerified: string | null;
  currentPlan: typeof plans.$inferSelect | null;
  stripeSubscriptionId: string | null;
  lemonSqueezySubscriptionId: string | null;
}

interface Plan {
  id: string;
  name: string;
  codename: string;
  default: boolean;
}

interface CreditTransaction {
  id: string;
  creditType: string;
  transactionType: "credit" | "debit" | "expired";
  amount: number;
  createdAt: string;
  metadata?: {
    reason?: string;
    adminAction?: boolean;
    adminEmail?: string;
  };
}

interface CreditData {
  currentCredits: Record<string, number>;
  transactions: CreditTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function UserDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Credit management state
  const [creditPage, setCreditPage] = useState(1);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditAction, setCreditAction] = useState<"add" | "deduct">("add");
  const [creditType, setCreditType] = useState<
    "image_generation" | "video_generation"
  >("image_generation");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [isProcessingCredit, setIsProcessingCredit] = useState(false);

  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR<UserDetails>(`/api/super-admin/users/${id}`);

  const { data: plansData } = useSWR<{ plans: Plan[] }>(
    "/api/super-admin/plans?limit=100"
  );

  const { data: creditData, mutate: mutateCreditData } = useSWR<CreditData>(
    `/api/super-admin/users/${id}/credits?page=${creditPage}&limit=10`
  );

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const handleImpersonate = async () => {
    try {
      const response = await fetch(`/api/super-admin/users/${id}/impersonate`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to impersonate user");
      }

      toast.success(`Now impersonating ${user?.name || user?.email}`);
      window.location.href = "/app";
    } catch (error) {
      toast.error("Failed to impersonate user");
      console.error("Impersonation error:", error);
    }
  };

  const handlePlanChange = async (planId: string) => {
    try {
      setIsUpdatingPlan(true);
      const response = await fetch(`/api/super-admin/users/${id}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update plan");
      }

      await mutate();
      toast.success("Plan updated successfully");
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update plan");
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleCreditSubmit = async () => {
    if (!creditAmount || !creditReason || parseFloat(creditAmount) <= 0) {
      toast.error("Please provide a valid amount (> 0) and reason");
      return;
    }

    try {
      setIsProcessingCredit(true);
      const response = await fetch(`/api/super-admin/users/${id}/credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: creditAction,
          creditType,
          amount: parseFloat(creditAmount),
          reason: creditReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to manage credits");
      }

      await mutateCreditData();
      toast.success(result.message);

      // Reset form
      setCreditAmount("");
      setCreditReason("");
      setIsCreditModalOpen(false);
    } catch (error) {
      console.error("Error managing credits:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to manage credits"
      );
    } finally {
      setIsProcessingCredit(false);
    }
  };

  const formatCreditType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-14rem)]">
        <div className="text-center">
          <h2 className="text-lg font-medium">Error loading user</h2>
          <p className="text-sm text-muted-foreground">
            Failed to load user details. Please try again.
          </p>
          <Button variant="ghost" size="sm" asChild className="mt-4">
            <Link href="/super-admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-14rem)]">
        <div className="text-center">
          <h2 className="text-lg font-medium">Loading...</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we load the user details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">User Details</h1>
        </div>
        <div className="flex items-center gap-2">
          {enableCredits && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreditModalOpen(true)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Credits
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleImpersonate}>
            <User className="h-4 w-4 mr-2" />
            Impersonate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => router.push(`/super-admin/users/${id}/delete`)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete User
          </Button>
        </div>
      </div>

      {/* Credit Management Modal */}
      <Dialog open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage User Credits</DialogTitle>
            <DialogDescription>
              Add or deduct credits for {user?.name || user?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="credit-action">Action</Label>
              <RadioGroup
                value={creditAction}
                onValueChange={(value: "add" | "deduct") =>
                  setCreditAction(value)
                }
                className="flex flex-row gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add" className="flex items-center gap-1">
                    <Plus className="h-4 w-4 text-green-600" />
                    Add Credits
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deduct" id="deduct" />
                  <Label htmlFor="deduct" className="flex items-center gap-1">
                    <Minus className="h-4 w-4 text-red-600" />
                    Deduct Credits
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="credit-type">Credit Type</Label>
              <Select
                value={creditType}
                onValueChange={(
                  value: "image_generation" | "video_generation"
                ) => setCreditType(value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image_generation">
                    Image Generation
                  </SelectItem>
                  <SelectItem value="video_generation">
                    Video Generation
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="credit-amount">Amount *</Label>
              <Input
                id="credit-amount"
                type="number"
                min="1"
                step="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Enter amount (must be > 0)"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="credit-reason">Reason *</Label>
              <Textarea
                id="credit-reason"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Enter reason for this credit transaction"
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsCreditModalOpen(false)}
              disabled={isProcessingCredit}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreditSubmit}
              disabled={
                isProcessingCredit ||
                !creditAmount ||
                !creditReason ||
                parseFloat(creditAmount) <= 0
              }
            >
              {isProcessingCredit
                ? "Processing..."
                : `${creditAction === "add" ? "Add" : "Deduct"} Credits`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-row gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Basic information about the user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback>
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || user?.email.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">
                  {user?.name || "Unnamed User"}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  User ID
                </dt>
                <dd className="text-sm font-mono mt-1">{user?.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Joined
                </dt>
                <dd className="text-sm mt-1">
                  {formatDate(user?.createdAt || null)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email Verified
                </dt>
                <dd className="text-sm mt-1">
                  {user?.emailVerified ? formatDate(user.emailVerified) : "No"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
            <CardDescription>
              Subscription and plan information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Current Plan
                </label>
                <Select
                  value={user?.currentPlan?.id || ""}
                  onValueChange={handlePlanChange}
                  disabled={isUpdatingPlan}
                >
                  <SelectTrigger className="w-full mt-1.5">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plansData?.plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                        {plan.default && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Plan Name
                  </dt>
                  <dd className="text-sm mt-1">
                    {user?.currentPlan?.name || "No Plan"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Plan Codename
                  </dt>
                  <dd className="text-sm font-mono mt-1">
                    {user?.currentPlan?.codename || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Stripe Subscription
                  </dt>
                  <dd className="text-sm font-mono mt-1">
                    {user?.stripeSubscriptionId || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    LemonSqueezy Subscription
                  </dt>
                  <dd className="text-sm font-mono mt-1">
                    {user?.lemonSqueezySubscriptionId || "N/A"}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      </div>
      {enableCredits && (
        <div className="flex flex-row gap-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Credits & History</CardTitle>
              <CardDescription>
                User credit balances and transaction history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="balance" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="balance">Current Balance</TabsTrigger>
                  <TabsTrigger value="history">Transaction History</TabsTrigger>
                </TabsList>

                <TabsContent value="balance" className="space-y-4">
                  {creditData?.currentCredits ? (
                    <div className="flex flex-col gap-3">
                      {Object.entries(creditData.currentCredits).map(
                        ([type, amount]) => (
                          <div
                            key={type}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatCreditType(type)}
                              </span>
                            </div>
                            <Badge
                              variant={amount > 0 ? "default" : "secondary"}
                            >
                              {amount} credits
                            </Badge>
                          </div>
                        )
                      )}
                      {Object.keys(creditData.currentCredits).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No credits available
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Loading credits...
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {creditData?.transactions ? (
                    <>
                      <div className="space-y-2">
                        {creditData.transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    transaction.transactionType === "credit"
                                      ? "default"
                                      : transaction.transactionType === "debit"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {transaction.transactionType === "credit"
                                    ? "+"
                                    : "-"}
                                  {transaction.amount}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {formatCreditType(transaction.creditType)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {transaction.metadata?.reason ||
                                  "No reason provided"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  transaction.createdAt
                                ).toLocaleString()}
                              </p>
                            </div>
                            {transaction.metadata?.adminAction && (
                              <Badge variant="outline" className="text-xs">
                                Admin Action
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {creditData.pagination && (
                        <div className="flex items-center justify-between pt-4">
                          <p className="text-sm text-muted-foreground">
                            Page {creditData.pagination.page} of{" "}
                            {creditData.pagination.totalPages}(
                            {creditData.pagination.total} total)
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCreditPage(creditPage - 1)}
                              disabled={!creditData.pagination.hasPrev}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCreditPage(creditPage + 1)}
                              disabled={!creditData.pagination.hasNext}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Loading transaction history...
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
