"use client";

import { useEffect, useState } from "react";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { Building2, CheckCircle2 } from "lucide-react";

export function ClientIdBar() {
  const { clientId, setClientId } = useClientId();
  const { isAuthenticated, clients } = useAuth();
  const [value, setValue] = useState(clientId);

  useEffect(() => {
    setValue(clientId);
  }, [clientId]);

  function save(next: string) {
    setValue(next);
    setClientId(next);
  }

  const isSet = clientId.trim().length > 0;

  // When logged in, show client name instead of raw UUID input
  if (isAuthenticated) {
    const activeClient = clients.find(c => c.id === clientId);
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3.5 mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Building2 size={17} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Active Client</span>
        </div>
        <div className="flex-1 px-3 py-1.5 text-sm border border-slate-100 rounded-lg bg-slate-50 text-slate-700 font-medium">
          {activeClient?.name ?? "—"}
        </div>
        {isSet && (
          <div className="flex items-center gap-1.5 shrink-0 text-emerald-600 text-xs font-medium">
            <CheckCircle2 size={15} />
            <span className="hidden sm:inline">Active</span>
          </div>
        )}
      </div>
    );
  }

  // Unauthenticated fallback — manual UUID entry
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3.5 mb-6 flex items-center gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <Building2 size={17} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">Client ID</span>
      </div>

      <input
        className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-slate-700 min-w-0 transition-all"
        value={value}
        onChange={(e) => save(e.target.value)}
        placeholder="e.g. 11111111-1111-1111-1111-111111111111"
      />

      {isSet ? (
        <div className="flex items-center gap-1.5 shrink-0 text-emerald-600 text-xs font-medium">
          <CheckCircle2 size={15} />
          <span className="hidden sm:inline">Active</span>
        </div>
      ) : (
        <span className="shrink-0 text-xs text-slate-400 hidden sm:inline">Not set</span>
      )}
    </div>
  );
}
