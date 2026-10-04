"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FaSpinner } from "react-icons/fa";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  resetPasswordRequestSchema,
  type ResetPasswordRequestInput,
} from "@/lib/validations/auth.schema";

export function ResetPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordRequestInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
  });

  const onSubmit = async (data: ResetPasswordRequestInput) => {
    setIsLoading(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/reset-password/confirm",
      });

      if (error) {
        toast.error(error.message || "Failed to send reset email");
        return;
      }

      setEmailSent(true);
      toast.success("Check your email for password reset instructions");
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
          <p className="text-sm text-green-700 dark:text-green-400">
            Check your email. If an account exists with that address, you&apos;ll
            receive instructions to reset your password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            placeholder="name@example.com"
            type="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            disabled={isLoading}
            {...register("email")}
            className="w-full py-6"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full py-6">
          {isLoading && <FaSpinner className="mr-2 h-4 w-4 animate-spin" />}
          Send Reset Link
        </Button>
      </form>
    </div>
  );
}
