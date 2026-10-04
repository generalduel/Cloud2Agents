import { getLLMText } from "@/lib/docs/get-llm-text";
import { source } from "@/lib/docs/source";
import { notFound } from "next/navigation";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] | undefined }> }
) {
  const { slug } = await params;
  const page = source.getPage(slug?.slice(0, -1) ?? []);
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
