"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  COOKIE_CATEGORY_CONFIG,
  CookieCategory,
  getConfiguredConsentCategories,
  type ConsentCategory,
  useCookieConsent,
} from "@/lib/cookie-consent/hooks";

function getDefaultCategories(
  granted: boolean,
): Record<ConsentCategory, boolean> {
  const categories = {} as Record<ConsentCategory, boolean>;

  for (const category of getConfiguredConsentCategories()) {
    categories[category as ConsentCategory] = granted;
  }

  return categories;
}

export function CookiePreferencesDialog() {
  const {
    state,
    preferencesOpen,
    setPreferencesOpen,
    savePreferences,
    acceptAll,
    rejectAll,
  } = useCookieConsent();

  const [draft, setDraft] = useState<Record<ConsentCategory, boolean>>(
    getDefaultCategories(false),
  );

  useEffect(() => {
    if (!preferencesOpen) return;

    if (state.status === "decided") {
      setDraft(state.preferences.categories);
      return;
    }

    setDraft(getDefaultCategories(false));
  }, [preferencesOpen, state]);

  const toggleCategory = (category: ConsentCategory, checked: boolean) => {
    setDraft((current) => ({ ...current, [category]: checked }));
  };

  return (
    <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
      <DialogContent className="flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-2 px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>Cookie preferences</DialogTitle>
          <DialogDescription>
            Choose which optional cookies you allow. Essential cookies are
            always enabled.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3 rounded-xl border bg-muted/30 p-3 sm:gap-4 sm:p-4">
            <div className="min-w-0 flex flex-col gap-1">
              <Label>{COOKIE_CATEGORY_CONFIG[CookieCategory.Essential].label}</Label>
              <p className="text-sm text-muted-foreground">
                {COOKIE_CATEGORY_CONFIG[CookieCategory.Essential].description}
              </p>
            </div>
            <Switch checked disabled aria-readonly className="shrink-0" />
          </div>

          {getConfiguredConsentCategories().map((category) => {
            const consentCategory = category as ConsentCategory;
            const config = COOKIE_CATEGORY_CONFIG[category];

            return (
              <div
                key={category}
                className="flex items-start justify-between gap-3 rounded-xl border p-3 sm:gap-4 sm:p-4"
              >
                <div className="min-w-0 flex flex-col gap-1">
                  <Label htmlFor={`consent-${category}`}>{config.label}</Label>
                  <p className="text-sm text-muted-foreground">
                    {config.description}
                  </p>
                </div>
                <Switch
                  id={`consent-${category}`}
                  checked={draft[consentCategory] ?? false}
                  onCheckedChange={(checked) =>
                    toggleCategory(consentCategory, checked)
                  }
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col gap-2 border-t bg-background px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <Button
            variant="outline"
            className="order-3 w-full sm:order-1 sm:w-auto"
            onClick={rejectAll}
          >
            Reject optional
          </Button>
          <div className="order-1 flex w-full flex-col gap-2 sm:order-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={acceptAll}
            >
              Accept all
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => savePreferences(draft)}>
              Save preferences
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
