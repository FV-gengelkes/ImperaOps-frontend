"use client";

import { useEffect, useRef } from "react";

/**
 * Warns the user when they try to navigate away with unsaved changes.
 * Handles:
 *  - Browser refresh / tab close (beforeunload)
 *  - In-app link clicks (intercepts before Next.js processes them)
 *  - Browser back / forward (popstate)
 */
export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Browser refresh / close
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // In-app link clicks — capture phase so we run before Next.js
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!dirtyRef.current) return;

      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;

      // Allow same-page navigation (tab switches use ?tab=)
      const target = new URL(href, window.location.origin);
      if (target.pathname === window.location.pathname) return;

      const ok = window.confirm(
        "You have unsaved changes. Are you sure you want to leave this page?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // Capture phase ensures we fire before Next.js's click handler
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Browser back / forward
  useEffect(() => {
    const currentUrl = window.location.href;

    function handlePopState() {
      if (!dirtyRef.current) return;

      const ok = window.confirm(
        "You have unsaved changes. Are you sure you want to leave this page?"
      );
      if (!ok) {
        history.pushState(null, "", currentUrl);
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
}
