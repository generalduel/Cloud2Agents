import Cookies from "js-cookie";
import {
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_COOKIE_NAME,
  getConfiguredConsentCategories,
  isCategoryConfigured,
} from "./config";
import {
  type ConsentCategory,
  type ConsentPreferences,
  CookieCategory,
} from "./types";

const CONSENT_CATEGORY_VALUES = new Set<string>(
  Object.values(CookieCategory),
);

function isConsentCategory(value: string): value is ConsentCategory {
  return (
    value !== CookieCategory.Essential && CONSENT_CATEGORY_VALUES.has(value)
  );
}

function buildDefaultCategories(
  value: boolean,
): Record<ConsentCategory, boolean> {
  const categories = {} as Record<ConsentCategory, boolean>;

  for (const category of getConfiguredConsentCategories()) {
    categories[category as ConsentCategory] = value;
  }

  return categories;
}

export function createConsentPreferences(
  categories: Record<ConsentCategory, boolean>,
): ConsentPreferences {
  return {
    v: 1,
    decidedAt: new Date().toISOString(),
    categories,
  };
}

export function createAcceptAllPreferences(): ConsentPreferences {
  return createConsentPreferences(buildDefaultCategories(true));
}

export function createRejectAllPreferences(): ConsentPreferences {
  return createConsentPreferences(buildDefaultCategories(false));
}

function parseConsentPreferences(raw: unknown): ConsentPreferences | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Partial<ConsentPreferences>;
  if (data.v !== 1 || typeof data.decidedAt !== "string" || !data.categories) {
    return null;
  }

  const categories = {} as Record<ConsentCategory, boolean>;

  for (const [key, value] of Object.entries(data.categories)) {
    if (!isConsentCategory(key) || typeof value !== "boolean") {
      return null;
    }
    if (!isCategoryConfigured(key)) continue;
    categories[key] = value;
  }

  for (const category of getConfiguredConsentCategories()) {
    const consentCategory = category as ConsentCategory;
    if (typeof categories[consentCategory] !== "boolean") {
      return null;
    }
  }

  return {
    v: 1,
    decidedAt: data.decidedAt,
    categories,
  };
}

export function readConsentCookie(): ConsentPreferences | null {
  const raw = Cookies.get(CONSENT_COOKIE_NAME);
  if (!raw) return null;

  try {
    return parseConsentPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeConsentCookie(preferences: ConsentPreferences): void {
  Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(preferences), {
    expires: CONSENT_COOKIE_MAX_AGE / (60 * 60 * 24),
    path: "/",
    sameSite: "Lax",
  });
}

export function clearConsentCookie(): void {
  Cookies.remove(CONSENT_COOKIE_NAME, { path: "/" });
}
