"use client";

import {
  useFeatureFlagEnabled as usePostHogFeatureFlagEnabled,
  useFeatureFlagPayload as usePostHogFeatureFlagPayload,
  useFeatureFlagVariantKey as usePostHogFeatureFlagVariantKey,
  usePostHog,
} from "posthog-js/react";

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

export {
  useFeatureFlagEnabled,
  useFeatureFlagPayload,
  useFeatureFlagVariantKey,
} from "posthog-js/react";

function isPostHogActive(posthog: ReturnType<typeof usePostHog>): boolean {
  return Boolean(posthogProjectToken && posthog);
}

export function useFeatureFlag(flagKey: string, defaultValue = false): boolean {
  const posthog = usePostHog();
  const enabled = usePostHogFeatureFlagEnabled(flagKey, defaultValue);

  if (!isPostHogActive(posthog)) {
    return defaultValue;
  }

  return enabled ?? defaultValue;
}

export function useFeatureFlagVariant(
  flagKey: string,
): string | boolean | undefined {
  const posthog = usePostHog();
  const variant = usePostHogFeatureFlagVariantKey(flagKey);

  if (!isPostHogActive(posthog)) {
    return undefined;
  }

  return variant;
}

export function useFeatureFlagPayloadSafe(flagKey: string): unknown {
  const posthog = usePostHog();
  const payload = usePostHogFeatureFlagPayload(flagKey);

  if (!isPostHogActive(posthog)) {
    return undefined;
  }

  return payload;
}
