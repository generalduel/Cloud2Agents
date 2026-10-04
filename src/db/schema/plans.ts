import {
  boolean,
  timestamp,
  pgTable,
  text,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const quotaSchema = z.object({
  permiumSupport: z.boolean().default(true),
  monthlyImages: z.number(),
  somethingElse: z.string(),
});

export type Quotas = z.infer<typeof quotaSchema>;

export const defaultQuotas: Quotas = {
  permiumSupport: false,
  monthlyImages: 10,
  somethingElse: "something",
};

export const plans = pgTable("plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  codename: text("codename").unique(),
  default: boolean("default").default(false),

  requiredCouponCount: integer("requiredCouponCount").default(0), // For LTD plans: Number of coupons required to redeem the plan

  hasOnetimePricing: boolean("hasOnetimePricing").default(false),
  hasMonthlyPricing: boolean("hasMonthlyPricing").default(false),
  hasYearlyPricing: boolean("hasYearlyPricing").default(false),

  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),

  monthlyPrice: integer("monthlyPrice"),
  monthlyPriceAnchor: integer("monthlyPriceAnchor"),
  monthlyStripePriceId: text("monthlyStripePriceId"),
  monthlyLemonSqueezyVariantId: text("monthlyLemonSqueezyVariantId"),
  monthlyDodoProductId: text("monthlyDodoProductId"),
  monthlyPaddlePriceId: text("monthlyPaddlePriceId"),
  // Paypal plan id
  monthlyPaypalPlanId: text("monthlyPaypalPlanId"),
  monthlyPolarProductId: text("monthlyPolarProductId"),
  // Razorpay plan id (plan_xxx)
  monthlyRazorpayPlanId: text("monthlyRazorpayPlanId"),

  yearlyPrice: integer("yearlyPrice"),
  yearlyPriceAnchor: integer("yearlyPriceAnchor"),
  yearlyStripePriceId: text("yearlyStripePriceId"),
  yearlyLemonSqueezyVariantId: text("yearlyLemonSqueezyVariantId"),
  yearlyDodoProductId: text("yearlyDodoProductId"),
  yearlyPaddlePriceId: text("yearlyPaddlePriceId"),
  yearlyPaypalPlanId: text("yearlyPaypalPlanId"),
  yearlyPolarProductId: text("yearlyPolarProductId"),
  yearlyRazorpayPlanId: text("yearlyRazorpayPlanId"),
  
  onetimePrice: integer("onetimePrice"),
  onetimePriceAnchor: integer("onetimePriceAnchor"),
  onetimeStripePriceId: text("onetimeStripePriceId"),
  onetimeLemonSqueezyVariantId: text("onetimeLemonSqueezyVariantId"),
  onetimeDodoProductId: text("onetimeDodoProductId"),
  onetimePaddlePriceId: text("onetimePaddlePriceId"),
  onetimePaypalPlanId: text("onetimePaypalPlanId"), // Not Required, Added for standardization
  onetimePolarProductId: text("onetimePolarProductId"),
  // Razorpay item id (item_xxx) — amount + currency are read from the item
  onetimeRazorpayItemId: text("onetimeRazorpayItemId"),
  
  quotas: jsonb("quotas").$type<Quotas>(),
});
