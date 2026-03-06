"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";

const STORAGE_KEY = "imperaops.clientId";

type ClientIdContextValue = {
  clientId: number;
  setClientId: (clientId: number) => void;
};

const ClientIdContext = createContext<ClientIdContextValue | undefined>(undefined);

export function ClientIdProvider(props: { children: React.ReactNode }) {
  const auth = useAuth();
  const [manualClientId, setManualClientIdState] = useState<number>(0);

  // Load manual value from storage on mount (for unauthenticated / override use)
  useEffect(() => {
    const saved = parseInt(window.localStorage.getItem(STORAGE_KEY) || "") || 0;
    setManualClientIdState(saved);
  }, []);

  // When auth provides an activeClientId, it takes priority
  const clientId = auth.activeClientId || manualClientId;

  const setClientId = (next: number) => {
    if (auth.isAuthenticated) {
      auth.setActiveClientId(next);
    } else {
      setManualClientIdState(next);
      window.localStorage.setItem(STORAGE_KEY, String(next));
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
