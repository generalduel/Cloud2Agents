"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { FaSpinner } from "react-icons/fa";

export default function SignOutPage() {
  useEffect(() => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center py-10 gap-4">
      <FaSpinner className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Signing you out...</p>
    </div>
  );
}
