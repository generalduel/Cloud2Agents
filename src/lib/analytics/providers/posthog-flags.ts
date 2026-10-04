import type { FeatureFlagEvaluations } from "posthog-node";
import { getPostHogNodeClient } from "./posthog-client";

export interface EvaluatePostHogFlagsOptions {
  distinctId: string;
  flagKeys?: string[];
  personProperties?: Record<string, string>;
}

export async function evaluatePostHogFlags(
  options: EvaluatePostHogFlagsOptions,
): Promise<FeatureFlagEvaluations | null> {
  const ph = getPostHogNodeClient();
  if (!ph) return null;

  try {
    return await ph.evaluateFlags(options.distinctId, {
      flagKeys: options.flagKeys,
      personProperties: options.personProperties,
    });
  } catch (error) {
    console.warn("[Analytics:PostHog] Failed to evaluate flags:", error);
    return null;
  }
}
