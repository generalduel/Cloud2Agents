import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/lib/auth/withSuperAdminAuthRequired";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";

export const POST = withSuperAdminAuthRequired(async (req, context) => {
  const { id } = (await context.params) as { id: string };
  const currentUser = context.session.user;

  try {
    await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, currentUser.id));

    const response = await auth.api.impersonateUser({
      body: { userId: id },
      headers: req.headers,
      asResponse: true,
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Failed to impersonate user" },
        { status: response.status }
      );
    }

    return new NextResponse(JSON.stringify({ url: "/app" }), {
      status: 200,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Error impersonating user:", error);
    return NextResponse.json(
      { error: "Failed to impersonate user" },
      { status: 500 }
    );
  }
});
