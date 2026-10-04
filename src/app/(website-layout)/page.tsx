import Features from "@/components/tailark/features-2";
import ContentSection from "@/components/tailark/content-2";
import StatsSection from "@/components/tailark/stats";
import WallOfLoveSection from "@/components/tailark/testimonials";
import FAQs from "@/components/tailark/faqs";
import CallToAction from "@/components/tailark/call-to-action";
import MonthlyAnnualPricing from "@/components/website/monthly-annual-pricing";
import HeroSection from "@/components/tailark/hero-section";
import WebsiteCreditsSection from "@/components/website/website-credits-section";

export default function WebsiteHomepage() {
  return (
    <>
      <HeroSection />
      <Features />
      <ContentSection />
      <StatsSection />
      <MonthlyAnnualPricing />
      <WebsiteCreditsSection />
      <WallOfLoveSection />
      <FAQs />
      <CallToAction />
    </>
  );
}
