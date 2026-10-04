import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CreditsCancelPage({
  searchParams,
}: {
  searchParams: Promise<{
    provider?: string;
    creditType?: string;
    amount?: string;
  }>;
}) {
  const { provider, creditType, amount } = await searchParams;

  return (
    <div className="container max-w-lg mx-auto py-12">
      <Card className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <XCircle className="h-8 w-8 text-orange-500" />
          </div>
          
          <h1 className="text-2xl font-bold">Purchase Cancelled</h1>
          
          <p className="text-muted-foreground">
            Your credit purchase was cancelled. No charges were made to your account.
          </p>

          {creditType && amount && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              Cancelled: {amount} credits for {creditType}
              {provider && ` via ${provider}`}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/#credits">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Try Again
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/app">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
