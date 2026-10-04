import type { NextConfig } from "next";

import { withSentryConfig } from "@sentry/nextjs";

export const withSentry = (config: NextConfig): NextConfig => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // if no dsn then return the config
    console.warn("Sentry DSN is not set. Skipping Sentry configuration.");
    return config;
  }
  return withSentryConfig(config, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    tunnelRoute: "/monitoring",
  });
};
