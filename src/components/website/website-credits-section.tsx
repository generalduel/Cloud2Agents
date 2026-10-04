"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/ui/border-beam";
import { type CreditType } from "@/lib/credits/credits";
import { PlanProvider } from "@/lib/plans/getSubscribeUrl";
import useBuyCredits from "@/lib/credits/useBuyCredits";
import {
  Coins,
  Zap,
  Crown,
  Image,
  Video,
  LucideIcon,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Predefined credit packages
const creditPackages = [
  {
    id: "starter",
    credits: 10,
    name: "Starter Pack",
    description: "Perfect for trying out our AI services",
    icon: Coins,
    popular: false,
  },
  {
    id: "popular",
    credits: 100,
    name: "Popular Pack",
    description: "Most popular choice for regular users",
    icon: Zap,
    popular: true,
  },
  {
    id: "pro",
    credits: 1000,
    name: "Pro Pack",
    description: "Best value for power users",
    icon: Crown,
    popular: false,
  },
];

// Credit Package Card Component using useBuyCredits hook
const CreditPackageCard = ({
  creditType,
  pkg,
  selectedProvider,
}: {
  creditType: CreditType;
  pkg: (typeof creditPackages)[0];
  selectedProvider: PlanProvider;
}) => {
  const { price, isLoading, error, getBuyCreditsUrl } = useBuyCredits(
    creditType,
    pkg.credits
  );

  const PackageIcon = pkg.icon;
  const pricePerCredit =
    price && price > 0 ? (price / pkg.credits).toFixed(4) : "0";

  const handleBuyCredits = () => {
    const url = getBuyCreditsUrl(selectedProvider);
    window.location.href = url;
  };

  return (
    <Card
      className={`relative ${pkg.popular ? "border-primary shadow-lg scale-105" : ""}`}
    >
      {pkg.popular && <BorderBeam size={250} duration={12} delay={9} />}

      <CardHeader className="text-center">
        {pkg.popular && (
          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            Most Popular
          </Badge>
        )}

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <PackageIcon className="h-6 w-6 text-primary" />
        </div>

        <CardTitle className="text-lg">{pkg.name}</CardTitle>
        <CardDescription className="text-sm">{pkg.description}</CardDescription>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading price...
              </span>
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">Price unavailable</div>
          ) : (
            <>
              <div className="text-2xl font-bold">
                ${price?.toFixed(2) || "0.00"}
              </div>
              <div className="text-xs text-muted-foreground">
                {pkg.credits} credits • ${pricePerCredit}/credit
              </div>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Button
          className="w-full"
          onClick={handleBuyCredits}
          disabled={isLoading || error !== undefined || !price || price === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            `Buy ${pkg.credits} Credits`
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default function WebsiteCreditsSection() {
  const [selectedProvider] = useState<PlanProvider>(PlanProvider.POLAR);

  const CreditTypeSection = ({
    creditType,
    title,
    description,
    icon: Icon,
  }: {
    creditType: CreditType;
    title: string;
    description: string;
    icon: LucideIcon;
  }) => (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Icon className="h-8 w-8 text-primary" />
          <h3 className="text-2xl font-bold">{title}</h3>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {creditPackages.map((pkg) => (
          <CreditPackageCard
            key={`${creditType}-${pkg.id}`}
            creditType={creditType}
            pkg={pkg}
            selectedProvider={selectedProvider}
          />
        ))}
      </div>
    </div>
  );

  return (
    <section
      className="py-16 bg-gradient-to-b from-background to-muted/20"
      id="credits"
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            AI Credits for Everyone
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Get instant access to our AI services with flexible credit packages.
            No subscription required - pay only for what you use.
          </p>
        </div>

        <Tabs defaultValue="image_generation" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-12">
            <TabsTrigger
              value="image_generation"
              className="flex items-center gap-2"
            >
              <Image className="h-4 w-4" />
              Image AI
            </TabsTrigger>
            <TabsTrigger
              value="video_generation"
              className="flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              Video AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image_generation">
            <CreditTypeSection
              creditType="image_generation"
              title="Image Generation Credits"
              description="Create stunning AI-generated images for your projects, marketing materials, and creative content."
              icon={Image}
            />
          </TabsContent>

          <TabsContent value="video_generation">
            <CreditTypeSection
              creditType="video_generation"
              title="Video Generation Credits"
              description="Generate engaging AI videos for social media, advertisements, and video content creation."
              icon={Video}
            />
          </TabsContent>
        </Tabs>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Secure payments powered by Stripe • No monthly commitments • Instant
            activation
          </p>
          <p className="text-sm text-primary mt-2 font-medium">
            ✨ Personalized pricing based on your subscription plan
          </p>
        </div>
      </div>
    </section>
  );
}
