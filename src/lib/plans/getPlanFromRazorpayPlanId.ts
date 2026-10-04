import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { eq, or } from "drizzle-orm";

export async function getPlanFromRazorpayPlanId(
  razorpayPlanId: string | null | undefined
) {
  if (!razorpayPlanId) {
    return null;
  }

  const plan = await db
    .select()
    .from(plans)
    .where(
      or(
        eq(plans.monthlyRazorpayPlanId, razorpayPlanId),
        eq(plans.yearlyRazorpayPlanId, razorpayPlanId)
      )
    )
    .limit(1);

  return plan[0] ?? null;
}
