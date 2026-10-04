import type { FeatureFlagEvaluations } from "posthog-node";
import { evaluatePostHogFlags } from "./providers/posthog-flags";

export interface EvaluateFlagsOptions {
  distinctId: string;
  flagKeys?: string[];
  personProperties?: Record<string, string>;
}

export interface FeatureFlagSnapshot {
  isEnabled(flagKey: string, defaultValue?: boolean): boolean;
  getVariant(flagKey: string): string | boolean | undefined;
  getPayload(flagKey: string): unknown;
}

function toSnapshot(evaluations: FeatureFlagEvaluations): FeatureFlagSnapshot {
  return {
    isEnabled(flagKey, defaultValue = false) {
      if (evaluations.getFlag(flagKey) === undefined) {
        return defaultValue;
      }
      return evaluations.isEnabled(flagKey);
    },
    getVariant(flagKey) {
      return evaluations.getFlag(flagKey);
    },
    getPayload(flagKey) {
      return evaluations.getFlagPayload(flagKey);
    },
  };
}

export async function evaluateFeatureFlags(
  opts: EvaluateFlagsOptions,
): Promise<FeatureFlagSnapshot | null> {
  const evaluations = await evaluatePostHogFlags(opts);
  if (!evaluations) return null;
  return toSnapshot(evaluations);
}

export async function isFeatureEnabled(
  flagKey: string,
  opts: EvaluateFlagsOptions,
  defaultValue = false,
): Promise<boolean> {
  const snapshot = await evaluateFeatureFlags({
    ...opts,
    flagKeys: opts.flagKeys ?? [flagKey],
  });
  if (!snapshot) return defaultValue;
  return snapshot.isEnabled(flagKey, defaultValue);
}
