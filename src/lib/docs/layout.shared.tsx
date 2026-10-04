import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appConfig } from "../config";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: `${appConfig.projectName} Docs`,
    },
  };
}
