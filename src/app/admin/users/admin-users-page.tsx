"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2, Edit2, KeyRound, Layers, Power, Plus, RefreshCw,
  Search, Shield, Trash2, User, Users, X, XCircle,
} from "lucide-react";
import {
  adminChangePassword, adminCreateUser, adminGetClients, adminGetUserClients,
  adminGetUsers, adminGrantClientAccess, adminRevokeClientAccess,
  adminToggleUserActive, adminUpdateUser,
} from "@/lib/api";
import type { AdminClientDto, AdminUserDto, UserClientAccessDto } from "@/lib/types";

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-indigo-600" : "bg-slate-700"}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/50">
      <CheckCircle2 size={10} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
      <XCircle size={10} /> Inactive
    </span>
  );
}

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

// ── Create / Edit profile modal ───────────────────────────────────────────────

type ProfileModalState = { mode: "create" } | { mode: "edit"; user: AdminUserDto };

function ProfileModal({
  state, onClose, onSaved,
}: {
  state: ProfileModalState;
  onClose: () => void;
  onSaved: (user: AdminUserDto) => void;
}) {
  const isEdit = state.mode === "edit";
  const [displayName, setDisplayName] = useState(isEdit ? state.user.displayName : "");
  const [email, setEmail]             = useState(isEdit ? state.user.email : "");
  const [password, setPassword]       = useState("");
  const [isActive, setIsActive]       = useState(isEdit ? state.user.isActive : true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(isEdit ? state.user.isSuperAdmin : false);
  const [changePass, setChangePass]   = useState(!isEdit);
  const [saving, setSaving]           = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError]       = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!displayName.trim()) errs.displayName = "Display name is required.";
    if (!email.trim())        errs.email = "Email is required.";
    if (!isEdit && !password) errs.password = "Password is required.";
    if (changePass && password && password.length < 8) errs.password = "Must be at least 8 characters.";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setSaving(true); setFieldErrors({}); setApiError("");
    try {
      if (isEdit) {
        await adminUpdateUser(state.user.id, { email, displayName, isActive, isSuperAdmin });
        if (changePass && password) await adminChangePassword(state.user.id, password);
        onSaved({ ...state.user, email, displayName, isActive, isSuperAdmin });
      } else {
        const created = await adminCreateUser({ email, displayName, password, isSuperAdmin });
        onSaved(created);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">{isEdit ? "Edit User" : "New User"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{apiError}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input ref={firstRef} value={displayName}
              onChange={e => { setDisplayName(e.target.value); setFieldErrors(p => ({ ...p, displayName: "" })); }}
              placeholder="Jane Smith"
              className={fieldErrors.displayName ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
            {fieldErrors.displayName && <p className="mt-1 text-xs text-red-400">{fieldErrors.displayName}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: "" })); }}
              placeholder="jane@company.com"
              className={fieldErrors.email ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>}
          </div>

          {/* Password section */}
          {isEdit ? (
            <div className="rounded-lg bg-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <KeyRound size={14} className="text-slate-500" />
                  Change Password
                </div>
                <Toggle value={changePass} onChange={setChangePass} />
              </div>
              {changePass && (
                <>
                  <input type="password" value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: "" })); }}
                    placeholder="New password (min 8 chars)"
                    className={fieldErrors.password ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
                  {fieldErrors.password && <p className="text-xs text-red-400">{fieldErrors.password}</p>}
                </>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <input type="password" value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: "" })); }}
                placeholder="Min 8 characters"
                className={fieldErrors.password ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
              {fieldErrors.password && <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>}
            </div>
          )}

          {/* Flags */}
          <div className="rounded-lg bg-slate-800 divide-y divide-slate-700/60">
            {isEdit && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-300">Active</p>
                  <p className="text-xs text-slate-500">Inactive users cannot log in.</p>
                </div>
                <Toggle value={isActive} onChange={setIsActive} />
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                  <Shield size={13} className="text-amber-500" /> Super Admin
                </p>
                <p className="text-xs text-slate-500">Full access to all clients and admin settings.</p>
              </div>
              <Toggle value={isSuperAdmin} onChange={setIsSuperAdmin} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold transition">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Client access modal ───────────────────────────────────────────────────────

function ClientAccessModal({
  user, onClose,
}: {
  user: AdminUserDto;
  onClose: () => void;
}) {
  const [accesses, setAccesses]   = useState<UserClientAccessDto[]>([]);
  const [allClients, setAllClients] = useState<AdminClientDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [addClientId, setAddClientId] = useState("");
  const [addRole, setAddRole]     = useState("Member");
  const [granting, setGranting]   = useState(false);
  const [revoking, setRevoking]   = useState<string | null>(null);
  const [error, setError]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([adminGetUserClients(user.id), adminGetClients()]);
      setAccesses(a);
      setAllClients(c);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const assignedIds = new Set(accesses.map(a => a.clientId));
  const available   = allClients.filter(c => c.isActive && !assignedIds.has(c.id));

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!addClientId) { setError("Select a client."); return; }
    setGranting(true); setError("");
    try {
      await adminGrantClientAccess(user.id, addClientId, addRole);
      setAddClientId(""); setAddRole("Member");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant access.");
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(clientId: string) {
    setRevoking(clientId);
    try {
      await adminRevokeClientAccess(user.id, clientId);
      setAccesses(prev => prev.filter(a => a.clientId !== clientId));
    } finally {
      setRevoking(null);
    }
  }

  const selectCls = inputCls + " cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Client Access</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user.displayName} · {user.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current access list */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Assigned Clients ({accesses.length})
            </h3>

            {loading ? (
              <div className="py-6 text-center text-slate-500 text-sm">Loading…</div>
            ) : accesses.length === 0 ? (
              <div className="py-6 text-center text-slate-600 text-sm">No client access assigned.</div>
            ) : (
              <ul className="space-y-2">
                {accesses.map(a => (
                  <li key={a.clientId}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="w-7 h-7 rounded-md bg-indigo-900/60 border border-indigo-800/40 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                      {a.clientName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{a.clientName}</p>
                      {!a.clientIsActive && (
                        <p className="text-xs text-amber-500">Client is inactive</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${
                      a.role === "Admin"
                        ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                        : "bg-slate-700 text-slate-300"
                    }`}>
                      {a.role}
                    </span>
                    <button
                      onClick={() => handleRevoke(a.clientId)}
                      disabled={revoking === a.clientId}
                      title="Revoke access"
                      className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition disabled:opacity-50 shrink-0"
                    >
                      {revoking === a.clientId
                        ? <RefreshCw size={13} className="animate-spin" />
                        : <Trash2 size={13} />
                      }
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Grant access form */}
          <div className="border-t border-slate-800 pt-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Grant Access
            </h3>

            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300">{error}</div>
            )}

            <form onSubmit={handleGrant} className="space-y-3">
              <select value={addClientId} onChange={e => setAddClientId(e.target.value)}
                className={selectCls} disabled={available.length === 0}>
                <option value="">
                  {available.length === 0 ? "— All active clients assigned —" : "— Select a client —"}
                </option>
                {available.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.parentClientName ? ` (${c.parentClientName})` : ""}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <select value={addRole} onChange={e => setAddRole(e.target.value)}
                  className={selectCls + " flex-1"}>
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
                <button type="submit" disabled={granting || !addClientId}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition shrink-0">
                  {granting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  {granting ? "Granting…" : "Grant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const [users, setUsers]       = useState<AdminUserDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [profileModal, setProfileModal] = useState<ProfileModalState | null>(null);
  const [accessModal, setAccessModal]   = useState<AdminUserDto | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await adminGetUsers()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(id: string) {
    setToggling(id);
    try {
      const res = await adminToggleUserActive(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: res.isActive } : u));
    } finally {
      setToggling(null);
    }
  }

  function handleProfileSaved(saved: AdminUserDto) {
    setUsers(prev => {
      const exists = prev.find(u => u.id === saved.id);
      return exists
        ? prev.map(u => u.id === saved.id ? { ...saved, clientCount: u.clientCount } : u)
        : [...prev, saved];
    });
    setProfileModal(null);
  }

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive  = users.filter(u => u.isActive).length;
  const superAdmins  = users.filter(u => u.isSuperAdmin).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Super Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create and manage users and their client access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} title="Refresh"
            className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setProfileModal({ mode: "create" })}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition shadow-sm">
            <Plus size={16} /> New User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Users",  value: users.length,  icon: Users,         color: "text-slate-700" },
          { label: "Active",       value: totalActive,   icon: CheckCircle2,  color: "text-emerald-600" },
          { label: "Inactive",     value: users.length - totalActive, icon: XCircle, color: "text-slate-400" },
          { label: "Super Admins", value: superAdmins,   icon: Shield,        color: "text-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={color} />
              <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            {search ? "No users match your search." : "No users yet."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Clients</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(user => {
                const isToggling = toggling === user.id;
                return (
                  <tr key={user.id} className="group hover:bg-slate-50/60 transition-colors">
                    {/* User info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {user.displayName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{user.displayName}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Client count */}
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <button
                        onClick={() => setAccessModal(user)}
                        className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition group/btn"
                        title="Manage client access"
                      >
                        <Layers size={14} className="text-slate-400 group-hover/btn:text-indigo-500" />
                        <span className="font-medium">{user.clientCount}</span>
                        <span className="text-xs text-slate-400 group-hover/btn:text-indigo-400">
                          {user.clientCount === 1 ? "client" : "clients"}
                        </span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4"><StatusBadge active={user.isActive} /></td>

                    {/* Role */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      {user.isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/40">
                          <Shield size={10} /> Super Admin
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Member</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Manage access */}
                        <button onClick={() => setAccessModal(user)} title="Manage client access"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                          <User size={15} />
                        </button>

                        {/* Edit profile */}
                        <button onClick={() => setProfileModal({ mode: "edit", user })} title="Edit user"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                          <Edit2 size={15} />
                        </button>

                        {/* Toggle active */}
                        <button onClick={() => handleToggle(user.id)} disabled={isToggling}
                          title={user.isActive ? "Deactivate" : "Activate"}
                          className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                            user.isActive
                              ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}>
                          {isToggling
                            ? <RefreshCw size={15} className="animate-spin" />
                            : <Power size={15} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {profileModal && (
        <ProfileModal state={profileModal} onClose={() => setProfileModal(null)} onSaved={handleProfileSaved} />
      )}
      {accessModal && (
        <ClientAccessModal
          user={accessModal}
          onClose={() => { setAccessModal(null); load(); }}
        />
      )}
    </div>
  );
}
