"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FaGoogle, FaSpinner } from "react-icons/fa";
import { toast } from "sonner";
import { appConfig } from "@/lib/config";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schema";
import Link from "next/link";

interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  callbackUrl?: string;
}

export function AuthForm({ className, callbackUrl, ...props }: AuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [email, setEmail] = React.useState<string>("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const showPasswordAuth = appConfig.auth?.enablePasswordAuth;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const getCallbackUrl = () =>
    callbackUrl || searchParams?.get("callbackUrl") || "/app";

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: getCallbackUrl(),
      });
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Failed to continue with Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async (data: LoginInput) => {
    setIsLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: getCallbackUrl(),
      });

      if (error) {
        toast.error("Invalid email or password");
      } else {
        router.push(getCallbackUrl());
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL: getCallbackUrl(),
      });

      if (error) {
        toast.error("Failed to send login email");
      } else {
        toast.success("Check your email for the login link");
        setEmail("");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        onClick={handleGoogleSignIn}
        className="w-full py-6"
      >
        {isLoading ? (
          <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FaGoogle className="mr-2 h-4 w-4" />
        )}
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with {showPasswordAuth ? "password" : "email"}
          </span>
        </div>
      </div>

      {showPasswordAuth ? (
        <form onSubmit={handleSubmit(handlePasswordSignIn)} className="flex flex-col gap-4">
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/reset-password"
                className="text-xs text-primary hover:text-primary/90 underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              placeholder="Enter your password"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              {...register("password")}
              className="w-full py-6"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full py-6">
            {isLoading && <FaSpinner className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      ) : (
        <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-6"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full py-6">
            {isLoading && <FaSpinner className="mr-2 h-4 w-4 animate-spin" />}
            Continue with Email
          </Button>
        </form>
      )}
    </div>
  );
}
