"use client";

import { RefreshCw } from "lucide-react";
import { useVersionCheck } from "@/hooks/use-version-check";

/**
 * Renders a slim banner at the top of the page when a new frontend version
 * has been deployed. The user can click "Refresh" when they're ready.
 */
export function UpdateBanner() {
  const { updateAvailable, refresh } = useVersionCheck();

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-3 bg-brand text-white text-sm py-2 px-4 shadow-lg">
      <span>A new version of ImperaOps is available.</span>
      <button
        onClick={refresh}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition"
      >
        <RefreshCw size={13} />
        Refresh now
      </button>
    </div>
  );
}
