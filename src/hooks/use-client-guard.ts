"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useClientId } from "@/components/client-id-context";

/**
 * Redirects the user when the active client doesn't match the resource's owner.
 *
 * Pass `resourceClientId` once it's known (e.g. after fetching a detail record).
 * While it's null/undefined (still loading) the guard is dormant.
 *
 * Super admins are never redirected — they can view any client's resources.
 *
 * For non-super-admin users, if the resource belongs to a different client,
 * the guard auto-switches the active client context instead of redirecting,
 * provided the user has access to that client.
 *
 * @param resourceClientId - The clientId that owns the resource. Pass null while loading.
 * @param fallback         - Where to redirect on mismatch. Defaults to "/events/list".
 */
export function useClientGuard(
  resourceClientId: number | null | undefined,
  fallback = "/events/list",
) {
  const { clientId, setClientId } = useClientId();
  const { isSuperAdmin, clients } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!resourceClientId || !clientId) return;
    if (resourceClientId === clientId) return;

    // Super admins can view any client — auto-switch context
    if (isSuperAdmin) {
      setClientId(resourceClientId);
      return;
    }

    // Regular users: switch if they have access, otherwise redirect
    const hasAccess = clients.some(c => c.id === resourceClientId);
    if (hasAccess) {
      setClientId(resourceClientId);
    } else {
      router.replace(fallback);
    }
  }, [resourceClientId, clientId]); // eslint-disable-line react-hooks/exhaustive-deps
}
