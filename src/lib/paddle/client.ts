import { Paddle, Environment } from "@paddle/paddle-node-sdk";

export const getPaddleClient = () => {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    console.warn("PADDLE_API_KEY is not set. Paddle features will not work.");
    // Return a dummy object or throw, depending on usage. 
    // For now, we'll let the SDK throw or fail if initialized without key if strictly required,
    // but the SDK constructor usually takes the key.
    // If we want optional mode, we can return null and handle it in the caller.
    return null;
  }
  
  return new Paddle(apiKey, {
    environment: process.env.NODE_ENV === "production" ? Environment.production : Environment.sandbox,
  });
};

