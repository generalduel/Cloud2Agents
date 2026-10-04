import { CreativeWorkJsonLd } from "next-seo";

import { appConfig } from "@/lib/config";

type WebPageJsonLdProps = {
  id: string;
  title: string;
  description?: string;
  lastUpdated?: string;
  isAccessibleForFree?: boolean;
};

export function WebPageJsonLd({
  id,
  title,
  description,
  lastUpdated,
  isAccessibleForFree = true,
}: WebPageJsonLdProps) {
  return (
    <CreativeWorkJsonLd
      type="WebPage"
      url={id}
      headline={title}
      description={description}
      dateModified={lastUpdated}
      isAccessibleForFree={isAccessibleForFree}
      publisher={{
        name: appConfig.projectName,
        url: process.env.NEXT_PUBLIC_APP_URL,
      }}
    />
  );
}
