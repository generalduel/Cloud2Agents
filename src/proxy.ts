import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { NextRequest } from "next/server";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
const { rewrite: rewriteLLM } = rewritePath("/docs/*path", "/llms.mdx/*path");

export async function proxy(req: NextRequest) {
  if (isMarkdownPreferred(req)) {
    const result = rewriteLLM(req.nextUrl.pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, req.nextUrl));
    }
  }

  const session = await auth.api.getSession({
    headers: req.headers,
  });
  const isAuth = !!session?.user;

  const isAPI = req.nextUrl.pathname.startsWith("/api/app");

  const isAuthPage =
    req.nextUrl.pathname.startsWith("/sign-in") ||
    req.nextUrl.pathname.startsWith("/sign-up") ||
    req.nextUrl.pathname.startsWith("/sign-out");

  if (isAuthPage) {
    if (isAuth && !req.nextUrl.pathname.startsWith("/sign-out")) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
    return NextResponse.next();
  }

  if (isAPI) {
    if (!isAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!isAuth && req.nextUrl.pathname.startsWith("/app")) {
    let callbackUrl = req.nextUrl.pathname;
    if (req.nextUrl.search) {
      callbackUrl += req.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(
        `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        req.url
      )
    );
  }

  if (req.nextUrl.pathname.startsWith("/super-admin")) {
    const adminEmails = process.env.SUPER_ADMIN_EMAILS?.split(",");
    const currentUserEmail = session?.user?.email;
    if (!currentUserEmail || !adminEmails?.includes(currentUserEmail)) {
      return NextResponse.redirect(
        new URL("/sign-in?error=unauthorized", req.url)
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/docs/:path*",
    "/api/app/:path*",
    "/app/:path*",
    "/sign-in",
    "/sign-up",
    "/sign-out",
    "/super-admin/:path*",
  ],
};
