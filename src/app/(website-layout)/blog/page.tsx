import { getAllBlogs } from "@/lib/mdx/blogs";
import Image from "next/image";
import Link from "next/link";
import { Tag } from "lucide-react";
import { Metadata } from "next";
import { CTA2 } from "@/components/website/cta-2";
import { appConfig } from "@/lib/config";
import { WebPageJsonLd } from "@/components/seo/web-page-json-ld";
import { BreadcrumbJsonLd } from "next-seo";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: `Blog | ${appConfig.projectName}`,
  description: `Discover how to use ${appConfig.projectName}`,
  openGraph: {
    title: `Blog | ${appConfig.projectName}`,
    description: `Discover how to use ${appConfig.projectName}`,
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/blog`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`,
        width: 1200,
        height: 630,
        alt: "Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Blog | ${appConfig.projectName}`,
    description: `Discover how to use ${appConfig.projectName}`,
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/blog`,
  },
};

export default async function BlogListPage() {
  const blogs = await getAllBlogs();

  if (blogs.length === 0) {
    return notFound();
  }

  return (
    <article className="py-16 md:py-32">
      <WebPageJsonLd
        id={`${process.env.NEXT_PUBLIC_APP_URL}/blog`}
        title={`Blog | ${appConfig.projectName}`}
        description={`Discover how to use ${appConfig.projectName}`}
        isAccessibleForFree={true}
      />
      <BreadcrumbJsonLd
        items={[
          {
            name: "Home",
            item: process.env.NEXT_PUBLIC_APP_URL,
          },
          {
            name: "Blog",
            item: `${process.env.NEXT_PUBLIC_APP_URL}/blog`,
          },
        ]}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Hero Section */}
        <header className="text-center mb-12 md:mb-20">
          <h1 className="text-4xl font-semibold mb-4 md:text-5xl lg:text-6xl">Articles</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover how to use {appConfig.projectName} to get most out of it.
          </p>
        </header>

        {/* Blog Posts Grid */}
        <main>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {blogs.map((blog) => (
              <article key={blog.slug} className="flex flex-col group">
                <Link href={`/blog/${blog.slug}`}>
                  <div className="bg-card border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 h-full shadow-zinc-950/5">
                    {/* Featured Image */}
                    {blog.frontmatter.featuredImage && (
                      <figure className="relative w-full h-48 overflow-hidden">
                        <Image
                          src={blog.frontmatter.featuredImage}
                          alt={blog.frontmatter.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </figure>
                    )}

                    {/* Content */}
                    <div className="p-6">
                      <header>
                        <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                          {blog.frontmatter.title}
                        </h2>
                      </header>
                      <p className="text-muted-foreground mb-4 line-clamp-3 text-sm">
                        {blog.frontmatter.description}
                      </p>

                      {/* Tags */}
                      <footer className="flex flex-wrap gap-2">
                        {blog.frontmatter.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </footer>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </main>

        <footer className="mt-16 md:mt-24">
          <CTA2 />
        </footer>
      </div>
    </article>
  );
}
