import { NextResponse } from "next/server";
import { db } from "@/db";
import { creditTransactions } from "@/db/schema/credits";
import { and, eq, lte, isNotNull } from "drizzle-orm";
import { enableCredits } from "@/lib/credits/config";
import { addCreditTransaction } from "@/lib/credits/recalculate";
import { endOfDay } from "date-fns";
import cronAuthRequired from "@/lib/auth/cronAuthRequired";

const handleExpireCredits = async () => {
  try {
    // Check if credits system is enabled
    if (!enableCredits) {
      return NextResponse.json({
        success: true,
        message: "Credits are disabled, skipping expiration",
        processedAt: new Date().toISOString(),
      });
    }

    // Calculate expiration cutoff using date-fns
    const expirationCutoff = endOfDay(new Date());

    // Find all credit transactions that should expire today
    const expiringTransactions = await db
      .select({
        id: creditTransactions.id,
        userId: creditTransactions.userId,
        creditType: creditTransactions.creditType,
        amount: creditTransactions.amount,
        paymentId: creditTransactions.paymentId,
        expirationDate: creditTransactions.expirationDate,
      })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.transactionType, "credit"),
          lte(creditTransactions.expirationDate, expirationCutoff),
          isNotNull(creditTransactions.expirationDate)
        )
      );

    if (expiringTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No credits to expire today",
        processedAt: new Date().toISOString(),
        totalTransactions: 0,
      });
    }

    // Process all expiring transactions concurrently using Promise.allSettled
    const transactionPromises = expiringTransactions.map(
      async (transaction) => {
        try {
          // Check if this transaction has already been expired
          const existingExpiredTransaction = await db
            .select({ id: creditTransactions.id })
            .from(creditTransactions)
            .where(
              and(
                eq(creditTransactions.userId, transaction.userId),
                eq(creditTransactions.creditType, transaction.creditType),
                eq(creditTransactions.transactionType, "expired"),
                eq(creditTransactions.paymentId, `expired_${transaction.id}`)
              )
            )
            .limit(1);

          if (existingExpiredTransaction.length > 0) {
            console.log(
              `Credits already expired for transaction ${transaction.id}`
            );
            return { status: "skipped", transactionId: transaction.id };
          }

          // Create expired transaction
          await addCreditTransaction(
            transaction.userId,
            transaction.creditType,
            "expired",
            transaction.amount,
            `expired_${transaction.id}`,
            {
              reason: "Credits expired via cron",
              originalTransactionId: transaction.id,
              expirationDate: transaction.expirationDate?.toString(),
            }
          );

          console.log(
            `Expired ${transaction.amount} ${transaction.creditType} credits for user ${transaction.userId}`
          );
          return { status: "processed", transactionId: transaction.id };
        } catch (error) {
          console.error(
            `Failed to expire credits for transaction ${transaction.id}:`,
            error
          );
          return { status: "error", transactionId: transaction.id, error };
        }
      }
    );

    // Wait for all transactions to complete
    const settledResults = await Promise.allSettled(transactionPromises);

    // Aggregate results
    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
    };

    settledResults.forEach((result) => {
      if (result.status === "fulfilled") {
        const { status } = result.value;
        if (status === "processed") results.processed++;
        else if (status === "skipped") results.skipped++;
        else if (status === "error") results.errors++;
      } else {
        // Promise itself was rejected (shouldn't happen with our error handling)
        results.errors++;
      }
    });

    return NextResponse.json({
      success: true,
      message: "Credit expiration completed successfully",
      totalTransactions: expiringTransactions.length,
      processed: results.processed,
      skipped: results.skipped,
      errors: results.errors,
      processedAt: new Date().toISOString(),
      expirationCutoff: expirationCutoff.toISOString(),
    });
  } catch (error) {
    console.error("Credit expiration cron job failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Credit expiration failed",
        error: error instanceof Error ? error.message : "Unknown error",
        processedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};

export const GET = cronAuthRequired(handleExpireCredits);
