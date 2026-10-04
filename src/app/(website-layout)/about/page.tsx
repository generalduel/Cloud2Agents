import { appConfig } from "@/lib/config";
import { WebPageJsonLd } from "@/components/seo/web-page-json-ld";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `About Us | ${appConfig.projectName}`,
  description: "Learn more about our company, mission, and values.",
  openGraph: {
    title: `About Us | ${appConfig.projectName}`,
    description: "Learn more about our company, mission, and values.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/about`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`,
        width: 1200,
        height: 630,
        alt: "About Us",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `About Us | ${appConfig.projectName}`,
    description: "Learn more about our company, mission, and values.",
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <article className="py-16 md:py-32">
      <WebPageJsonLd
        id={`${process.env.NEXT_PUBLIC_APP_URL}/about`}
        title={`About Us | ${appConfig.projectName}`}
        description="Learn more about our company, mission, and values."
        isAccessibleForFree={true}
      />
      <div className="mx-auto max-w-5xl px-6">
        {/* Hero Section */}
        <header className="space-y-6 text-center mb-16 md:mb-24">
          <h1 className="text-4xl font-semibold sm:text-5xl lg:text-6xl">
            About {appConfig.projectName}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Building the future of web publishing, one post at a time.
          </p>
        </header>

        <div className="space-y-16 md:space-y-24">
          {/* Mission Section */}
          <section className="space-y-6" aria-labelledby="mission">
            <h2 id="mission" className="text-3xl font-semibold text-center md:text-4xl">Our Mission</h2>
            <p className="text-lg leading-relaxed text-muted-foreground text-center max-w-3xl mx-auto">
              At {appConfig.projectName}, we believe in empowering creators with the tools they need to publish their content independently. Our platform combines the simplicity of traditional blogging with the power of modern web technologies, making it easier than ever to share your stories with the world.
            </p>
          </section>

          {/* Values Section */}
          <section className="space-y-8" aria-labelledby="values">
            <h2 id="values" className="text-3xl font-semibold text-center md:text-4xl">Our Values</h2>
            <div className="grid gap-8 sm:grid-cols-2 md:gap-12 mt-12">
              <article className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold mb-3">Simplicity</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We believe in making complex things simple. Our tools are powerful yet intuitive, designed to let you focus on what matters most - your content.
                </p>
              </article>
              <article className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold mb-3">Independence</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We champion the independent web. Our platform gives you full control over your content and how it&apos;s presented to the world.
                </p>
              </article>
              <article className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold mb-3">Innovation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We&apos;re constantly pushing the boundaries of what&apos;s possible in web publishing, bringing you the latest technologies and best practices.
                </p>
              </article>
              <article className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold mb-3">Community</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We believe in the power of community. We&apos;re building tools that help creators connect with their audience and each other.
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
} 