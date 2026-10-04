import * as Sentry from "@sentry/nextjs";
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/sentry/sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./lib/sentry/sentry.edge.config");
  }
}
// Capture errors from Server Components, middleware, and proxies
export const onRequestError = !!process.env.NEXT_PUBLIC_SENTRY_DSN
  ? Sentry.captureRequestError
  : undefined;
