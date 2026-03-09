"use client";

import { useEffect, useState } from "react";
import { Laptop, Loader2, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { getSessions, revokeOtherSessions, revokeSession } from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import type { SessionDto } from "@/lib/types";

function deviceIcon(ua: string | null) {
  if (!ua) return <Monitor size={15} className="text-slate-400 shrink-0" />;
  const lower = ua.toLowerCase();
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone"))
    return <Smartphone size={15} className="text-slate-400 shrink-0" />;
  if (lower.includes("tablet") || lower.includes("ipad"))
    return <Laptop size={15} className="text-slate-400 shrink-0" />;
  return <Monitor size={15} className="text-slate-400 shrink-0" />;
}

function parseUa(ua: string | null): string {
  if (!ua) return "Unknown device";
  const match = ua.match(/\(([^)]+)\)/);
  const platform = match?.[1]?.split(";")[0]?.trim() ?? "";
  const browser =
    ua.includes("Edg/")     ? "Edge" :
    ua.includes("Chrome/")  ? "Chrome" :
    ua.includes("Firefox/") ? "Firefox" :
    ua.includes("Safari/")  ? "Safari" : "Browser";
  return platform ? `${browser} · ${platform}` : browser;
}

export function SessionsCard() {
  const { logout } = useAuth();
  const toast = useToast();
  const [sessions,  setSessions]  = useState<SessionDto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [revoking,  setRevoking]  = useState<number | "others" | null>(null);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRevoke(id: number, isCurrent: boolean) {
    setRevoking(id);
    try {
      await revokeSession(id);
      if (isCurrent) {
        logout();
      } else {
        setSessions(prev => prev.filter(s => s.id !== id));
        toast.success("Session revoked");
      }
    } catch {
      toast.error("Failed to revoke session.");
    } finally {
      setRevoking(null);
    }
  }

  async function handleRevokeOthers() {
    setRevoking("others");
    try {
      await revokeOtherSessions();
      setSessions(prev => prev.filter(s => s.isCurrent));
      toast.success("All other sessions revoked");
    } catch {
      toast.error("Failed to revoke sessions.");
    } finally {
      setRevoking(null);
    }
  }

  const otherCount = sessions.filter(s => !s.isCurrent).length;

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Active Sessions</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-slate-400">No active sessions found.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${s.isCurrent ? "border-brand/30 bg-brand/5" : "border-slate-100 dark:border-slate-line bg-slate-50 dark:bg-midnight"}`}>
              {deviceIcon(s.description)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-steel-white truncate">{parseUa(s.description)}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Signed in {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" · "}Expires {new Date(s.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              {s.isCurrent && (
                <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full shrink-0">THIS DEVICE</span>
              )}
              <button
                onClick={() => handleRevoke(s.id, s.isCurrent)}
                disabled={revoking !== null}
                className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 shrink-0 transition-colors"
              >
                {revoking === s.id ? <Loader2 size={12} className="animate-spin" /> : s.isCurrent ? "Sign out" : "Revoke"}
              </button>
            </div>
          ))}

          {otherCount > 0 && (
            <div className="pt-2">
              <button
                onClick={handleRevokeOthers}
                disabled={revoking !== null}
                className="text-sm font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
              >
                {revoking === "others" ? "Revoking..." : `Sign out all other sessions (${otherCount})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
