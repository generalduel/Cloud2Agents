"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import getSubscribeUrl, {
  PlanProvider,
  PlanType,
} from "@/lib/plans/getSubscribeUrl";

const MonthlyAnnualPricing = () => {
  const [isAnnually, setIsAnnually] = useState(false);

  return (
    <div className="relative py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-medium mb-4">Special Launch Offer</p>
          <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">
            Start managing your company smarter today
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Choose the perfect plan for your needs. No hidden fees.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="flex h-12 items-center rounded-md bg-muted p-1 text-lg">
            <RadioGroup
              defaultValue="monthly"
              className="h-full grid-cols-2"
              onValueChange={(value) => {
                setIsAnnually(value === "annually");
              }}
            >
              <div className='h-full rounded-md transition-all has-[button[data-state="checked"]]:bg-white dark:has-[button[data-state="checked"]]:bg-zinc-900'>
                <RadioGroupItem
                  value="monthly"
                  id="monthly"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="monthly"
                  className="flex h-full cursor-pointer items-center justify-center px-7 font-semibold text-muted-foreground peer-data-[state=checked]:text-primary"
                >
                  Monthly
                </Label>
              </div>
              <div className='h-full rounded-md transition-all has-[button[data-state="checked"]]:bg-white dark:has-[button[data-state="checked"]]:bg-zinc-900'>
                <RadioGroupItem
                  value="annually"
                  id="annually"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="annually"
                  className="flex h-full cursor-pointer items-center justify-center gap-1 px-7 font-semibold text-muted-foreground peer-data-[state=checked]:text-primary"
                >
                  Yearly
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-100 px-1.5 text-green-600 dark:bg-green-900/20 dark:border-green-900"
                  >
                    -20%
                  </Badge>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="mt-8 md:mt-20 grid gap-8 md:grid-cols-2">
          {/* Basic Plan */}
          <div className="bg-card relative rounded-3xl border shadow-2xl shadow-zinc-950/5 flex flex-col p-8 md:p-10">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold">Basic Plan</h3>
              <p className="mt-2 text-muted-foreground">
                For small teams just starting out
              </p>
              <span className="mt-8 inline-block text-6xl font-bold">
                <span className="text-4xl">$</span>
                {isAnnually ? "63" : "79"}
              </span>
              <span className="ml-2 text-muted-foreground">/mo</span>
            </div>

            <div className="flex-1">
              <ul role="list" className="space-y-4">
                {[
                  "5 projects limit",
                  "5GB storage",
                  "Up to 3 users",
                  "Support by email only",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {item}
                    </span>
                  </li>
                ))}
                <li className="flex items-center gap-2 text-muted-foreground/50">
                  <Check className="size-4" />
                  <span className="text-sm line-through">Time tracking</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Button asChild size="lg" className="w-full" variant="outline">
                <Link href="#">Start free trial</Link>
              </Button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-card relative rounded-3xl border shadow-2xl shadow-zinc-950/5 flex flex-col p-8 md:p-10 ring-1 ring-primary/10">
            <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              Most Popular
            </div>
            <div className="mb-8">
              <h3 className="text-2xl font-semibold">Pro Plan</h3>
              <p className="mt-2 text-muted-foreground">
                For growing businesses needing power
              </p>
              <span className="mt-8 inline-block text-6xl font-bold">
                <span className="text-4xl">$</span>
                {isAnnually ? "239" : "299"}
              </span>
              <span className="ml-2 text-muted-foreground">/mo</span>
            </div>

            <div className="flex-1">
              <ul role="list" className="space-y-4">
                {[
                  "Unlimited projects",
                  "50GB storage",
                  "Unlimited users",
                  "Priority support",
                  "Time tracking",
                  "Advanced analytics",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <Button asChild size="lg" className="w-full">
                <Link
                  href={getSubscribeUrl({
                    codename: "pro",
                    type: PlanType.MONTHLY,
                    provider: PlanProvider.POLAR,
                  })}
                >
                  Get started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAnnualPricing;
