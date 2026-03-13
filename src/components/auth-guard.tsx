"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { useTokenRefresh } from "@/hooks/use-token-refresh";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready } = useAuth();
  const router = useRouter();

  useTokenRefresh();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, router]);

  // Wait for localStorage rehydration before making auth decisions
  if (!ready) return null;

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
