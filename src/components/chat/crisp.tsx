"use client";

import useUser from "@/lib/users/useUser";
import { Crisp } from "crisp-sdk-web";
import { useEffect } from "react";
import { CookieCategory, useHasConsent } from "@/lib/cookie-consent/hooks";

const crispWebsiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

export const CrispChat = () => {
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!crispWebsiteId) {
      return;
    }
    Crisp.configure(crispWebsiteId);
  }, []);

  useEffect(() => {
    if (!user || isLoading || !crispWebsiteId) {
      return;
    }
    Crisp.user.setEmail(user.email);
    Crisp.user.setNickname(user.name || user.email.split("@")[0]);
    Crisp.session.setData({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }, [user, isLoading]);

  return null;
};

export function ConditionalCrisp() {
  const hasSupport = useHasConsent(CookieCategory.Support);

  if (!hasSupport || !crispWebsiteId) {
    return null;
  }

  return <CrispChat />;
};
