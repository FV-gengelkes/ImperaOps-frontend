"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Loader2, RefreshCw, Search,
  Shield, ShieldCheck, ShieldOff, X, XCircle,
} from "lucide-react";
import {
  adminCreateUser, adminDisableUserTotp, adminGetUsers, adminToggleUserActive, adminUpdateUser,
} from "@/lib/api";
import type { AdminUserDto } from "@/lib/types";
import { useToast } from "@/components/toast-context";

// ── Grant super admin modal ────────────────────────────────────────────────────

type GrantMode = "promote" | "create";

function GrantSuperAdminModal({
  candidates, onClose, onGranted, onCreated,
}: {
  candidates: AdminUserDto[];
  onClose: () => void;
  onGranted: (userId: number) => void;
  onCreated: (user: AdminUserDto) => void;
}) {
  const [mode, setMode]               = useState<GrantMode>("promote");
  const [query, setQuery]             = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName]   = useState("");
  const toast  = useToast();
  const [confirmed, setConfirmed]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "promote") searchRef.current?.focus();
  }, [mode]);

  function switchMode(m: GrantMode) {
    setMode(m);
    setQuery(""); setSelectedUser(null);
    setCreateEmail(""); setCreateName("");
    setConfirmed(false); setError("");
  }

  const searchResults = query.length >= 1 && !selectedUser
    ? candidates.filter(u =>
        u.email.toLowerCase().includes(query.toLowerCase()) ||
        u.displayName.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  const canSubmit =
    confirmed &&
    (mode === "promote" ? selectedUser !== null : createEmail.trim() !== "" && createName.trim() !== "");

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true); setError("");
    try {
      if (mode === "promote" && selectedUser) {
        await adminUpdateUser(selectedUser.id, {
          email: selectedUser.email, displayName: selectedUser.displayName,
          isActive: selectedUser.isActive, isSuperAdmin: true,
        });
        onGranted(selectedUser.id);
      } else if (mode === "create") {
        const result = await adminCreateUser({
          email: createEmail.trim(), displayName: createName.trim(), isSuperAdmin: true,
        });
        onCreated(result.user);
        if (!result.emailSent) {
          try { await navigator.clipboard.writeText(result.inviteUrl); } catch {}
          toast.warning("Email delivery failed — invite link copied to clipboard.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed.");
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
    "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-amber-500" />
            <h2 className="text-base font-semibold text-white">Super Admin Access</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-3 px-4 py-3.5 rounded-lg bg-red-950/50 border border-red-800/60">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">High-privilege action</p>
              <p className="text-xs text-red-400 mt-1 leading-relaxed">
                Super Admin access grants unrestricted access to every client, all data, and all system settings.
              </p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
            {(["promote", "create"] as GrantMode[]).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  mode === m ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}>
                {m === "promote" ? "Promote Existing" : "Create New Account"}
              </button>
            ))}
          </div>

          {/* Promote flow */}
          {mode === "promote" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Search by name or email</label>
              {selectedUser ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-950/40 border border-amber-700/50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {selectedUser.displayName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{selectedUser.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{selectedUser.email}</p>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setQuery(""); setTimeout(() => searchRef.current?.focus(), 0); }}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                      placeholder="Type a name or email…"
                      className={inputCls.replace("w-full", "") + " w-full pl-9"} />
                  </div>
                  {query.length >= 1 && (
                    <div className="mt-1.5 rounded-lg border border-slate-700 bg-slate-800/80 overflow-hidden">
                      {searchResults.length > 0 ? (
                        <ul>
                          {searchResults.map(u => (
                            <li key={u.id}>
                              <button onClick={() => { setSelectedUser(u); setQuery(""); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/60 transition-colors text-left">
                                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                                  {u.displayName[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-200 truncate">{u.displayName}</p>
                                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                </div>
                                {!u.isActive && <span className="text-xs text-slate-500 shrink-0">Inactive</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-4 py-3 text-sm text-slate-500">No users found for "{query}".</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Create flow */}
          {mode === "create" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email <span className="text-red-400">*</span></label>
                <input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)}
                  placeholder="admin@company.com" className={inputCls} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Name <span className="text-red-400">*</span></label>
                <input value={createName} onChange={e => setCreateName(e.target.value)}
                  placeholder="Jane Smith" className={inputCls} />
              </div>
              <p className="text-xs text-slate-500 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 leading-relaxed">
                An invitation email will be sent. The account is created with Super Admin privileges immediately.
              </p>
            </div>
          )}

          {/* Confirmation */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-red-500" />
            <span className="text-sm text-slate-300 leading-snug">
              I understand this grants{" "}
              <span className="text-red-400 font-semibold">unrestricted system-wide access</span>{" "}
              and I am making this change intentionally.
            </span>
          </label>

          {error && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={!canSubmit || saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors">
              {saving && <RefreshCw size={14} className="animate-spin" />}
              {saving
                ? (mode === "promote" ? "Promoting…" : "Creating…")
                : (mode === "promote" ? "Grant Super Admin" : "Create Super Admin")
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers]             = useState<AdminUserDto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [grantModal, setGrantModal]   = useState(false);
  const [revoking, setRevoking]       = useState<number | null>(null);
  const [disabling2fa, setDisabling2fa] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await adminGetUsers()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const superAdmins = users.filter(u => u.isSuperAdmin);
  const candidates  = users.filter(u => !u.isSuperAdmin && u.isActive);

  const filtered = superAdmins.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRevoke(user: AdminUserDto) {
    if (!window.confirm(
      `Remove super admin access from ${user.displayName}?\n\nThey will remain active and keep any existing client access.`
    )) return;
    setRevoking(user.id);
    try {
      await adminUpdateUser(user.id, {
        email: user.email, displayName: user.displayName,
        isActive: user.isActive, isSuperAdmin: false,
      });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isSuperAdmin: false } : u));
      toast.success(`Super admin access revoked from ${user.displayName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke.");
    } finally {
      setRevoking(null);
    }
  }

  async function handleDisable2fa(user: AdminUserDto) {
    if (!window.confirm(
      `Disable two-factor authentication for ${user.displayName}?\n\nThey will be able to log in with just their password.`
    )) return;
    setDisabling2fa(user.id);
    try {
      await adminDisableUserTotp(user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isTotpEnabled: false } : u));
      toast.success(`2FA disabled for ${user.displayName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disable 2FA.");
    } finally {
      setDisabling2fa(null);
    }
  }

  async function handleToggle(id: number) {
    try {
      const res = await adminToggleUserActive(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: res.isActive } : u));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle user.");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600/20 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0">
              <Shield size={20} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">Super Admins</h1>
              <p className="text-sm text-slate-400 mt-0.5">Unrestricted system-wide access</p>
            </div>
          </div>
          <button
            onClick={() => setGrantModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition shadow-sm shrink-0"
          >
            <Shield size={15} /> Grant Access
          </button>
        </div>

        {/* Search + count */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search super admins…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-800/60 border border-slate-700/60 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand/50 transition"
            />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">{superAdmins.length} total</span>
        </div>

        {/* Table */}
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-slate-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield size={28} className="text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">
                {search ? "No super admins match your search." : "No super admins yet."}
              </p>
              {!search && (
                <p className="text-xs text-slate-600 mt-1">Use "Grant Access" to promote a user.</p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr key={user.id}
                    className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${i % 2 === 0 ? "" : "bg-slate-800/20"}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0">
                          {user.displayName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{user.displayName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                          <CheckCircle2 size={9} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">
                          <XCircle size={9} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {user.isTotpEnabled && (
                          <button
                            onClick={() => void handleDisable2fa(user)}
                            disabled={disabling2fa === user.id}
                            title="Disable two-factor authentication"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-400 hover:bg-amber-950/30 transition disabled:opacity-50"
                          >
                            {disabling2fa === user.id
                              ? <RefreshCw size={13} className="animate-spin" />
                              : <ShieldCheck size={13} />
                            }
                          </button>
                        )}
                        <button
                          onClick={() => handleToggle(user.id)}
                          title={user.isActive ? "Deactivate" : "Activate"}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700 transition"
                        >
                          <RefreshCw size={13} />
                        </button>
                        <button
                          onClick={() => void handleRevoke(user)}
                          disabled={revoking === user.id}
                          title="Revoke super admin access"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition disabled:opacity-50"
                        >
                          {revoking === user.id
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <ShieldOff size={13} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {grantModal && (
        <GrantSuperAdminModal
          candidates={candidates}
          onClose={() => setGrantModal(false)}
          onGranted={userId => {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuperAdmin: true } : u));
            setGrantModal(false);
            toast.success("Super admin access granted");
          }}
          onCreated={user => {
            setUsers(prev => [...prev, user]);
            setGrantModal(false);
            toast.success(`Super admin account created for ${user.displayName}`);
          }}
        />
      )}
    </div>
  );
}
