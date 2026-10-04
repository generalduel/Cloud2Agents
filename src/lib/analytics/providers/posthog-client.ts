import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function getPostHogNodeClient(): PostHog | null {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!projectToken) return null;

  if (!client) {
    const projectSecretApiKey = process.env.POSTHOG_PROJECT_SECRET_API_KEY;

    client = new PostHog(projectToken, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      ...(projectSecretApiKey ? { secretKey: projectSecretApiKey } : {}),
    });
  }

  return client;
}
