"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

import { ResetPasswordConfirmForm } from "./reset-password-confirm-form";

const MISSING_TOKEN_MSG =
  "Invalid or missing token. Please request a new password reset link.";

function normalizeToken(raw: string | null): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

export function ResetPasswordConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = normalizeToken(searchParams.get("token"));

  if (!token) {
    return (
      <div className="flex flex-col gap-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Invalid Link
          </h1>
          <p className="text-sm text-muted-foreground">{MISSING_TOKEN_MSG}</p>
        </div>
        <Button
          onClick={() => router.push("/reset-password")}
          className="w-full py-6"
        >
          Request New Link
        </Button>
      </div>
    );
  }

  return <ResetPasswordConfirmForm token={token} />;
}
