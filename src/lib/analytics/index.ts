/**
 * PostHog analytics module.
 *
 * Client: hooks from `@/components/analytics/posthog-provider`.
 * Server: event tracking and feature flag evaluation via this module.
 */
export {
  Analytics,
  trackCreditsPurchased,
  trackPlanUpdated,
  trackServerEvent,
  trackSubscriptionCancelled,
  trackSubscriptionCreated,
  trackSubscriptionUpdated,
} from "./server";

export {
  evaluateFeatureFlags,
  isFeatureEnabled,
} from "./feature-flags";

export type {
  EvaluateFlagsOptions,
  FeatureFlagSnapshot,
} from "./feature-flags";

export type {
  CreditsPurchasedProperties,
  PlanUpdatedProperties,
  SubscriptionEventProperties,
  TrackEventParams,
} from "./types";
