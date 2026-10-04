import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { eq } from "drizzle-orm";
import { addCredits } from "./recalculate";
import { enableCredits, onPlanChangeCredits } from "./config";
import { type CreditType } from "./credits";
import { CreditTransaction } from "@/db/schema/credits";
import { addDays } from "date-fns";

export interface AllocatePlanCreditsParams {
  userId: string;
  planId: string;
  paymentId: string;
  paymentMetadata?: CreditTransaction["metadata"];
}

/**
 * Allocates credits to a user based on their new plan
 * @param params - Parameters object containing userId, planId, paymentId, and optional paymentMetadata
 */
export async function allocatePlanCredits(
  params: AllocatePlanCreditsParams
): Promise<void> {
  if(!enableCredits) {
    return;
  }
  const { userId, planId, paymentId, paymentMetadata } = params;

  try {
    // Get the plan details from the database
    const plan = await db
      .select({
        id: plans.id,
        name: plans.name,
        codename: plans.codename,
      })
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    if (!plan.length || !plan[0].codename) {
      console.log(
        `Plan ${planId} not found or has no codename, skipping credit allocation`
      );
      return;
    }

    const planCodename = plan[0].codename;
    const planName = plan[0].name;

    // Check if this plan has credit allocations configured
    const planCredits = onPlanChangeCredits[planCodename];
    if (!planCredits) {
      console.log(
        `No credit allocations configured for plan ${planCodename}, skipping`
      );
      return;
    }

    console.log(
      `Allocating credits for plan ${planCodename} (${planName}) to user ${userId}`
    );

    // Allocate credits for each credit type configured for this plan
    const creditAllocations = Object.entries(planCredits) as Array<
      [CreditType, { amount: number; expiryAfter?: number }]
    >;

    for (const [creditType, creditConfig] of creditAllocations) {
      try {
        // Create a unique payment ID for each credit type using raw payment ID
        const creditPaymentId = `${paymentId}_${creditType}`;

        // Calculate expiry date if expiryAfter is provided
        const expirationDate = creditConfig.expiryAfter
          ? addDays(new Date(), creditConfig.expiryAfter).toISOString()
          : undefined;

        const metadata: CreditTransaction["metadata"] = {
          reason: `Plan upgrade to ${planName}`,
          planId,
          planCodename,
          planName,
          creditType,
          expiryAfter: creditConfig.expiryAfter,
          expirationDate,
          ...paymentMetadata,
        };

        await addCredits(
          userId,
          creditType,
          creditConfig.amount,
          creditPaymentId,
          metadata,
          expirationDate ? new Date(expirationDate) : null
        );

        console.log(
          `Successfully allocated ${creditConfig.amount} ${creditType} credits to user ${userId} for plan ${planCodename}`
        );
      } catch (error) {
        console.error(
          `Error allocating ${creditType} credits for user ${userId}:`,
          error
        );

        // If it's a duplicate payment error, that's okay - idempotency working
        if (
          error instanceof Error &&
          error.message.includes("already exists")
        ) {
          console.log(
            `Credits allocation already processed for ${creditType} on plan ${planCodename} for user ${userId}`
          );
        } else {
          // Log error but don't throw - we want to continue with other credit types
          console.error(
            `Failed to allocate ${creditType} credits for plan ${planCodename}:`,
            error
          );
        }
      }
    }

    console.log(
      `Completed credit allocation for plan ${planCodename} to user ${userId}`
    );
  } catch (error) {
    console.error("Error in allocatePlanCredits:", error);
    throw new Error(
      `Failed to allocate plan credits: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
