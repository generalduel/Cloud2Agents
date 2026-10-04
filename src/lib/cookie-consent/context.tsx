"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  COOKIE_CONSENT_ENABLED,
  hasConfigurableConsentCategories,
  isCategoryConfigured,
} from "./config";
import {
  createAcceptAllPreferences,
  createRejectAllPreferences,
  readConsentCookie,
  writeConsentCookie,
} from "./storage";
import {
  type ConsentCategory,
  type ConsentPreferences,
  type ConsentState,
  CookieCategory,
} from "./types";

interface CookieConsentContextValue {
  state: ConsentState;
  preferencesOpen: boolean;
  setPreferencesOpen: (open: boolean) => void;
  hasConsent: (category: CookieCategory) => boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (categories: Record<ConsentCategory, boolean>) => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

function getAutoGrantedPreferences(): ConsentPreferences {
  return createAcceptAllPreferences();
}

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<ConsentState>({ status: "loading" });
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (!COOKIE_CONSENT_ENABLED || !hasConfigurableConsentCategories()) {
      setState({
        status: "decided",
        preferences: getAutoGrantedPreferences(),
      });
      return;
    }

    const stored = readConsentCookie();
    if (stored) {
      setState({ status: "decided", preferences: stored });
      return;
    }

    setState({ status: "undecided" });
  }, []);

  const persist = useCallback((preferences: ConsentPreferences) => {
    writeConsentCookie(preferences);
    setState({ status: "decided", preferences });
  }, []);

  const acceptAll = useCallback(() => {
    persist(createAcceptAllPreferences());
    setPreferencesOpen(false);
  }, [persist]);

  const rejectAll = useCallback(() => {
    persist(createRejectAllPreferences());
    setPreferencesOpen(false);
  }, [persist]);

  const savePreferences = useCallback(
    (categories: Record<ConsentCategory, boolean>) => {
      persist({
        v: 1,
        decidedAt: new Date().toISOString(),
        categories,
      });
      setPreferencesOpen(false);
    },
    [persist],
  );

  const hasConsent = useCallback(
    (category: CookieCategory) => {
      if (category === CookieCategory.Essential) return true;
      if (!isCategoryConfigured(category)) return false;
      if (state.status !== "decided") return false;
      return state.preferences.categories[category as ConsentCategory] ?? false;
    },
    [state],
  );

  const value = useMemo(
    () => ({
      state,
      preferencesOpen,
      setPreferencesOpen,
      hasConsent,
      acceptAll,
      rejectAll,
      savePreferences,
    }),
    [
      state,
      preferencesOpen,
      hasConsent,
      acceptAll,
      rejectAll,
      savePreferences,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return context;
}

export function useHasConsent(category: CookieCategory): boolean {
  const { hasConsent, state } = useCookieConsent();

  if (state.status === "loading") {
    return category === CookieCategory.Essential;
  }

  if (!COOKIE_CONSENT_ENABLED || !hasConfigurableConsentCategories()) {
    return category === CookieCategory.Essential || isCategoryConfigured(category);
  }

  return hasConsent(category);
}
