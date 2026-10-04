import {
  boolean,
  timestamp,
  pgTable,
  text,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { plans } from "./plans";
import { type CreditType } from "@/lib/credits/credits";

type CreditRecord = {
  [K in CreditType]?: number;
};

export const users = pgTable("app_user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),

  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires", { mode: "date" }),

  credits: jsonb("credits").$type<CreditRecord>().default({}),

  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  lemonSqueezyCustomerId: text("lemonSqueezyCustomerId"),
  lemonSqueezySubscriptionId: text("lemonSqueezySubscriptionId"),
  dodoCustomerId: text("dodoCustomerId"),
  dodoSubscriptionId: text("dodoSubscriptionId"),
  paddleCustomerId: text("paddleCustomerId"),
  paddleSubscriptionId: text("paddleSubscriptionId"),
  polarCustomerId: text("polarCustomerId"),
  polarSubscriptionId: text("polarSubscriptionId"),
  razorpayCustomerId: text("razorpayCustomerId"),
  razorpaySubscriptionId: text("razorpaySubscriptionId"),
  // Set when the subscription is cancelled at period end (status stays active until then)
  razorpayCancelsAt: timestamp("razorpayCancelsAt", { mode: "date" }),

  planId: text("planId").references(() => plans.id),
});

export const sessions = pgTable("session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  impersonatedBy: text("impersonatedBy"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable("account", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const verifications = pgTable("verification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
