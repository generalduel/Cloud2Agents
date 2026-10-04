import { db } from "@/db";
import { CreditTransaction, creditTransactions } from "@/db/schema/credits";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { type CreditType } from "./credits";

type CreditRecord = {
  [K in CreditType]?: number;
};

/**
 * Recalculates user credits based on all credit transactions
 * @param userId - The user ID to recalculate credits for
 * @returns Promise<CreditRecord> - The updated credit balances
 */
export async function recalculateUserCredits(userId: string): Promise<CreditRecord> {
  try {
    // Get all credit transactions for the user
    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(creditTransactions.createdAt);

    // Calculate balances for each credit type
    const creditBalances: CreditRecord = {};

    for (const transaction of transactions) {
      const { creditType, transactionType, amount } = transaction;
      
      // Initialize credit type if not exists
      if (!creditBalances[creditType]) {
        creditBalances[creditType] = 0;
      }

      // Apply transaction based on type
      switch (transactionType) {
        case "credit":
          // Add credits
          creditBalances[creditType]! += amount;
          break;
        case "debit":
          // Subtract credits (amount is stored as positive)
          creditBalances[creditType]! -= amount;
          break;
        case "expired":
          // Subtract expired credits (amount is stored as positive)
          creditBalances[creditType]! -= amount;
          break;
      }
    }

    // Update user's credits field
    await db
      .update(users)
      .set({ credits: creditBalances })
      .where(eq(users.id, userId));

    return creditBalances;
  } catch (error) {
    console.error("Error recalculating user credits:", error);
    throw new Error(`Failed to recalculate credits for user ${userId}`);
  }
}

/**
 * Adds a credit transaction and updates user balance directly
 * @param userId - User ID
 * @param creditType - Type of credit
 * @param transactionType - Type of transaction (credit, debit, expired)
 * @param amount - Amount of credits (always positive)
 * @param paymentId - Optional payment ID for duplicate prevention
 * @param metadata - Optional metadata
 * @param expirationDate - Optional expiration date for the credits
 * @returns Promise<CreditRecord> - Updated credit balances
 * 
 * @example
 * // Add 100 image generation credits with payment ID and expiration
 * await addCreditTransaction("user123", "image_generation", "credit", 100, "payment_123", {
 *   reason: "Purchase",
 *   orderId: "order_123"
 * }, new Date('2024-12-31'));
 * 
 * // Use 5 image generation credits
 * await addCreditTransaction("user123", "image_generation", "debit", 5, null, {
 *   reason: "Image generated"
 * });
 * 
 * // Expire 10 video generation credits
 * await addCreditTransaction("user123", "video_generation", "expired", 10, null, {
 *   reason: "Credits expired after 30 days"
 * });
 */
export async function addCreditTransaction(
  userId: string,
  creditType: CreditType,
  transactionType: "credit" | "debit" | "expired",
  amount: number,
  paymentId?: string | null,
  metadata?: CreditTransaction["metadata"],
  expirationDate?: Date | null
): Promise<CreditRecord> {
  try {
    // Validate amount is positive
    if (amount <= 0) {
      throw new Error("Credit amount must be positive");
    }

    // Check for duplicate paymentId if provided
    if (paymentId) {
      const existingTransaction = await db
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.paymentId, paymentId))
        .limit(1);

      if (existingTransaction.length > 0) {
        throw new Error(`Transaction with paymentId ${paymentId} already exists`);
      }
    }

    // Get current user credits
    const currentUser = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser.length) {
      throw new Error(`User ${userId} not found`);
    }

    const currentCredits: CreditRecord = currentUser[0].credits || {};
    
    // Initialize credit type if not exists
    if (!currentCredits[creditType]) {
      currentCredits[creditType] = 0;
    }

    // Calculate new balance based on transaction type
    let newBalance = currentCredits[creditType]!;
    switch (transactionType) {
      case "credit":
        newBalance += amount;
        break;
      case "debit":
      case "expired":
        newBalance -= amount;
        // Do not care about negative balance as bans can cause this
        break;
    }

    // Update the credits in the user record
    const updatedCredits = { ...currentCredits, [creditType]: newBalance };

    // Insert the transaction record
    await db.insert(creditTransactions).values({
      userId,
      creditType,
      transactionType,
      amount,
      paymentId,
      metadata,
      expirationDate,
    });

    // Update user's credits
    await db
      .update(users)
      .set({ credits: updatedCredits })
      .where(eq(users.id, userId));

    return updatedCredits;
  } catch (error) {
    console.error("Error adding credit transaction:", error);
    throw new Error(`Failed to add credit transaction for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets current credit balance for a user without recalculating
 * @param userId - User ID
 * @returns Promise<CreditRecord> - Current credit balances from user table
 */
export async function getUserCredits(userId: string): Promise<CreditRecord> {
  try {
    const user = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user[0]?.credits || {};
  } catch (error) {
    console.error("Error getting user credits:", error);
    throw new Error(`Failed to get credits for user ${userId}`);
  }
}

/**
 * Adds credits to a user's account with duplicate prevention
 * @param userId - User ID
 * @param creditType - Type of credit
 * @param amount - Amount of credits to add
 * @param paymentId - Payment ID for duplicate prevention
 * @param metadata - Optional metadata
 * @param expirationDate - Optional expiration date for the credits
 * @returns Promise<CreditRecord> - Updated credit balances
 */
export async function addCredits(
  userId: string,
  creditType: CreditType,
  amount: number,
  paymentId: string,
  metadata?: CreditTransaction["metadata"],
  expirationDate?: Date | null
): Promise<CreditRecord> {
  return await addCreditTransaction(userId, creditType, "credit", amount, paymentId, metadata, expirationDate);
}

/**
 * Deducts credits from a user's account (with balance check)
 * @param userId - User ID
 * @param creditType - Type of credit
 * @param amount - Amount of credits to deduct
 * @param metadata - Optional metadata
 * @returns Promise<CreditRecord> - Updated credit balances
 * @throws Error if insufficient credits
 */
export async function deductCredits(
  userId: string,
  creditType: CreditType,
  amount: number,
  metadata?: CreditTransaction["metadata"]
): Promise<CreditRecord> {
  // Check if user has sufficient credits
  const currentCredits = await getUserCredits(userId);
  const availableCredits = currentCredits[creditType] || 0;
  
  if (availableCredits < amount) {
    throw new Error(`Insufficient ${creditType} credits. Available: ${availableCredits}, Required: ${amount}`);
  }

  return await addCreditTransaction(userId, creditType, "debit", amount, null, metadata);
}
