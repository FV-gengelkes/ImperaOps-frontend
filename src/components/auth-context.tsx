"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as apiLogin, setActiveClient as apiSetActiveClient, clearStoredToken, getStoredToken, setStoredToken } from "@/lib/api";
import type { AuthResultDto, ClientAccessDto, LoginResult } from "@/lib/types";

const CLIENT_ID_KEY       = "imperaops.clientId";
const AUTH_USER_KEY       = "imperaops.user";
const AUTH_CLIENTS_KEY    = "imperaops.clients";
const AUTH_SUPERADMIN_KEY = "imperaops.isSuperAdmin";

type AuthUser = { id: string; displayName: string; email: string };

function parseUserIdFromToken(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return (payload.sub as string) ?? "";
  } catch {
    return "";
  }
}

type AuthContextValue = {
  user: AuthUser | null;
  clients: ClientAccessDto[];
  activeClientId: number;
  isSuperAdmin: boolean;
  setActiveClientId: (id: number) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginWithResult: (result: AuthResultDto) => void;
  logout: () => void;
  updateUser: (displayName: string, email: string) => void;
  /** Increment to signal components to re-fetch client lists */
  refreshClients: () => void;
  clientRefreshKey: number;
  isAuthenticated: boolean;
  /** false until localStorage has been read on first mount */
  ready: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]             = useState<AuthUser | null>(null);
  const [clients, setClients]       = useState<ClientAccessDto[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeClientId, setActiveClientIdState] = useState<number>(0);
  const [ready, setReady]           = useState(false);
  const [clientRefreshKey, setClientRefreshKey] = useState(0);

  // Rehydrate from localStorage on mount (runs once, before AppShell renders content)
  useEffect(() => {
    const token       = getStoredToken();
    const userJson    = window.localStorage.getItem(AUTH_USER_KEY);
    const clientsJson = window.localStorage.getItem(AUTH_CLIENTS_KEY);
    const savedClientIdStr  = window.localStorage.getItem(CLIENT_ID_KEY) ?? "";
    const savedClientId     = parseInt(savedClientIdStr) || 0;
    const savedSuperAdmin   = window.localStorage.getItem(AUTH_SUPERADMIN_KEY) === "true";

    if (token && userJson) {
      try {
        const u = JSON.parse(userJson) as AuthUser;
        if (!u.id) u.id = parseUserIdFromToken(token);
        setUser(u);
        const parsedClients: ClientAccessDto[] = clientsJson ? JSON.parse(clientsJson) : [];
        setClients(parsedClients);
        setIsSuperAdmin(savedSuperAdmin);
        setActiveClientIdState(savedClientId || parsedClients[0]?.id || 0);
      } catch {
        // Corrupted storage — will be cleared on logout
      }
    }
    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveClientId = useCallback((id: number) => {
    setActiveClientIdState(id);
    window.localStorage.setItem(CLIENT_ID_KEY, String(id));
    // Persist to server (fire-and-forget)
    apiSetActiveClient(id).catch(() => {});
  }, []);

  const applyAuthResult = useCallback((result: AuthResultDto) => {
    setStoredToken(result.token);
    const u: AuthUser = { id: parseUserIdFromToken(result.token), displayName: result.displayName, email: result.email };
    setUser(u);
    setIsSuperAdmin(result.isSuperAdmin);
    // Ensure active client is in the clients list so sidebar can display it immediately
    let clientsList = result.clients;
    const serverClientId = result.activeClientId ?? 0;
    if (serverClientId && result.activeClientName && !clientsList.some(c => c.id === serverClientId)) {
      clientsList = [{ id: serverClientId, name: result.activeClientName, role: "Admin", parentClientId: null }, ...clientsList];
    }
    setClients(clientsList);
    window.localStorage.setItem(AUTH_USER_KEY,       JSON.stringify(u));
    window.localStorage.setItem(AUTH_CLIENTS_KEY,    JSON.stringify(clientsList));
    window.localStorage.setItem(AUTH_SUPERADMIN_KEY, String(result.isSuperAdmin));
    // Use server-persisted active client, fall back to first client
    const restoredId = (serverClientId && (result.isSuperAdmin || clientsList.some(c => c.id === serverClientId)))
      ? serverClientId
      : clientsList[0]?.id ?? 0;
    // Set state + localStorage without re-persisting to server (server already knows)
    setActiveClientIdState(restoredId);
    window.localStorage.setItem(CLIENT_ID_KEY, String(restoredId));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const result = await apiLogin(email, password);
    if (!result.totpRequired) {
      applyAuthResult(result as AuthResultDto);
    }
    return result;
  }, [applyAuthResult]);

  const loginWithResult = useCallback((result: AuthResultDto) => {
    applyAuthResult(result);
  }, [applyAuthResult]);

  const updateUser = useCallback((displayName: string, email: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, displayName, email };
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshClients = useCallback(() => {
    setClientRefreshKey(k => k + 1);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    window.localStorage.removeItem(AUTH_USER_KEY);
    window.localStorage.removeItem(AUTH_CLIENTS_KEY);
    window.localStorage.removeItem(AUTH_SUPERADMIN_KEY);
    window.localStorage.removeItem(CLIENT_ID_KEY);
    setUser(null);
    setClients([]);
    setIsSuperAdmin(false);
    setActiveClientIdState(0);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    clients,
    activeClientId,
    isSuperAdmin,
    setActiveClientId,
    login,
    loginWithResult,
    logout,
    updateUser,
    refreshClients,
    clientRefreshKey,
    isAuthenticated: !!user,
    ready,
  }), [user, clients, activeClientId, isSuperAdmin, setActiveClientId, login, loginWithResult, logout, updateUser, refreshClients, clientRefreshKey, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
