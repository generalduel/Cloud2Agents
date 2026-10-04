import React from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./docs.css";

function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <RootProvider
        search={{
          enabled: true,
          options: {
            api: "/api/docs/search",
          },
        }}
      >
        {children}
      </RootProvider>
    </div>
  );
}

export default DocsLayout;
