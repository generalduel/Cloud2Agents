import React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { TextEffect } from "@/components/ui/text-effect";
import { AnimatedGroup } from "@/components/ui/animated-group";

import type { Variants } from "motion/react";

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    filter: "blur(12px)",
    y: 12,
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      type: "spring",
      bounce: 0.3,
      duration: 1.5,
    },
  },
};

const transitionVariants = {
  item: itemVariants,
};

/** Wordmarks from GLINCKER/theSVG (CDN). Only slugs with `wordmark.svg` on the registry. https://github.com/GLINCKER/thesvg */
const THESVG_CDN =
  "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons";

const wordmarkImgClass =
  "mx-auto h-6 w-full max-w-[7rem] object-contain object-center sm:h-7 sm:max-w-[8rem]";

const heroCustomerWordmarks: { slug: string; alt: string }[] = [
  { slug: "nvidia", alt: "NVIDIA" },
  { slug: "github", alt: "GitHub" },
  { slug: "openai", alt: "OpenAI" },
  { slug: "vercel", alt: "Vercel" },
  { slug: "slack", alt: "Slack" },
  { slug: "supabase", alt: "Supabase" },
  { slug: "resend", alt: "Resend" },
  { slug: "turso", alt: "Turso" },
];

export default function HeroSection() {
  return (
    <>
      <main className="relative overflow-hidden">
        <section>
          <div className="relative pt-24 md:pt-36">
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href="#link"
                    className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
                  >
                    <span className="text-foreground text-sm">
                      Introducing Support for AI Models
                    </span>
                    <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

                    <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </AnimatedGroup>

                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="mx-auto mt-8 max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-16 xl:text-[5.25rem]"
                >
                  Production Ready Next.JS Boilerplate
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mx-auto mt-8 max-w-2xl text-balance text-lg"
                >
                  Indie Kit is a production-ready Next.JS boilerplate that
                  provides a foundation for building modern websites and
                  applications.
                </TextEffect>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div
                    key={1}
                    className="bg-foreground/10 rounded-[calc(var(--radius-xl)+0.125rem)] border p-0.5"
                  >
                    <Button
                      asChild
                      size="lg"
                      className="rounded-xl px-5 text-base"
                    >
                      <Link href="https://docs.indiekit.pro">
                        <span className="text-nowrap">Start Building</span>
                      </Link>
                    </Button>
                  </div>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-10.5 rounded-xl px-5"
                  >
                    <Link href="https://indiekit.pro/app">
                      <span className="text-nowrap">Request a demo</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="mask-b-from-55% relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
                  <Image
                    className="bg-background aspect-15/8 relative hidden rounded-2xl dark:block"
                    src="/images/hero.png"
                    alt="app screen"
                    width="2700"
                    height="1440"
                  />
                  <Image
                    className="z-2 border-border/25 aspect-15/8 relative rounded-2xl border dark:hidden"
                    src="/images/hero.png"
                    alt="app screen"
                    width="2700"
                    height="1440"
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>
        <section className="bg-background pb-16 pt-16 md:pb-32">
          <div className="group relative m-auto max-w-5xl px-6">
            <div className="pointer-events-none group-hover:pointer-events-auto absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
              <Link
                href="/"
                className="block text-sm duration-150 hover:opacity-75"
              >
                <span> Meet Our Customers</span>

                <ChevronRight className="ml-1 inline-block size-3" />
              </Link>
            </div>
            <div className="group-hover:blur-xs mx-auto mt-12 grid max-w-2xl grid-cols-4 gap-x-12 gap-y-8 transition-all duration-500 group-hover:opacity-50 sm:gap-x-16 sm:gap-y-14">
              {heroCustomerWordmarks.map(({ slug, alt }) => (
                <div key={slug} className="flex items-center justify-center">
                  <img
                    className={wordmarkImgClass}
                    src={`${THESVG_CDN}/${slug}/wordmark.svg`}
                    alt={alt}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
