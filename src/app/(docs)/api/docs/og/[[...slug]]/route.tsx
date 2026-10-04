import { getPageImage, source } from "@/lib/docs/source";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { generate as DefaultImage } from "fumadocs-ui/og";
import { appConfig } from "@/lib/config";

export const revalidate = false;

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug?: string[] | undefined }> }
) {
  const { slug } = await context.params;
  const page = source.getPage(slug?.slice(0, -1) ?? []);
  if (!page) notFound();

  return new ImageResponse(
    (
      <DefaultImage
        title={page.data.title}
        description={page.data.description}
        site={appConfig.projectName}
        // Icon=
        // Primary Color=
        // Primary Text Color=
      />
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
