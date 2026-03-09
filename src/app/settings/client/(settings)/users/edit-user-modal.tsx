"use client";

import { useState } from "react";
import { KeyRound, RefreshCw, X } from "lucide-react";
import { adminChangePassword, adminUpdateUser, updateClientUser } from "@/lib/api";
import type { ClientUserDto } from "@/lib/types";
import { inputCls, darkInputCls, Toggle } from "./users-shared";

export function EditUserModal({
  user,
  clientId,
  viewerIsSuperAdmin,
  onSaved,
  onClose,
}: {
  user: ClientUserDto;
  clientId: number;
  viewerIsSuperAdmin: boolean;
  onSaved: (updated: Partial<ClientUserDto> & { id: number }) => void;
  onClose: () => void;
}) {
  const [displayName,    setDisplayName]    = useState(user.displayName);
  const [email,          setEmail]          = useState(user.email);
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword,    setNewPassword]    = useState("");
  const [isActive,       setIsActive]       = useState(user.isActive);
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
        await adminUpdateUser(user.id, {
          email: email.trim(),
          displayName: displayName.trim(),
          isActive,
          isSuperAdmin: user.isSuperAdmin, // preserve — super admin status is never changed from client settings
        });
        if (changePassword && newPassword) {
          await adminChangePassword(user.id, newPassword);
        }
        onSaved({ id: user.id, displayName: displayName.trim(), email: email.trim().toLowerCase(), isActive, isSuperAdmin: user.isSuperAdmin });
      } else {
        await updateClientUser(clientId, user.id, displayName.trim(), email.trim());
        onSaved({ id: user.id, displayName: displayName.trim(), email: email.trim().toLowerCase() });
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

            {/* Active */}
            <div className="rounded-lg bg-slate-800">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Active</p>
                  <p className="text-xs text-slate-400">Inactive users cannot log in.</p>
                </div>
                <Toggle checked={isActive} onChange={setIsActive} />
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
                {busy ? "Saving..." : "Save Changes"}
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
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
