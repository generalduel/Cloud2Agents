import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import type { Polar } from "@polar-sh/sdk";
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound";

type UserRow = typeof users.$inferSelect;

/**
 * Ensures a Polar customer exists for the app user, persists `polarCustomerId`, and returns
 * the Polar customer id for use with `checkouts.create({ customerId })`.
 *
 * Linking checkout to an existing customer disables email editing on Polar checkout
 * (see https://polar.sh/docs/guides/disable-email-editing-in-checkout).
 */
export async function ensurePolarCustomerIdForUser(params: {
  polar: Polar;
  user: Pick<UserRow, "id" | "email" | "name" | "polarCustomerId">;
}): Promise<string> {
  const { polar, user } = params;
  const email = user.email;
  if (!email) {
    throw new Error("User email is required for Polar customer");
  }

  if (user.polarCustomerId) {
    try {
      await polar.customers.get({ id: user.polarCustomerId });
      return user.polarCustomerId;
    } catch (e) {
      if (!(e instanceof ResourceNotFound)) {
        throw e;
      }
      // Stored id is stale (e.g. deleted in Polar) — resolve by external id or recreate.
    }
  }

  try {
    const existing = await polar.customers.getExternal({
      externalId: user.id,
    });
    if (existing.id !== user.polarCustomerId) {
      await db
        .update(users)
        .set({ polarCustomerId: existing.id })
        .where(eq(users.id, user.id));
    }
    return existing.id;
  } catch (e) {
    if (!(e instanceof ResourceNotFound)) {
      throw e;
    }
  }

  const created = await polar.customers.create({
    email,
    externalId: user.id,
    name: user.name ?? undefined,
    type: "individual",
  });

  await db
    .update(users)
    .set({ polarCustomerId: created.id })
    .where(eq(users.id, user.id));

  return created.id;
}
