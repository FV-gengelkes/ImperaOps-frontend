"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { ShieldOff } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSuperAdmin, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace("/login");
  }, [ready, isAuthenticated, router]);

  if (!ready) return null;
  if (!isAuthenticated) return null;

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-400">
        <ShieldOff size={40} className="text-slate-600" />
        <p className="text-lg font-semibold text-slate-300">Access Denied</p>
        <p className="text-sm">You need super-admin privileges to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
