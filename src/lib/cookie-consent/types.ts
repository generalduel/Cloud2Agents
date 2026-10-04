export enum CookieCategory {
  Essential = "essential",
  Analytics = "analytics",
  Support = "support",
}

/** Toggleable categories (excludes Essential) */
export type ConsentCategory = Exclude<CookieCategory, CookieCategory.Essential>;

export interface ConsentPreferences {
  v: 1;
  decidedAt: string;
  categories: Record<ConsentCategory, boolean>;
}

export type ConsentState =
  | { status: "loading" }
  | { status: "undecided" }
  | { status: "decided"; preferences: ConsentPreferences };
