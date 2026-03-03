"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useClientId } from "@/components/client-id-context";

/**
 * Global client-switch redirect guard. Call this once in AppShell.
 *
 * When the active clientId changes (e.g. a super admin switches clients),
 * any page whose pathname matches a rule below is redirected to a safe
 * landing page for that section. Pages that fetch data by clientId
 * (list pages, dashboards, etc.) are intentionally left alone — they
 * naturally reload with the new client's data.
 *
 * To protect a new page type, add an entry to REDIRECT_RULES.
 */

const REDIRECT_RULES: Array<{ pattern: RegExp; to: string }> = [
  // Incident detail — URL contains a resource ID owned by a specific client
  { pattern: /^\/incident\/.+\/details$/, to: "/incident/list" },

  // Settings sub-pages — scoped to the active client; send back to hub
  // so the user consciously navigates into the new client's settings
  { pattern: /^\/settings\/client\/.+/, to: "/settings/client" },
];

export function useClientChangeRedirect() {
  const { clientId } = useClientId();
  const pathname = usePathname();
  const router = useRouter();
  const prevClientId = useRef<string | null>(null);

  useEffect(() => {
    // Skip on first mount — just record the baseline clientId
    if (prevClientId.current === null) {
      prevClientId.current = clientId;
      return;
    }

    const prev = prevClientId.current;
    prevClientId.current = clientId;

    // Only act when the client genuinely changes (not on empty→value transitions
    // that happen during auth hydration)
    if (!prev || !clientId || prev === clientId) return;

    const rule = REDIRECT_RULES.find(r => r.pattern.test(pathname));
    if (rule) {
      router.replace(rule.to);
    }
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps
}
