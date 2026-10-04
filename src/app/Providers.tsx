"use client";

import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { Next13ProgressBar } from "next13-progressbar";
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import { ThemeProvider } from "next-themes";
import { ConditionalCrisp } from "@/components/chat/crisp";
import { ConditionalPostHog } from "@/components/analytics/posthog-provider";
import { CookieConsentProvider } from "@/lib/cookie-consent/hooks";
import { CookieConsentBanner } from "@/components/cookie-consent/cookie-consent-banner";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ConditionalPostHog>
          <Suspense>
            <SWRConfig value={{ fetcher }}>
              <Next13ProgressBar
                height="4px"
                color="hsl(var(--primary))"
                options={{ showSpinner: true }}
                showOnShallow
              />

              {children}
              <Toaster position="top-center" richColors />
              <ConditionalCrisp />
              <CookieConsentBanner />
            </SWRConfig>
          </Suspense>
        </ConditionalPostHog>
      </ThemeProvider>
    </CookieConsentProvider>
  );
}

export default Providers;
