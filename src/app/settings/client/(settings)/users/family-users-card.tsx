"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Shield } from "lucide-react";
import { addClientUser, adminGetClients, getFamilyUsers } from "@/lib/api";
import type { ClientUserDto } from "@/lib/types";
import { inputCls, ROLES } from "./users-shared";

export function FamilyUsersCard({ clientId, onAdded }: { clientId: number; onAdded: (user: ClientUserDto) => void }) {
  const [users,   setUsers]   = useState<ClientUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChild, setIsChild] = useState<boolean | null>(null);
  const [filter,  setFilter]  = useState("");
  const [adding,  setAdding]  = useState<string | null>(null);
  const [roles,   setRoles]   = useState<Record<string, string>>({});
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    adminGetClients()
      .then(clients => {
        const client = clients.find(c => c.id === clientId);
        const child = !!client?.parentClientId;
        setIsChild(child);
        if (child) return getFamilyUsers(clientId).then(setUsers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleAdd(user: ClientUserDto) {
    const role = roles[String(user.id)] ?? "Member";
    setAdding(String(user.id));
    setError("");
    try {
      const added = await addClientUser(clientId, user.email, role);
      onAdded(added);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to add user.");
    } finally {
      setAdding(null);
    }
  }

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase())
  );

  if (isChild === false) return null;

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-indigo-100">
        <div className="flex items-center gap-2 mb-0.5">
          <Shield size={14} className="text-indigo-500 shrink-0" />
          <h2 className="font-semibold text-slate-800">Add from Family</h2>
        </div>
        <p className="text-xs text-slate-500">
          Users from related clients in this account's hierarchy who don't yet have access here.
        </p>
      </div>

      <div className="px-5 py-4">
        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-400">No eligible users from related clients.</p>
        ) : (
          <>
            <input
              className={inputCls + " w-full mb-3"}
              placeholder="Filter by name or email..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <ul className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
              {filtered.map(user => (
                <li key={String(user.id)} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {user.displayName[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <select
                    className="text-xs rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer shrink-0"
                    value={roles[String(user.id)] ?? "Member"}
                    onChange={e => setRoles(prev => ({ ...prev, [String(user.id)]: e.target.value }))}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button
                    onClick={() => void handleAdd(user)}
                    disabled={adding === String(user.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {adding === String(user.id)
                      ? <RefreshCw size={11} className="animate-spin" />
                      : <Plus size={11} />
                    }
                    Add
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">No matches.</p>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
