"use client";

import { useEffect } from "react";
import { getStoredToken, setStoredToken } from "@/lib/api";

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

const REFRESH_MARGIN_MS = 30 * 60 * 1000; // 30 minutes before expiry
const CHECK_INTERVAL_MS = 5 * 60 * 1000;  // check every 5 minutes

export function useTokenRefresh() {
  useEffect(() => {
    async function maybeRefresh() {
      const token = getStoredToken();
      if (!token) return;

      const expiry = getTokenExpiry(token);
      if (!expiry) return;

      const remaining = expiry - Date.now();
      if (remaining > REFRESH_MARGIN_MS) return;
      if (remaining <= 0) return; // already expired, let 401 handler deal with it

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/v1/auth/refresh`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.token) setStoredToken(data.token);
        }
      } catch {
        // silent failure — the 401 interceptor will handle actual expiry
      }
    }

    maybeRefresh();
    const id = setInterval(maybeRefresh, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
