import {
  timestamp,
  pgTable,
  text,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./user";
import { type CreditType } from "@/lib/credits/credits";

// Transaction types enum
export const transactionTypeEnum = pgEnum("transaction_type", [
  "credit",
  "debit",
  "expired",
]);

export const creditTransactions = pgTable("credit_transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Type of transaction: credit (added), debit (used), expired
  transactionType: transactionTypeEnum("transaction_type").notNull(),

  // Type of credit: image_generation, video_generation, etc.
  creditType: text("credit_type").$type<CreditType>().notNull(),

  // Amount of credits (positive for credit/expired, positive for debit too for clarity)
  amount: integer("amount").notNull(),

  // Payment ID for duplicate prevention (indexed for performance)
  paymentId: text("payment_id"),

  expirationDate: timestamp("expiration_date", { mode: "date" }),
  // Optional metadata for additional context
  metadata: jsonb("metadata").$type<{
    reason?: string;
    order_id?: string;
    planId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>(),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
