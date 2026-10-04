"use client";

import { Suspense, useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import useUser from "@/lib/users/useUser";
import { CookieCategory, useHasConsent } from "@/lib/cookie-consent/hooks";
import { SuspendedPostHogPageView } from "./posthog-page-view";

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

function PostHogIdentify() {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.name,
        role: user.role,
      });
      return;
    }

    posthog.reset();
  }, [user]);

  return null;
}

function PostHogInnerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!posthogProjectToken) return;

    posthog.init(posthogProjectToken, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
    });

    return () => {
      posthog.reset();
    };
  }, []);

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}

export function ConditionalPostHog({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAnalytics = useHasConsent(CookieCategory.Analytics);

  if (!posthogProjectToken || !hasAnalytics) {
    return <>{children}</>;
  }

  return <PostHogInnerProvider>{children}</PostHogInnerProvider>;
}

export { usePostHog } from "posthog-js/react";
export {
  useFeatureFlag,
  useFeatureFlagEnabled,
  useFeatureFlagPayload,
  useFeatureFlagPayloadSafe,
  useFeatureFlagVariant,
  useFeatureFlagVariantKey,
} from "@/lib/analytics/feature-flags-client";
