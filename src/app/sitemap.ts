import { MetadataRoute } from "next";
import { getAllBlogs } from "@/lib/mdx/blogs";
import { source } from "@/lib/docs/source";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const blogs = await getAllBlogs();

  // Static pages
  const staticPages = [
    "",
    "/about",
    "/contact",
    "/join-waitlist",
    "/blog",
    "/pricing",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Policy pages
  const policyPages = ["/cookie", "/privacy", "/terms", "/refund"].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })
  );

  // Blog pages
  const blogPages = blogs.map((blog) => ({
    url: `${baseUrl}/blog/${blog.slug}`,
    lastModified: new Date(blog.frontmatter.createdDate),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Docs pages
  const docsPages = source.getPages().map((page) => ({
    url: `${baseUrl}/docs/${page.slugs.join("/")}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...policyPages, ...blogPages, ...docsPages];
}
