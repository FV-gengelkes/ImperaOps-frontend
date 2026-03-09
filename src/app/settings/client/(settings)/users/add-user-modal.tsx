"use client";

import { useState } from "react";
import { Plus, RefreshCw, UserPlus, ArrowLeft } from "lucide-react";
import { addClientUser, inviteClientUser } from "@/lib/api";
import type { ClientUserDto } from "@/lib/types";
import { useToast } from "@/components/toast-context";
import { inputCls, ROLES } from "./users-shared";

type AddPhase = "search" | "invite";

export function AddUserCard({ clientId, onAdded }: { clientId: number; onAdded: (user: ClientUserDto) => void }) {
  const toast = useToast();
  const [phase, setPhase]         = useState<AddPhase>("search");
  const [email, setEmail]         = useState("");
  const [role, setRole]           = useState("Member");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState("");

  function reset() {
    setPhase("search");
    setEmail("");
    setRole("Member");
    setDisplayName("");
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
    if (!displayName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await inviteClientUser(clientId, email.trim(), displayName.trim(), role);
      onAdded(result.user);
      reset();
      if (!result.emailSent) {
        try { await navigator.clipboard.writeText(result.inviteUrl); } catch {}
        toast.warning("Email delivery failed — invite link copied to clipboard.");
      }
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
                {busy ? "Checking..." : "Add"}
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

            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
              An invitation email will be sent with a link to set their password.
            </p>

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
                disabled={busy || !displayName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {busy ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {busy ? "Creating..." : "Create & Add"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
