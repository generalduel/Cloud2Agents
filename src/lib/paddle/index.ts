import { getPaddleClient } from "./client";

export const createPaddleCheckout = async ({
  user,
  priceId,
}: {
  user: { email: string; id: string; paddleCustomerId?: string | null };
  priceId: string;
}) => {
  const paddle = getPaddleClient();
  if (!paddle) {
    throw new Error("Paddle client not initialized");
  }

  try {
    const transaction = await paddle.transactions.create({
      items: [
        {
          priceId: priceId,
          quantity: 1
        },
      ],
      // If customerId exists, use it; otherwise Paddle will create customer automatically
      customerId: user.paddleCustomerId ?? undefined,
      customData: {
        userId: user.id,
      },
    });

    if (!transaction.checkout?.url) {
      throw new Error("Paddle transaction created but no checkout URL found");
    }

    return {
      url: transaction.checkout.url,
      transactionId: transaction.id,
    };
  } catch (error) {
    console.error("Error creating Paddle transaction:", error);
    throw error;
  }
};

export const createPaddleCreditCheckout = async ({
  user,
  productId,
  creditAmount,
  creditType,
  totalPrice,
}: {
  user: { email: string; id: string; paddleCustomerId?: string | null };
  productId: string;
  creditAmount: number;
  creditType: string;
  totalPrice: number;
}) => {
  const paddle = getPaddleClient();
  if (!paddle) {
    throw new Error("Paddle client not initialized");
  }

  try {
    // Create transaction with non-catalog price
    const transaction = await paddle.transactions.create({
      items: [
        {
          price: {
            description: `${creditAmount} ${creditType} Credits`,
            productId: productId,
            unitPrice: {
              amount: Math.round(totalPrice * 100).toString(),
              currencyCode: "USD",
            },
            quantity: {
              minimum: 1,
              maximum: 1,
            },
          },
          quantity: 1,
        },
      ],
      // If customerId exists, use it; otherwise Paddle will create customer automatically
      customerId: user.paddleCustomerId ?? undefined,
      customData: {
        userId: user.id,
        purchaseType: "credits",
        creditType: creditType,
        creditAmount: creditAmount.toString(),
      },
      collectionMode: "automatic",
    });

    if (!transaction.checkout?.url) {
      throw new Error("Paddle transaction created but no checkout URL found");
    }

    return {
      url: transaction.checkout.url,
      transactionId: transaction.id,
    };
  } catch (error) {
    console.error("Error creating Paddle credit transaction:", error);
    throw error;
  }
};

export const createPaddleCustomerPortalSession = async (customerId: string) => {
  const paddle = getPaddleClient();
  if (!paddle) {
    throw new Error("Paddle client not initialized");
  }

  try {
    const session = await paddle.customerPortalSessions.create(customerId, []);
    return session;
  } catch (error) {
    console.error("Error creating Paddle customer portal session:", error);
    throw error;
  }
};
