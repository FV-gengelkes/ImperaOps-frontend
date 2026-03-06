"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as apiLogin, clearStoredToken, getStoredToken, setStoredToken } from "@/lib/api";
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

  // Rehydrate from localStorage on mount
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
        // Back-fill id from token for sessions that predate this field
        if (!u.id) u.id = parseUserIdFromToken(token);
        setUser(u);
        const parsedClients: ClientAccessDto[] = clientsJson ? JSON.parse(clientsJson) : [];
        setClients(parsedClients);
        setIsSuperAdmin(savedSuperAdmin);
        setActiveClientIdState(savedClientId || parsedClients[0]?.id || 0);
      } catch {
        logout(); // Corrupted storage — clear it
      }
    }
    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveClientId = useCallback((id: number) => {
    setActiveClientIdState(id);
    window.localStorage.setItem(CLIENT_ID_KEY, String(id));
  }, []);

  const applyAuthResult = useCallback((result: AuthResultDto) => {
    setStoredToken(result.token);
    const u: AuthUser = { id: parseUserIdFromToken(result.token), displayName: result.displayName, email: result.email };
    setUser(u);
    setClients(result.clients);
    setIsSuperAdmin(result.isSuperAdmin);
    window.localStorage.setItem(AUTH_USER_KEY,       JSON.stringify(u));
    window.localStorage.setItem(AUTH_CLIENTS_KEY,    JSON.stringify(result.clients));
    window.localStorage.setItem(AUTH_SUPERADMIN_KEY, String(result.isSuperAdmin));
    const firstClientId = result.clients[0]?.id ?? 0;
    setActiveClientId(firstClientId);
  }, [setActiveClientId]);

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
    isAuthenticated: !!user,
    ready,
  }), [user, clients, activeClientId, isSuperAdmin, setActiveClientId, login, loginWithResult, logout, updateUser, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
