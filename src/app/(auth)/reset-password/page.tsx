import { Metadata } from "next";
import Link from "next/link";
import { appConfig } from "@/lib/config";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: `Reset your ${appConfig.projectName} password`,
};

export default function ResetPasswordPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Reset Password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password
        </p>
      </div>

      <ResetPasswordForm />

      <div className="mt-6 text-center">
        <Link
          href="/sign-in"
          className="text-sm text-primary hover:text-primary/90 underline underline-offset-4"
        >
          Back to Sign In
        </Link>
      </div>
    </>
  );
}

