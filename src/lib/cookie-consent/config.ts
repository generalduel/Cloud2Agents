import { CookieCategory } from "./types";

export const CONSENT_COOKIE_NAME = "cookie_consent";
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const COOKIE_CONSENT_ENABLED =
  process.env.NEXT_PUBLIC_COOKIE_CONSENT_ENABLED === "true";

export const COOKIE_CATEGORY_CONFIG: Record<
  CookieCategory,
  {
    required: boolean;
    label: string;
    description: string;
    services?: string[];
  }
> = {
  [CookieCategory.Essential]: {
    required: true,
    label: "Essential",
    description:
      "Required for sign-in, security, and core site functionality.",
  },
  [CookieCategory.Analytics]: {
    required: false,
    label: "Analytics",
    description:
      "Help us understand usage and improve the product (PostHog).",
    services: ["PostHog"],
  },
  [CookieCategory.Support]: {
    required: false,
    label: "Support",
    description: "Enable live chat support (Crisp).",
    services: ["Crisp"],
  },
};

const CATEGORY_SERVICE_ENV: Partial<Record<CookieCategory, string | undefined>> =
  {
    [CookieCategory.Analytics]: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    [CookieCategory.Support]: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID,
  };

export function isCategoryConfigured(category: CookieCategory): boolean {
  if (category === CookieCategory.Essential) return true;
  return Boolean(CATEGORY_SERVICE_ENV[category]);
}

export function getConfiguredConsentCategories(): CookieCategory[] {
  return (Object.values(CookieCategory) as CookieCategory[]).filter(
    (category) =>
      category !== CookieCategory.Essential && isCategoryConfigured(category),
  );
}

export function hasConfigurableConsentCategories(): boolean {
  return getConfiguredConsentCategories().length > 0;
}
