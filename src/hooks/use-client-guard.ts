"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClientId } from "@/components/client-id-context";

/**
 * Redirects the user when the active client doesn't match the resource's owner.
 *
 * Pass `resourceClientId` once it's known (e.g. after fetching a detail record).
 * While it's null/undefined (still loading) the guard is dormant.
 *
 * Covers two scenarios:
 *   1. Opening a URL that belongs to a different client.
 *   2. Switching clients while already viewing the resource.
 *
 * @param resourceClientId - The clientId that owns the resource. Pass null while loading.
 * @param fallback         - Where to redirect on mismatch. Defaults to "/incident/list".
 */
export function useClientGuard(
  resourceClientId: string | null | undefined,
  fallback = "/incident/list",
) {
  const { clientId } = useClientId();
  const router = useRouter();

  useEffect(() => {
    if (!resourceClientId || !clientId) return;
    if (resourceClientId !== clientId) {
      router.replace(fallback);
    }
  }, [resourceClientId, clientId]); // eslint-disable-line react-hooks/exhaustive-deps
}
