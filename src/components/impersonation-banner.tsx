"use client";

import { Eye, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

/**
 * Shown when a super admin is viewing a client they are not natively assigned to.
 * Allows them to quickly stop impersonating and return to their own first client.
 */
export function ImpersonationBanner() {
  const { isSuperAdmin, clients, activeClientId, setActiveClientId } = useAuth();
  const router = useRouter();

  if (!isSuperAdmin) return null;

  // If the super admin's assigned clients include the active client, no banner needed
  const isNative = clients.some(c => c.id === activeClientId);
  if (isNative || !activeClientId) return null;

  function stopImpersonating() {
    const firstOwn = clients[0]?.id ?? "";
    setActiveClientId(firstOwn);
    router.refresh();
    router.push("/dashboard");
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center gap-3 text-sm font-medium">
      <Eye size={15} className="shrink-0" />
      <span className="flex-1">
        Viewing as a different client context. Data shown is scoped to the selected client.
      </span>
      <button
        onClick={stopImpersonating}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950/15 hover:bg-amber-950/25 transition text-xs font-semibold"
      >
        <X size={12} />
        Exit
      </button>
    </div>
  );
}
