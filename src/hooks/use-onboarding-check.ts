"use client";

import { useEffect, useState } from "react";
import { getEventTypes } from "@/lib/api";

const DISMISSED_PREFIX = "imperaops.onboarding.dismissed.";

export function useOnboardingCheck(clientId: number) {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [wasDismissed, setWasDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId <= 0) {
      setNeedsOnboarding(false);
      setWasDismissed(false);
      setLoading(false);
      return;
    }

    const key = `${DISMISSED_PREFIX}${clientId}`;
    const dismissed = typeof window !== "undefined" && localStorage.getItem(key) === "true";

    setLoading(true);
    getEventTypes(clientId)
      .then((types) => {
        const unconfigured = types.length === 0;
        setNeedsOnboarding(unconfigured && !dismissed);
        setWasDismissed(unconfigured && dismissed);
      })
      .catch(() => {
        setNeedsOnboarding(false);
        setWasDismissed(false);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  function dismiss() {
    if (clientId > 0) {
      localStorage.setItem(`${DISMISSED_PREFIX}${clientId}`, "true");
    }
    setNeedsOnboarding(false);
    setWasDismissed(true);
  }

  function markComplete() {
    setNeedsOnboarding(false);
    setWasDismissed(false);
  }

  function relaunch() {
    if (clientId > 0) {
      localStorage.removeItem(`${DISMISSED_PREFIX}${clientId}`);
    }
    setNeedsOnboarding(true);
    setWasDismissed(false);
  }

  return { needsOnboarding, wasDismissed, loading, dismiss, markComplete, relaunch };
}
