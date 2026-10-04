import { db } from "@/db";
import { creditTransactions } from "@/db/schema/credits";
import { and, eq, lte, isNotNull } from "drizzle-orm";
import { inngest } from "../client";
import { enableCredits } from "@/lib/credits/config";
import { addCreditTransaction } from "@/lib/credits/recalculate";
import { endOfDay } from "date-fns";

export const expireCredits = inngest.createFunction(
  {
    id: "expire-credits",
    triggers: { cron: "0 2 * * *" },
  },
  async ({ step, logger }) => {
    // Step 1: Check if credits system is enabled
    if (!enableCredits) {
      return {
        message: "Credits are disabled, skipping expiration",
      };
    }

    // Step 2: Calculate expiration date range using date-fns
    const expirationCutoff = endOfDay(new Date()); // End of current day

    // Step 3: Get total count of expiring transactions for planning
    const totalExpiringCount = await step.run(
      "count-expiring-transactions",
      async () => {
        const result = await db
          .select({ count: creditTransactions.id })
          .from(creditTransactions)
          .where(
            and(
              eq(creditTransactions.transactionType, "credit"),
              lte(creditTransactions.expirationDate, expirationCutoff),
              isNotNull(creditTransactions.expirationDate)
            )
          );

        return result.length;
      }
    );

    if (totalExpiringCount === 0) {
      return {
        message: "No credits to expire today",
        processedAt: new Date().toISOString(),
      };
    }

    // Step 4: Prepare batch parameters and process all batches in parallel
    const batchSize = 50;
    const totalBatches = Math.ceil(totalExpiringCount / batchSize);
    
    logger.info(`Processing ${totalExpiringCount} transactions in ${totalBatches} parallel batches of ${batchSize}`);

    // Create batch processing steps (without awaiting) for parallel execution
    const batchSteps = Array.from({ length: totalBatches }, (_, batchIndex) => {
      const offset = batchIndex * batchSize;
      const batchNumber = batchIndex + 1;
      
      return step.run(
        {
          id: `process-batch-${batchNumber}`,
          name: `Process Batch ${batchNumber}/${totalBatches} (offset: ${offset})`,
        },
        async () => {
          // Fetch transactions for this batch
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
            )
            .limit(batchSize)
            .offset(offset);

          if (expiringTransactions.length === 0) {
            return { processed: 0, skipped: 0, errors: 0, batchNumber };
          }

          // Process all transactions in this batch in parallel
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
                      eq(
                        creditTransactions.paymentId,
                        `expired_${transaction.id}`
                      )
                    )
                  )
                  .limit(1);

                if (existingExpiredTransaction.length > 0) {
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
                    reason: "Credits expired via Inngest",
                    originalTransactionId: transaction.id,
                    expirationDate: transaction.expirationDate?.toString(),
                  }
                );

                return { status: "processed", transactionId: transaction.id };
              } catch (error) {
                logger.error(
                  `Failed to expire credits for transaction ${transaction.id}:`,
                  error
                );
                return { status: "error", transactionId: transaction.id, error };
              }
            }
          );

          // Wait for all transactions in this batch to complete
          const settledResults = await Promise.allSettled(transactionPromises);

          // Aggregate results for this batch
          const batchResults = {
            processed: 0,
            skipped: 0,
            errors: 0,
            batchNumber,
          };

          settledResults.forEach((result) => {
            if (result.status === "fulfilled") {
              const { status } = result.value;
              if (status === "processed") batchResults.processed++;
              else if (status === "skipped") batchResults.skipped++;
              else if (status === "error") batchResults.errors++;
            } else {
              batchResults.errors++;
            }
          });

          logger.info(
            `Batch ${batchNumber} completed: ${batchResults.processed} processed, ${batchResults.skipped} skipped, ${batchResults.errors} errors`
          );

          return batchResults;
        }
      );
    });

    // Run all batches in parallel using Promise.all
    const allBatchResults = await Promise.all(batchSteps);

    // Step 5: Aggregate results from all batches and return final summary
    return await step.run("generate-summary", async () => {
      const totalResults = allBatchResults.reduce(
        (acc, batchResult) => ({
          processed: acc.processed + batchResult.processed,
          skipped: acc.skipped + batchResult.skipped,
          errors: acc.errors + batchResult.errors,
        }),
        { processed: 0, skipped: 0, errors: 0 }
      );

      logger.info(
        `All ${totalBatches} batches completed in parallel. Total: ${totalResults.processed} processed, ${totalResults.skipped} skipped, ${totalResults.errors} errors`
      );

      return {
        message: "Credit expiration job completed successfully",
        totalTransactionsFound: totalExpiringCount,
        batchesProcessed: totalBatches,
        processed: totalResults.processed,
        skipped: totalResults.skipped,
        errors: totalResults.errors,
        processedAt: new Date().toISOString(),
        expirationCutoff: expirationCutoff.toISOString(),
        parallelExecution: true,
      };
    });
  }
);
