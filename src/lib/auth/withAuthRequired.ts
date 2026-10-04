import { auth, type AuthSession } from "@/auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { NextRequest, NextResponse } from "next/server";
import { plans } from "@/db/schema/plans";
import { MeResponse } from "@/app/api/app/me/types";

interface WithManagerHandler {
  (
    req: NextRequest,
    context: {
      session: AuthSession;
      getCurrentPlan: () => Promise<MeResponse["currentPlan"]>;
      getUser: () => Promise<MeResponse["user"]>;
      params: Promise<Record<string, unknown>>;
    }
  ): Promise<NextResponse | Response>;
}

const withAuthRequired = (handler: WithManagerHandler) => {
  return async (
    req: NextRequest,
    context: {
      params: Promise<Record<string, unknown>>;
    }
  ) => {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "You are not authorized to perform this action",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const getCurrentPlan = async () => {
      const user = await db.select().from(users).where(eq(users.id, userId));

      if (!user[0]?.planId) {
        return null;
      }

      const currentPlan = await db
        .select({
          id: plans.id,
          name: plans.name,
          codename: plans.codename,
          quotas: plans.quotas,
          default: plans.default,
        })
        .from(plans)
        .where(eq(plans.id, user[0].planId));

      return currentPlan[0] ?? null;
    };

    const getUser = async () => {
      return db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .then((rows) => rows[0]);
    };

    return handler(req, {
      ...context,
      session,
      getCurrentPlan,
      getUser,
    });
  };
};

export default withAuthRequired;
