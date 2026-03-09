"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, Edit2, Loader2, Plus, Power, RefreshCw, Search, Shield, Users, X, XCircle,
} from "lucide-react";
import {
  adminCreateUser, adminGetUsers, adminGrantClientAccess,
  adminRevokeClientAccess, adminToggleUserActive,
  adminUpdateClientUserRole, adminUpdateUser,
} from "@/lib/api";
import { useToast } from "@/components/toast-context";
import type { AdminClientUserDto, AdminUserDto } from "@/lib/types";

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

// ── Edit user modal ────────────────────────────────────────────────────────────

function EditUserModal({
  user, clientId, onClose, onSaved,
}: {
  user: AdminClientUserDto;
  clientId: number;
  onClose: () => void;
  onSaved: (updated: Pick<AdminClientUserDto, "userId" | "displayName" | "email">) => void;
}) {
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail]             = useState(user.email);
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [apiError, setApiError]       = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!displayName.trim()) errs.displayName = "Display name is required.";
    if (!email.trim())       errs.email = "Email is required.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true); setErrors({}); setApiError("");
    try {
      await adminUpdateUser(user.userId, {
        email: email.trim(),
        displayName: displayName.trim(),
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        auditClientId: clientId,
      });
      toast.success("User updated");
      onSaved({ userId: user.userId, displayName: displayName.trim(), email: email.trim() });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Edit User</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{apiError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Name <span className="text-red-400">*</span></label>
            <input ref={firstRef} value={displayName}
              onChange={e => { setDisplayName(e.target.value); setErrors(p => ({ ...p, displayName: "" })); }}
              placeholder="Jane Smith"
              className={errors.displayName
                ? inputCls.replace("border-slate-700", "border-red-500")
                : inputCls} />
            {errors.displayName && <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email <span className="text-red-400">*</span></label>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
              placeholder="jane@company.com"
              className={errors.email
                ? inputCls.replace("border-slate-700", "border-red-500")
                : inputCls} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Invite new user modal ──────────────────────────────────────────────────────

function InviteUserModal({
  clientId, onClose, onInvited,
}: {
  clientId: number;
  onClose: () => void;
  onInvited: (user: AdminClientUserDto) => void;
}) {
  const toast = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [role, setRole]               = useState("Member");
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [apiError, setApiError]       = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!displayName.trim()) errs.displayName = "Display name is required.";
    if (!email.trim())        errs.email = "Email is required.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true); setErrors({}); setApiError("");
    try {
      const result = await adminCreateUser({
        email: email.trim(), displayName: displayName.trim(),
        isSuperAdmin: false, clientId, role, auditClientId: clientId,
      });
      if (!result.emailSent) {
        try { await navigator.clipboard.writeText(result.inviteUrl); } catch {}
        toast.warning("Email delivery failed — invite link copied to clipboard.");
      } else {
        toast.success("Invite sent");
      }
      onInvited({
        userId: result.user.id, displayName: result.user.displayName,
        email: result.user.email, role, isActive: true, isSuperAdmin: false,
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Invite User</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{apiError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Name <span className="text-red-400">*</span></label>
            <input ref={firstRef} value={displayName}
              onChange={e => { setDisplayName(e.target.value); setErrors(p => ({ ...p, displayName: "" })); }}
              placeholder="Jane Smith"
              className={errors.displayName ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
            {errors.displayName && <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email <span className="text-red-400">*</span></label>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
              placeholder="jane@company.com"
              className={errors.email ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className={inputCls + " cursor-pointer"}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            An invitation email will be sent with a link to set their password.
          </p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition">
              {saving ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add existing user modal ────────────────────────────────────────────────────

function AddExistingModal({
  clientId, currentUserIds, onClose, onAdded,
}: {
  clientId: number;
  currentUserIds: Set<number>;
  onClose: () => void;
  onAdded: (user: AdminClientUserDto) => void;
}) {
  const toast = useToast();
  const [allUsers, setAllUsers]       = useState<AdminUserDto[]>([]);
  const [query, setQuery]             = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [role, setRole]               = useState("Member");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminGetUsers()
      .then(u => setAllUsers(u.filter(u => !currentUserIds.has(u.id) && !u.isSuperAdmin)))
      .catch(() => {});
    searchRef.current?.focus();
  }, [currentUserIds]);

  const results = query.trim()
    ? allUsers.filter(u =>
        u.displayName.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  async function handleAdd() {
    if (!selectedUser) return;
    setSaving(true); setError("");
    try {
      await adminGrantClientAccess(selectedUser.id, clientId, role);
      toast.success(`${selectedUser.displayName} added`);
      onAdded({
        userId: selectedUser.id, displayName: selectedUser.displayName,
        email: selectedUser.email, role, isActive: selectedUser.isActive, isSuperAdmin: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Add Existing User</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{error}</div>
          )}

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Search by name or email</label>
            {selectedUser ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-brand/10 border border-brand/30">
                <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-xs shrink-0">
                  {selectedUser.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{selectedUser.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{selectedUser.email}</p>
                </div>
                <button onClick={() => { setSelectedUser(null); setQuery(""); setTimeout(() => searchRef.current?.focus(), 0); }}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 transition">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Type a name or email…"
                    className={inputCls.replace("w-full", "") + " w-full pl-9"} />
                </div>
                {query.length >= 1 && (
                  <div className="mt-1.5 rounded-lg border border-slate-700 bg-slate-800/80 overflow-hidden max-h-48 overflow-y-auto">
                    {results.length > 0 ? results.map(u => (
                      <button key={u.id} onClick={() => { setSelectedUser(u); setQuery(""); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                          {u.displayName[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 truncate">{u.displayName}</p>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                      </button>
                    )) : (
                      <p className="px-4 py-3 text-sm text-slate-500">No users found for &quot;{query}&quot;.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className={inputCls + " cursor-pointer"}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={!selectedUser || saving}
              className="flex-1 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition">
              {saving ? "Adding…" : "Add to Client"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users Section ──────────────────────────────────────────────────────────────

type AddUserMode = "invite" | "existing" | null;

export function ClientUsersSection({
  clientId,
  users,
  usersLoading,
  onUsersChange,
  onUserCountChange,
}: {
  clientId: number;
  users: AdminClientUserDto[];
  usersLoading: boolean;
  onUsersChange: (users: AdminClientUserDto[]) => void;
  onUserCountChange: (delta: number) => void;
}) {
  const toast = useToast();
  const [addUserMode, setAddUserMode] = useState<AddUserMode>(null);
  const [editingUser, setEditingUser] = useState<AdminClientUserDto | null>(null);
  const [revoking, setRevoking]       = useState<number | null>(null);

  const currentUserIds = new Set(users.map(u => u.userId));

  async function handleRoleChange(userId: number, newRole: string) {
    const prev = users.find(u => u.userId === userId);
    if (!prev || prev.role === newRole) return;
    onUsersChange(users.map(u => u.userId === userId ? { ...u, role: newRole } : u));
    try {
      await adminUpdateClientUserRole(clientId, userId, newRole);
    } catch (err) {
      onUsersChange(users.map(u => u.userId === userId ? { ...u, role: prev.role } : u));
      toast.error(err instanceof Error ? err.message : "Failed to update role.");
    }
  }

  async function handleToggleUser(userId: number) {
    try {
      const res = await adminToggleUserActive(userId, clientId);
      onUsersChange(users.map(u => u.userId === userId ? { ...u, isActive: res.isActive } : u));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle user.");
    }
  }

  async function handleRevokeUser(userId: number) {
    setRevoking(userId);
    try {
      await adminRevokeClientAccess(userId, clientId);
      onUsersChange(users.filter(u => u.userId !== userId));
      onUserCountChange(-1);
      toast.success("Access revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke access.");
    } finally {
      setRevoking(null);
    }
  }

  function handleUserAdded(user: AdminClientUserDto) {
    onUsersChange([...users, user]);
    onUserCountChange(1);
    setAddUserMode(null);
  }

  return (
    <>
      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <h2 className="text-sm font-semibold text-white">Users</h2>
            {!usersLoading && (
              <p className="text-xs text-slate-500 mt-0.5">
                {users.length} {users.length === 1 ? "member" : "members"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddUserMode("existing")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-medium transition"
            >
              <Users size={13} /> Add Existing
            </button>
            <button
              onClick={() => setAddUserMode("invite")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-brand-text text-xs font-semibold transition"
            >
              <Plus size={13} /> Invite User
            </button>
          </div>
        </div>

        {usersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-slate-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Users size={24} className="text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">No users in this client yet.</p>
            <p className="text-xs text-slate-600 mt-1">Use &quot;Invite User&quot; to add the first member.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-32">Role</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-24">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.userId}
                  className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${i % 2 === 0 ? "" : "bg-slate-800/10"}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                        {user.displayName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                          {user.displayName}
                          {user.isSuperAdmin && (
                            <Shield size={10} className="text-amber-500 shrink-0" />
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user.userId, e.target.value)}
                      className="bg-slate-700/60 border border-slate-600/60 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand/50 cursor-pointer"
                    >
                      <option value="Member">Member</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingUser(user)}
                        title="Edit user"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700 transition"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleToggleUser(user.userId)}
                        title={user.isActive ? "Deactivate user" : "Activate user"}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700 transition"
                      >
                        <Power size={13} />
                      </button>
                      <button
                        onClick={() => handleRevokeUser(user.userId)}
                        disabled={revoking === user.userId}
                        title="Revoke access"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition disabled:opacity-50"
                      >
                        {revoking === user.userId
                          ? <RefreshCw size={13} className="animate-spin" />
                          : <X size={13} />
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

      {/* User modals */}
      {addUserMode === "invite" && (
        <InviteUserModal
          clientId={clientId}
          onClose={() => setAddUserMode(null)}
          onInvited={handleUserAdded}
        />
      )}
      {addUserMode === "existing" && (
        <AddExistingModal
          clientId={clientId}
          currentUserIds={currentUserIds}
          onClose={() => setAddUserMode(null)}
          onAdded={handleUserAdded}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          clientId={clientId}
          onClose={() => setEditingUser(null)}
          onSaved={({ userId, displayName, email }) => {
            onUsersChange(users.map(u =>
              u.userId === userId ? { ...u, displayName, email } : u
            ));
            setEditingUser(null);
          }}
        />
      )}
    </>
  );
}
