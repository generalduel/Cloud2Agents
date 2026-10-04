import { db } from "@/db";
import { plans } from "@/db/schema/plans";
import { eq, or } from "drizzle-orm";

export async function getPlanFromPolarProductId(productId: string | null) {
  if (!productId) {
    return null;
  }

  const plan = await db
    .select()
    .from(plans)
    .where(
      or(
        eq(plans.monthlyPolarProductId, productId),
        eq(plans.yearlyPolarProductId, productId),
        eq(plans.onetimePolarProductId, productId)
      )
    )
    .limit(1);

  return plan[0] ?? null;
}
