export { CookieCategory } from "./types";
export type { ConsentCategory, ConsentPreferences, ConsentState } from "./types";
export {
  COOKIE_CATEGORY_CONFIG,
  COOKIE_CONSENT_ENABLED,
  getConfiguredConsentCategories,
  hasConfigurableConsentCategories,
} from "./config";
export {
  CookieConsentProvider,
  useCookieConsent,
  useHasConsent,
} from "./context";
