import { getBlogBySlug, getAllBlogs, getRelatedBlogs } from "@/lib/mdx/blogs";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, ChevronRight, Home, Tag } from "lucide-react";
import Link from "next/link";
import { ShareButton } from "@/components/share-button";
import { Metadata } from "next";
import { TableOfContents } from "@/components/table-of-contents";
import { cn } from "@/lib/utils";
import { CTA2 } from "@/components/website/cta-2";
import { WebPageJsonLd } from "@/components/seo/web-page-json-ld";
import { ArticleJsonLd, BreadcrumbJsonLd } from "next-seo";
import { appConfig } from "@/lib/config";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return {};
  }

  const ogImage = blog.frontmatter.featuredImage || `/images/og.png`;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
    title: blog.frontmatter.title,
    description: blog.frontmatter.description,
    keywords: blog.frontmatter.tags,
    openGraph: {
      title: blog.frontmatter.title,
      description: blog.frontmatter.description,
      type: "article",
      url: `/blog/${blog.slug}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: blog.frontmatter.title,
        },
      ],
      publishedTime: blog.frontmatter.createdDate,
      tags: blog.frontmatter.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: blog.frontmatter.title,
      description: blog.frontmatter.description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL}/blog/${blog.slug}`,
    },
  };
}

export async function generateStaticParams() {
  const blogs = await getAllBlogs();
  return blogs.map((blog) => ({
    slug: blog.slug,
  }));
}

async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  const relatedBlogs = await getRelatedBlogs(slug, blog.frontmatter.tags);

  return (
    <article className="py-16 md:py-32">
      <WebPageJsonLd
        id={`${process.env.NEXT_PUBLIC_APP_URL}/blog/${blog.slug}`}
        title={blog.frontmatter.title}
        description={blog.frontmatter.description || ""}
        lastUpdated={blog.frontmatter.createdDate}
        isAccessibleForFree={true}
      />
      <ArticleJsonLd
        type="BlogPosting"
        url={`${process.env.NEXT_PUBLIC_APP_URL}/blog/${blog.slug}`}
        headline={blog.frontmatter.title}
        image={[blog.frontmatter.featuredImage || `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`]}
        datePublished={blog.frontmatter.createdDate}
        dateModified={blog.frontmatter.createdDate}
        author={appConfig.projectName}
        description={blog.frontmatter.description || ""}
        isAccessibleForFree={true}
        publisher={{
          name: appConfig.projectName,
          logo: `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`,
        }}
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
          {
            name: blog.frontmatter.title,
            item: `${process.env.NEXT_PUBLIC_APP_URL}/blog/${blog.slug}`,
          },
        ]}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary flex items-center transition-colors">
            <Home className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <Link href="/blog" className="hover:text-primary transition-colors">
            Blog
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <span className="font-medium truncate text-foreground" aria-current="page">
            {blog.frontmatter.title}
          </span>
        </nav>

        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-12">
          <main className="max-w-4xl">
            {/* Featured Image */}
            {blog.frontmatter.featuredImage && (
              <figure className="relative w-full h-56 sm:h-[400px] mb-8 md:mb-12 overflow-hidden rounded-2xl">
                <Image
                  src={blog.frontmatter.featuredImage}
                  alt={blog.frontmatter.title}
                  fill
                  className="object-cover"
                />
              </figure>
            )}

            {/* Title for mobile */}
            <header className="lg:hidden mb-6">
              <h1 className="text-3xl md:text-4xl font-semibold">
                {blog.frontmatter.title}
              </h1>
            </header>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-muted-foreground mb-8 md:mb-10">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <time dateTime={blog.frontmatter.createdDate}>
                  {new Date(blog.frontmatter.createdDate).toLocaleDateString()}
                </time>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4" aria-hidden="true" />
                {blog.frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted px-3 py-1 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Share button */}
            <div className="mb-8">
              <ShareButton
                title={blog.frontmatter.title}
                description={blog.frontmatter.description}
              />
            </div>

            {/* Mobile Table of Contents */}
            <nav className="lg:hidden mb-10" aria-label="Table of Contents">
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <TableOfContents headings={blog.headings} />
              </div>
            </nav>

            {/* Content */}
            <div
              className={cn(
                "prose max-w-none",
                // Base styles
                "prose-headings:scroll-mt-20 prose-headings:font-semibold",
                "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg",
                "prose-img:rounded-2xl",
                "prose-a:text-primary prose-a:hover:text-primary/90 prose-a:transition-colors",
                "prose-code:text-primary prose-code:before:content-none prose-code:after:content-none",
                // Responsive prose sizes
                "prose-sm sm:prose-base md:prose-lg",
                // Dark mode styles
                "dark:prose-invert"
              )}
            >
              {blog.content}
            </div>

            {/* Related Articles */}
            {relatedBlogs.length > 0 && (
              <section className="mt-16 md:mt-24" aria-labelledby="related-articles">
                <h2 id="related-articles" className="text-2xl font-semibold mb-8">Related Articles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {relatedBlogs.map((related) => (
                    <article key={related.slug} className="group">
                      <Link href={`/blog/${related.slug}`}>
                        <div className="bg-card border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 shadow-zinc-950/5">
                          {related.frontmatter.featuredImage && (
                            <figure className="relative w-full h-36 overflow-hidden">
                              <Image
                                src={related.frontmatter.featuredImage}
                                alt={related.frontmatter.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </figure>
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                              {related.frontmatter.title}
                            </h3>
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-6">
              {/* Table of Contents */}
              <nav aria-label="Table of Contents" className="rounded-2xl border bg-card p-6 shadow-sm">
                <TableOfContents headings={blog.headings} />
              </nav>
            </div>
          </aside>
        </div>
        <footer className="mt-16 md:mt-24">
          <CTA2 />
        </footer>
      </div>
    </article>
  );
}

export default BlogDetailPage;
