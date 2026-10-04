import { redirect } from "next/navigation";

export function buildCallbackUrl(
  pathname: string,
  searchParams?: Record<string, string | string[] | number | undefined>
): string {
  if (!searchParams) return pathname;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
    } else {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function redirectToSignIn(callbackUrl = "/app"): never {
  redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
