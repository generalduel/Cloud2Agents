import { z } from "zod";
import {
  PlanBasedCredits,
  type CreditsConfig,
  type OnRegisterCredits,
} from "./credits";

export const creditTypeSchema = z.enum([
  "image_generation",
  "video_generation",
  // Tip: Add more credit types here
]);

export const creditsConfig: CreditsConfig = {
  image_generation: {
    // Credit type
    name: "Image Generation Credits",
    currency: "USD",
    minimumAmount: 1,
    slabs: [
      {
        from: 0,
        to: 1000,
        pricePerUnit: 0.01,
      },
    ],
  },
  video_generation: {
    name: "Video Generation Credits",
    currency: "USD",
    minimumAmount: 1,
    priceCalculator: (amountOfCredits, userPlan) => {
      // If userplan is provided, you can use it to calculate the price
      // For example, if user's plan is
      // enterprise plan and userPlan.quotas.videoCreditsRate is 0.0001,
      // return amountOfCredits * 0.0001
      // Else use default rate of 0.01
      console.log({ userPlan });
      return amountOfCredits * 0.01;
    },
  },
};

export const enableCredits = true; // Enable or disable credits

export const onRegisterCredits: OnRegisterCredits = {
  image_generation: {
    // Credit type
    amount: 50,
    expiryAfter: 30, // Optional, if not provided, credits will never expire
  },
};

export const onPlanChangeCredits: PlanBasedCredits = {
  test: {
    // Codename of the plan
    image_generation: {
      // Credit type
      amount: 100,
      expiryAfter: 30, // Optional, if not provided, credits will never expire
    },
    video_generation: {
      // Credit type
      amount: 100,
      expiryAfter: 30, // Optional, if not provided, credits will never expire
    },
  },
};
