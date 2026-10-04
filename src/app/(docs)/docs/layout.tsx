import { source } from "@/lib/docs/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/docs/layout.shared";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
