"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  COOKIE_CONSENT_ENABLED,
  hasConfigurableConsentCategories,
  useCookieConsent,
} from "@/lib/cookie-consent/hooks";
import { CookiePreferencesDialog } from "./cookie-preferences-dialog";

const HIDDEN_PATHS = ["/cookie"];

export function CookieConsentBanner() {
  const pathname = usePathname();
  const { state, acceptAll, rejectAll, setPreferencesOpen } =
    useCookieConsent();

  const showBanner =
    COOKIE_CONSENT_ENABLED &&
    hasConfigurableConsentCategories() &&
    state.status === "undecided" &&
    !HIDDEN_PATHS.includes(pathname);

  return (
    <>
      {showBanner ? (
        <div
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-description"
          className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 pointer-events-none"
        >
          <div className="pointer-events-auto mx-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-background/95 p-4 shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-background/90 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                  aria-hidden
                >
                  <Cookie className="size-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p
                    id="cookie-consent-title"
                    className="text-sm font-semibold leading-snug sm:text-base"
                  >
                    We use cookies
                  </p>
                  <p
                    id="cookie-consent-description"
                    className="text-xs leading-relaxed text-muted-foreground sm:text-sm"
                  >
                    We use cookies to improve your experience, analyze traffic,
                    and provide support. Read our{" "}
                    <Link
                      href="/cookie"
                      className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
                    >
                      Cookie Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[240px]">
                <Button className="h-10 w-full sm:h-9" onClick={acceptAll}>
                  Accept all
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-10 w-full px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                    onClick={rejectAll}
                  >
                    Reject optional
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 w-full sm:h-9"
                    onClick={() => setPreferencesOpen(true)}
                  >
                    Customize
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <CookiePreferencesDialog />
    </>
  );
}

export function CookiePreferencesTrigger({
  className,
}: {
  className?: string;
}) {
  const { setPreferencesOpen } = useCookieConsent();

  if (!COOKIE_CONSENT_ENABLED || !hasConfigurableConsentCategories()) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setPreferencesOpen(true)}
      className={className}
    >
      Cookie preferences
    </button>
  );
}
