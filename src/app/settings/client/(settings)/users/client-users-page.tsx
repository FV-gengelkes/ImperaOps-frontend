"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Shield, ShieldCheck, UserPlus, ArrowLeft, Pencil, X, KeyRound } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { addClientUser, adminChangePassword, adminUpdateUser, getFamilyUsers, getClientUsers, inviteClientUser, removeClientUser, updateClientUser, updateClientUserRole } from "@/lib/api";
import type { ClientUserDto } from "@/lib/types";
import { useAuth } from "@/components/auth-context";

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
  "focus:border-transparent transition";

const ROLES = ["Member", "Admin"] as const;

const darkInputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-indigo-600" : "bg-slate-600"
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-5" : "translate-x-0"
      }`} />
    </button>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <CheckCircle2 size={12} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <XCircle size={12} /> Inactive
    </span>
  );
}

// ── Add / Invite card ─────────────────────────────────────────────────────────

type AddPhase = "search" | "invite";

function AddUserCard({ clientId, onAdded }: { clientId: string; onAdded: (user: ClientUserDto) => void }) {
  const [phase, setPhase]         = useState<AddPhase>("search");
  const [email, setEmail]         = useState("");
  const [role, setRole]           = useState("Member");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword]   = useState("");
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState("");

  function reset() {
    setPhase("search");
    setEmail("");
    setRole("Member");
    setDisplayName("");
    setPassword("");
    setError("");
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    try {
      const user = await addClientUser(clientId, email.trim(), role);
      onAdded(user);
      reset();
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "";
      // 404 means no account found — switch to invite phase
      if (msg.startsWith("404")) {
        setPhase("invite");
      } else {
        setError(msg || "Failed to add user.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !password) return;
    setBusy(true);
    setError("");
    try {
      const user = await inviteClientUser(clientId, email.trim(), displayName.trim(), password, role);
      onAdded(user);
      reset();
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "";
      // Account was created between our 404 check and now — add the existing user instead
      if (msg.startsWith("409")) {
        try {
          const user = await addClientUser(clientId, email.trim(), role);
          onAdded(user);
          reset();
        } catch (addErr: unknown) {
          setError((addErr as Error).message ?? "Failed to add user.");
        }
      } else {
        setError(msg || "Failed to create account.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {phase === "search" ? (
        <>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Add User</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter an email address. If no account exists you'll be prompted to create one.
            </p>
          </div>
          <form onSubmit={handleSearch} className="px-5 py-4">
            {error && (
              <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2">
              <input
                className={inputCls + " flex-1"}
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
              <select
                className={inputCls}
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {busy ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                {busy ? "Checking…" : "Add"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          {/* Invite phase */}
          <div className="px-5 py-4 border-b border-slate-100 bg-amber-50/60">
            <div className="flex items-center gap-2 mb-0.5">
              <UserPlus size={15} className="text-amber-600 shrink-0" />
              <h2 className="font-semibold text-slate-800">No account found</h2>
            </div>
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{email}</span> doesn't have an account yet.
              Fill in their details to create one and grant access.
            </p>
          </div>
          <form onSubmit={handleInvite} className="px-5 py-4 space-y-3">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Email locked */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Email</label>
              <input className={inputCls + " w-full bg-slate-50 text-slate-500"} value={email} readOnly />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  className={inputCls + " w-full"}
                  placeholder="Jane Smith"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Temporary Password <span className="text-red-400">*</span>
                </label>
                <input
                  className={inputCls + " w-full"}
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Role locked — show as read-only badge */}
            <p className="text-xs text-slate-500">
              Role: <span className="font-medium text-slate-700">{role}</span>
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="submit"
                disabled={busy || !displayName.trim() || password.length < 8}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {busy ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {busy ? "Creating…" : "Create & Add"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

// ── Family users card (super admin only) ──────────────────────────────────────

function FamilyUsersCard({ clientId, onAdded }: { clientId: string; onAdded: (user: ClientUserDto) => void }) {
  const [users,   setUsers]   = useState<ClientUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("");
  const [adding,  setAdding]  = useState<string | null>(null);
  const [roles,   setRoles]   = useState<Record<string, string>>({});
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    getFamilyUsers(clientId)
      .then(setUsers)
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
          <p className="text-sm text-slate-400">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-400">No eligible users from related clients.</p>
        ) : (
          <>
            <input
              className={inputCls + " w-full mb-3"}
              placeholder="Filter by name or email…"
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

// ── Edit user modal ───────────────────────────────────────────────────────────

function EditUserModal({
  user,
  clientId,
  viewerIsSuperAdmin,
  onSaved,
  onClose,
}: {
  user: ClientUserDto;
  clientId: string;
  viewerIsSuperAdmin: boolean;
  onSaved: (updated: Partial<ClientUserDto> & { id: string }) => void;
  onClose: () => void;
}) {
  const [displayName,    setDisplayName]    = useState(user.displayName);
  const [email,          setEmail]          = useState(user.email);
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword,    setNewPassword]    = useState("");
  const [isActive,       setIsActive]       = useState(user.isActive);
  const [isSuperAdmin,   setIsSuperAdmin]   = useState(user.isSuperAdmin);
  const [busy,           setBusy]           = useState(false);
  const [error,          setError]          = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) return;
    if (changePassword && newPassword.length < 8) return;
    setBusy(true);
    setError("");
    try {
      if (viewerIsSuperAdmin) {
        await adminUpdateUser(String(user.id), {
          email: email.trim(),
          displayName: displayName.trim(),
          isActive,
          isSuperAdmin,
        });
        if (changePassword && newPassword) {
          await adminChangePassword(String(user.id), newPassword);
        }
        onSaved({ id: String(user.id), displayName: displayName.trim(), email: email.trim().toLowerCase(), isActive, isSuperAdmin });
      } else {
        await updateClientUser(clientId, String(user.id), displayName.trim(), email.trim());
        onSaved({ id: String(user.id), displayName: displayName.trim(), email: email.trim().toLowerCase() });
      }
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to update user.");
    } finally {
      setBusy(false);
    }
  }

  // ── Super admin dark modal ─────────────────────────────────────────────────
  if (viewerIsSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 shadow-2xl border border-slate-700/50">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/60">
            <h2 className="font-semibold text-white text-lg">Edit User</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Display Name <span className="text-red-400">*</span>
              </label>
              <input className={darkInputCls} value={displayName} onChange={e => setDisplayName(e.target.value)} required autoFocus />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input className={darkInputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            {/* Change password */}
            <div className="rounded-lg bg-slate-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound size={14} className="text-slate-400" />
                  <span className="text-sm font-medium text-white">Change Password</span>
                </div>
                <Toggle checked={changePassword} onChange={v => { setChangePassword(v); if (!v) setNewPassword(""); }} />
              </div>
              {changePassword && (
                <input
                  className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  type="password"
                  placeholder="New password (min 8 characters)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  minLength={8}
                  autoFocus
                />
              )}
            </div>

            {/* Active + Super Admin */}
            <div className="rounded-lg bg-slate-800 divide-y divide-slate-700/60">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Active</p>
                  <p className="text-xs text-slate-400">Inactive users cannot log in.</p>
                </div>
                <Toggle checked={isActive} onChange={setIsActive} />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">Super Admin</p>
                    <p className="text-xs text-slate-400">Full access to all clients and admin settings.</p>
                  </div>
                </div>
                <Toggle checked={isSuperAdmin} onChange={setIsSuperAdmin} />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !displayName.trim() || !email.trim() || (changePassword && newPassword.length < 8)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {busy && <RefreshCw size={14} className="animate-spin" />}
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Regular light modal ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Edit User</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input className={inputCls + " w-full"} value={displayName} onChange={e => setDisplayName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input className={inputCls + " w-full"} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !displayName.trim() || !email.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : null}
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClientUsersPage() {
  const { clientId } = useClientId();
  const { isSuperAdmin } = useAuth();
  const [users, setUsers]       = useState<ClientUserDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [removing, setRemoving]         = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [editingUser, setEditingUser]   = useState<ClientUserDto | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");
    try {
      setUsers(await getClientUsers(clientId));
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  function handleAdded(user: ClientUserDto) {
    setUsers(prev =>
      [...prev, user].sort((a, b) => a.displayName.localeCompare(b.displayName))
    );
  }

  async function handleRoleChange(userId: string, role: string) {
    if (!clientId) return;
    setUpdatingRole(userId);
    try {
      await updateClientUserRole(clientId, userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch {
      await load();
    } finally {
      setUpdatingRole(null);
    }
  }

  function handleUserSaved(updated: Partial<ClientUserDto> & { id: string }) {
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
    setEditingUser(null);
  }

  async function handleRemove(user: ClientUserDto) {
    if (!clientId) return;
    if (!confirm(`Remove ${user.displayName}'s access to this client?`)) return;
    setRemoving(user.id);
    try {
      await removeClientUser(clientId, user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to remove user.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
      {editingUser && (
        <EditUserModal
          user={editingUser}
          clientId={clientId!}
          viewerIsSuperAdmin={isSuperAdmin}
          onSaved={handleUserSaved}
          onClose={() => setEditingUser(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
          <Users className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">User Administration</h1>
      </div>
      <p className="text-slate-500 mb-8">
        Manage who has access to this client and their roles.
      </p>

      {!clientId ? (
        <p className="text-sm text-slate-400">Set a client ID above to manage users.</p>
      ) : (
        <div className="space-y-6">

          <AddUserCard clientId={clientId} onAdded={handleAdded} />

          {isSuperAdmin && (
            <FamilyUsersCard clientId={clientId} onAdded={handleAdded} />
          )}

          {/* User list */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Users with Access
                {!loading && (
                  <span className="ml-2 text-sm font-normal text-slate-400">({users.length})</span>
                )}
              </h2>
              <button
                onClick={() => void load()}
                title="Refresh"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {error && (
              <p className="px-5 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</p>
            )}

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
            ) : users.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                No users have access to this client yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {users.map(user => (
                  <li key={user.id} className="flex items-center gap-4 px-5 py-3.5">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {user.displayName[0]?.toUpperCase() ?? "?"}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{user.displayName}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    {/* Active status */}
                    <ActiveBadge active={user.isActive} />

                    {/* Role selector */}
                    <div className="shrink-0">
                      {updatingRole === user.id ? (
                        <RefreshCw size={14} className="animate-spin text-slate-400" />
                      ) : (
                        <select
                          className="text-xs rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                          value={user.role}
                          onChange={e => void handleRoleChange(user.id, e.target.value)}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors shrink-0"
                      title="Edit user"
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => void handleRemove(user)}
                      disabled={removing === user.id}
                      className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors shrink-0"
                      title="Remove access"
                    >
                      {removing === user.id
                        ? <RefreshCw size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
