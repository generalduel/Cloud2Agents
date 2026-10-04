import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import {
  users,
  sessions,
  accounts,
  verifications,
} from "./db/schema/user";
import onUserCreate from "./lib/users/onUserCreate";
import { eq } from "drizzle-orm";
import { render } from "react-email";
import MagicLinkEmail from "./emails/MagicLinkEmail";
import ResetPasswordEmail from "./emails/ResetPasswordEmail";
import sendMail from "./lib/email/sendMail";
import { appConfig } from "./lib/config";

const signInEnabled = process.env.NEXT_PUBLIC_SIGNIN_ENABLED === "true";
const passwordAuthEnabled =
  signInEnabled && (appConfig.auth?.enablePasswordAuth ?? false);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      app_user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  user: {
    modelName: "app_user",
    additionalFields: {
      planId: { type: "string", required: false, input: false },
      credits: { type: "string", required: false, input: false },
      stripeCustomerId: { type: "string", required: false, input: false },
      stripeSubscriptionId: { type: "string", required: false, input: false },
      lemonSqueezyCustomerId: { type: "string", required: false, input: false },
      lemonSqueezySubscriptionId: {
        type: "string",
        required: false,
        input: false,
      },
      dodoCustomerId: { type: "string", required: false, input: false },
      dodoSubscriptionId: { type: "string", required: false, input: false },
      paddleCustomerId: { type: "string", required: false, input: false },
      paddleSubscriptionId: { type: "string", required: false, input: false },
      polarCustomerId: { type: "string", required: false, input: false },
      polarSubscriptionId: { type: "string", required: false, input: false },
      razorpayCustomerId: { type: "string", required: false, input: false },
      razorpaySubscriptionId: { type: "string", required: false, input: false },
      razorpayCancelsAt: { type: "date", required: false, input: false },
    },
  },
  session: {
    modelName: "session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: {
    modelName: "account",
  },
  emailAndPassword: {
    enabled: passwordAuthEnabled,
    sendResetPassword: async ({ user, url }) => {
      const html = await render(
        ResetPasswordEmail({
          url,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        })
      );
      void sendMail(
        user.email,
        `Reset your ${appConfig.projectName} password`,
        html
      );
    },
  },
  socialProviders: signInEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const adminEmails =
            process.env.SUPER_ADMIN_EMAILS?.split(",").map((e) => e.trim()) ??
            [];
          if (adminEmails.includes(user.email)) {
            await db
              .update(users)
              .set({ role: "admin" })
              .where(eq(users.id, user.id));
          }
          await onUserCreate(user);
        },
      },
    },
  },
  plugins: [
    ...(signInEnabled
      ? [
          magicLink({
            sendMagicLink: async ({ email, url }) => {
              if (process.env.NODE_ENV === "development") {
                console.log(`Magic link for ${email}: ${url}`);
              }
              const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
              const html = await render(MagicLinkEmail({ url, expiresAt }));
              void sendMail(email, `Sign in to ${appConfig.projectName}`, html);
            },
          }),
        ]
      : []),
    admin({
      impersonationSessionDuration: 60 * 30,
      defaultRole: "user",
    }),
    nextCookies(),
  ],
});

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;
