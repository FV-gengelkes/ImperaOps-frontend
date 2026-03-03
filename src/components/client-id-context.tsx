"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";

const STORAGE_KEY = "freightvis.clientId";

type ClientIdContextValue = {
  clientId: string;
  setClientId: (clientId: string) => void;
};

const ClientIdContext = createContext<ClientIdContextValue | undefined>(undefined);

export function ClientIdProvider(props: { children: React.ReactNode }) {
  const auth = useAuth();
  const [manualClientId, setManualClientIdState] = useState<string>("");

  // Load manual value from storage on mount (for unauthenticated / override use)
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) || "";
    setManualClientIdState(saved);
  }, []);

  // When auth provides an activeClientId, it takes priority
  const clientId = auth.activeClientId || manualClientId;

  const setClientId = (next: string) => {
    if (auth.isAuthenticated) {
      auth.setActiveClientId(next);
    } else {
      setManualClientIdState(next);
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const value = useMemo(() => ({ clientId, setClientId }), [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  return <ClientIdContext.Provider value={value}>{props.children}</ClientIdContext.Provider>;
}

export function useClientId() {
  const ctx = useContext(ClientIdContext);
  if (!ctx) throw new Error("useClientId must be used within ClientIdProvider");
  return ctx;
}
