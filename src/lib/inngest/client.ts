import { Inngest } from "inngest";

import { appConfig } from "../config";
import { sentryMiddleware } from "@inngest/middleware-sentry";

export const inngest = new Inngest({
  id: appConfig.projectSlug,
  isDev: process.env.NODE_ENV !== "production",
  middleware: process.env.NEXT_PUBLIC_SENTRY_DSN
    ? [sentryMiddleware()]
    : undefined,
});
