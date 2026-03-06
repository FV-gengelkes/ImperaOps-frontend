"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { getClientBranding } from "@/lib/api";
import type { ClientBrandingDto } from "@/lib/types";

/** Returns '#000000' or '#ffffff' — whichever is more readable on the given hex background. */
export function brandTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? "#000000" : "#ffffff";
}

type BrandingContextValue = {
  branding: ClientBrandingDto | null;
  reload: () => void;
};

const BrandingContext = createContext<BrandingContextValue>({ branding: null, reload: () => {} });

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { activeClientId, isAuthenticated } = useAuth();
  const [branding, setBranding] = useState<ClientBrandingDto | null>(null);

  const load = useCallback(() => {
    if (!activeClientId || !isAuthenticated) {
      setBranding(null);
      return;
    }
    getClientBranding(activeClientId)
      .then(setBranding)
      .catch(() => setBranding(null));
  }, [activeClientId, isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  // Apply client brand colors as CSS custom properties
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (branding?.primaryColor) {
      document.documentElement.style.setProperty("--color-brand", branding.primaryColor);
    } else {
      document.documentElement.style.removeProperty("--color-brand");
    }
    if (branding?.linkColor) {
      document.documentElement.style.setProperty("--color-brand-link", branding.linkColor);
    } else {
      document.documentElement.style.removeProperty("--color-brand-link");
    }
  }, [branding?.primaryColor, branding?.linkColor]);

  return (
    <BrandingContext.Provider value={{ branding, reload: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
