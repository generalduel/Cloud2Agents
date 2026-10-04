import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/user";
import APIError from "../api/errors";
import { plans } from "@/db/schema/plans";
import { trackPlanUpdated } from "@/lib/analytics";

const updatePlan = async ({
  userId,
  newPlanId,
  sendEmail = true,
}: {
  userId: string;
  newPlanId: string;
  sendEmail?: boolean;
}) => {
  await db.update(users).set({ planId: newPlanId }).where(eq(users.id, userId));

  const plan = await db
    .select({ id: plans.id, name: plans.name })
    .from(plans)
    .where(eq(plans.id, newPlanId))
    .limit(1);

  if (!plan[0]) {
    throw new APIError("Plan not found");
  }

  await trackPlanUpdated(userId, {
    plan_id: plan[0].id,
    plan_name: plan[0].name ?? "",
  });

  if (sendEmail) {
    // TODO: Implement plan change email
  }
};

export default updatePlan;
