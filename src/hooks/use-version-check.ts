"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 60_000; // check every 60 seconds
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/**
 * Polls the frontend `/api/build-id` endpoint to detect new deployments.
 * Returns `updateAvailable: true` when the server's build ID differs from
 * the one baked into this client bundle.
 */
export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/build-id", { cache: "no-store" });
      if (!res.ok) return;
      const { buildId } = await res.json();
      if (buildId && buildId !== BUILD_ID) {
        setUpdateAvailable(true);
      }
    } catch {
      // Network error — ignore, will retry next interval
    }
  }, []);

  useEffect(() => {
    // Don't poll in dev mode
    if (BUILD_ID === "dev") return;

    timerRef.current = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [check]);

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  return { updateAvailable, refresh };
}
