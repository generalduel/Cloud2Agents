import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirectToSignIn } from "@/lib/auth/redirect-to-sign-in";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { creditTransactions } from "@/db/schema/credits";
import { eq, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  History,
  Plus,
  Minus,
  Clock,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { creditsConfig } from "@/lib/credits/config";
import { type CreditType } from "@/lib/credits/credits";
import { cn } from "@/lib/utils";

// Transaction type styles map
const transactionTypeStyles = {
  credit: {
    variant: "default" as const,
    icon: Plus,
    className: "bg-green-500 text-white",
  },
  debit: {
    variant: "secondary" as const,
    icon: Minus,
    className: "bg-red-500 text-white",
  },
  expired: {
    variant: "outline" as const,
    icon: Clock,
    className: "bg-yellow-500 text-black",
  },
  default: {
    variant: "outline" as const,
    icon: CreditCard,
    className: "bg-gray-500 text-white",
  },
} as const;

// Format currency
const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
};

// Format date
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Get credit type display name
const getCreditTypeDisplayName = (creditType: CreditType) => {
  return creditsConfig[creditType]?.name || creditType.replace("_", " ");
};

export default async function CreditsHistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.email) {
    redirectToSignIn("/app/credits/history");
  }

  // Get user data
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1)
    .then((res) => res[0]);

  if (!user) {
    redirectToSignIn("/app/credits/history");
  }

  // Get credit transactions (last 50)
  const transactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, user.id))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(50);

  // Calculate current balances
  const currentCredits = user.credits || {};
  const creditTypes = Object.keys(creditsConfig) as CreditType[];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/app">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <History className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">Credits History</h1>
        </div>
      </div>

      <p className="text-muted-foreground mb-8">
        View your complete credit transaction history and current balances.
      </p>

      {/* Current Balances */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {creditTypes.map((creditType) => {
          const balance = currentCredits[creditType] || 0;
          const config = creditsConfig[creditType];

          return (
            <Card key={creditType}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>{config.name}</span>
                  <Badge variant="outline" className="px-3 py-1 text-lg">
                    {balance.toLocaleString()}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Available {creditType.replace("_", " ")} credits
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            {transactions.length > 0
              ? `Showing your last ${transactions.length} transactions`
              : "No transactions found"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">
                No transactions yet
              </h3>
              <p className="mb-4 text-muted-foreground">
                Your credit transactions will appear here once you make your
                first purchase or use credits.
              </p>
              <Button asChild>
                <Link href="/#credits">
                  <Plus className="mr-2 h-4 w-4" />
                  Buy Credits
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Credit Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const typeStyle =
                      transactionTypeStyles[
                        transaction.transactionType as keyof typeof transactionTypeStyles
                      ] || transactionTypeStyles.default;
                    const TypeIcon = typeStyle.icon;

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Badge
                            variant={typeStyle.variant}
                            className={cn(
                              "flex items-center gap-1 w-fit",
                              typeStyle.className
                            )}
                          >
                            <TypeIcon className="h-3 w-3" />
                            {transaction.transactionType
                              .charAt(0)
                              .toUpperCase() +
                              transaction.transactionType.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {getCreditTypeDisplayName(transaction.creditType)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {transaction.transactionType === "credit"
                              ? "+"
                              : "-"}
                            {transaction.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {transaction.metadata?.reason || "N/A"}
                            {transaction.metadata?.amountPaid && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Paid:{" "}
                                {formatCurrency(
                                  transaction.metadata.amountPaid as number,
                                  (transaction.metadata.currency as string) ||
                                    "USD"
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(transaction.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-xs font-mono text-muted-foreground">
                            {transaction.paymentId || "N/A"}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
        <Button asChild>
          <Link href="/#credits">
            <Plus className="mr-2 h-4 w-4" />
            Buy More Credits
          </Link>
        </Button>
      </div>
    </div>
  );
}
