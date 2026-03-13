"use client";

import { useEffect, useState } from "react";
import { getEventTypes } from "@/lib/api";

const DISMISSED_PREFIX = "imperaops.onboarding.dismissed.";

export function useOnboardingCheck(clientId: number) {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId <= 0) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    const key = `${DISMISSED_PREFIX}${clientId}`;
    if (typeof window !== "undefined" && localStorage.getItem(key) === "true") {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    getEventTypes(clientId)
      .then((types) => setNeedsOnboarding(types.length === 0))
      .catch(() => setNeedsOnboarding(false))
      .finally(() => setLoading(false));
  }, [clientId]);

  function dismiss() {
    if (clientId > 0) {
      localStorage.setItem(`${DISMISSED_PREFIX}${clientId}`, "true");
    }
    setNeedsOnboarding(false);
  }

  function markComplete() {
    setNeedsOnboarding(false);
  }

  return { needsOnboarding, loading, dismiss, markComplete };
}
