import { capturePostHogEvent } from "./providers/posthog";
import type {
  CreditsPurchasedProperties,
  PlanUpdatedProperties,
  SubscriptionEventProperties,
  TrackEventParams,
} from "./types";

/** Provider-agnostic server analytics entry point. Swap providers in this file. */
export async function trackServerEvent(params: TrackEventParams): Promise<void> {
  await capturePostHogEvent(params);
}

export async function trackPlanUpdated(
  distinctId: string,
  properties: PlanUpdatedProperties,
): Promise<void> {
  await trackServerEvent({
    distinctId,
    event: "plan_updated",
    properties,
  });
}

export async function trackSubscriptionCreated(
  distinctId: string,
  properties: SubscriptionEventProperties,
): Promise<void> {
  await trackServerEvent({
    distinctId,
    event: "subscription_created",
    properties,
  });
}

export async function trackSubscriptionUpdated(
  distinctId: string,
  properties: SubscriptionEventProperties,
): Promise<void> {
  await trackServerEvent({
    distinctId,
    event: "subscription_updated",
    properties,
  });
}

export async function trackSubscriptionCancelled(
  distinctId: string,
  properties: SubscriptionEventProperties,
): Promise<void> {
  await trackServerEvent({
    distinctId,
    event: "subscription_cancelled",
    properties,
  });
}

export async function trackCreditsPurchased(
  distinctId: string,
  properties: CreditsPurchasedProperties,
): Promise<void> {
  await trackServerEvent({
    distinctId,
    event: "credits_purchased",
    properties,
  });
}

export const Analytics = {
  track: trackServerEvent,
  planUpdated: trackPlanUpdated,
  subscriptionCreated: trackSubscriptionCreated,
  subscriptionUpdated: trackSubscriptionUpdated,
  subscriptionCancelled: trackSubscriptionCancelled,
  creditsPurchased: trackCreditsPurchased,
};
