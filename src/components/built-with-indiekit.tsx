"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";


const REFERRAL_CODE = "" // TODO: Add your referral code to earn commission from https://indiekit.pro/app/my-referrals
// Eg: If https://indiekit.pro/?ref=UxAc2wP5VA is your affiliate link, then your referral code is UxAc2wP5VA

type BuiltWithIndieKitProps = {
  variant?: "compact" | "default";
  className?: string;
};

export function BuiltWithIndieKit({
  variant = "default",
  className,
}: BuiltWithIndieKitProps) {
  // Get current website domain for UTM source
  const getUtmSource = () => {
    if (typeof window !== "undefined") {
      return window.location.hostname;
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
        return url.hostname;
      } catch {
        return "unknown";
      }
    }
    return "unknown";
  };

  const utmSource = getUtmSource();
  const indiekitUrl = `https://indiekit.pro?utm_source=${encodeURIComponent(
    utmSource
  )}&utm_campaign=built-with-indiekit&ref=${REFERRAL_CODE}`;

  const imageSize = variant === "compact" ? 16 : 20;

  return (
    <Link
      href={indiekitUrl}
      target="_blank"
      rel="dofollow noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors",
        variant === "compact" ? "text-xs" : "text-sm",
        className
      )}
      aria-label="Built with Indie Kit">
      <span>Built with</span>
      {/* biome-ignore lint/performance/noImgElement: SVG from public folder works better with img tag */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/indie-kit.svg"
        alt="Indie Kit"
        width={imageSize}
        height={imageSize}
        className="inline-block"
      />
      <span className="font-medium">Indie Kit</span>
    </Link>
  );
}

