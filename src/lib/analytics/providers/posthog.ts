import { getPostHogNodeClient } from "./posthog-client";
import type { TrackEventParams } from "../types";

export async function capturePostHogEvent({
  distinctId,
  event,
  properties,
}: TrackEventParams): Promise<void> {
  const ph = getPostHogNodeClient();
  if (!ph) return;

  try {
    ph.capture({ distinctId, event, properties });
    await ph.flush();
  } catch (error) {
    console.warn("[Analytics:PostHog] Failed to capture event:", error);
  }
}
