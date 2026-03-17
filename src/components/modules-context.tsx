"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { getClientModules } from "@/lib/api";

type ModulesContextValue = {
  enabledModules: string[];
  hasModule: (moduleId: string) => boolean;
  reload: () => void;
};

const ModulesContext = createContext<ModulesContextValue>({
  enabledModules: [],
  hasModule: () => false,
  reload: () => {},
});

export function ModulesProvider({ children }: { children: React.ReactNode }) {
  const { activeClientId, isAuthenticated } = useAuth();
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  const load = useCallback(() => {
    if (!activeClientId || !isAuthenticated) {
      setEnabledModules([]);
      return;
    }
    getClientModules(activeClientId)
      .then((res) => setEnabledModules(res.enabledModuleIds ?? []))
      .catch(() => setEnabledModules([]));
  }, [activeClientId, isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const hasModule = useCallback(
    (moduleId: string) => enabledModules.includes(moduleId),
    [enabledModules]
  );

  return (
    <ModulesContext.Provider value={{ enabledModules, hasModule, reload: load }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  return useContext(ModulesContext);
}
