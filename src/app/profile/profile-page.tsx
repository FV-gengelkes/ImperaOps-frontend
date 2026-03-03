"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, User } from "lucide-react";
import { changePassword, updateProfile } from "@/lib/api";
import { useAuth } from "@/components/auth-context";

// ── Shared styles ─────────────────────────────────────────────────────────────

const LABEL = "block text-sm font-medium text-slate-700 mb-1.5";

function inputCls(hasError = false) {
  return `w-full rounded-lg border ${
    hasError
      ? "border-red-400 focus:ring-red-400"
      : "border-slate-300 focus:ring-indigo-500"
  } bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
  return (
    <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
      <span className="text-white text-lg font-bold tracking-wide">{initials || "?"}</span>
    </div>
  );
}

// ── Password field with show/hide toggle ──────────────────────────────────────

function PasswordInput({
  value, onChange, placeholder, autoComplete, hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  hasError?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={`${inputCls(hasError)} pr-10`}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ── Inline banners ────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
      {message}
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
      <CheckCircle2 size={15} className="shrink-0" />
      {message}
    </span>
  );
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard() {
  const { user, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail]             = useState(user?.email ?? "");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setEmail(user?.email ?? "");
  }, [user?.displayName, user?.email]);

  const isDirty =
    displayName.trim() !== (user?.displayName ?? "") ||
    email.trim() !== (user?.email ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (!displayName.trim()) { setError("Display name is required."); return; }
    if (!email.trim() || !email.includes("@")) { setError("A valid email is required."); return; }
    setSaving(true);
    try {
      const updated = await updateProfile(displayName.trim(), email.trim());
      updateUser(updated.displayName, updated.email);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <User size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Profile</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-md">
        <div>
          <label className={LABEL}>Display name</label>
          <input
            className={inputCls()}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>

        <div>
          <label className={LABEL}>Email address</label>
          <input
            type="email"
            className={inputCls()}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {success && <SuccessBanner message="Saved" />}
        </div>
      </form>
    </div>
  );
}

// ── Password card ─────────────────────────────────────────────────────────────

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const meetsLength     = next.length >= 8;
  const confirmMismatch = confirm.length > 0 && next !== confirm;
  const canSubmit       = !!current && meetsLength && !!confirm && !confirmMismatch;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (!current) { setError("Current password is required."); return; }
    if (!meetsLength) { setError("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent(""); setNext(""); setConfirm("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.message ?? "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <KeyRound size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Change Password</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-md">
        <div>
          <label className={LABEL}>Current password</label>
          <PasswordInput
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className={LABEL}>New password</label>
          <PasswordInput
            value={next}
            onChange={setNext}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
          />
          {next.length > 0 && (
            <p className={`mt-1.5 text-xs flex items-center gap-1 transition-colors ${meetsLength ? "text-emerald-600" : "text-slate-400"}`}>
              <CheckCircle2 size={12} />
              At least 8 characters
            </p>
          )}
        </div>

        <div>
          <label className={LABEL}>Confirm new password</label>
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            hasError={confirmMismatch}
          />
          {confirmMismatch && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle size={12} />
              Passwords don't match
            </p>
          )}
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
          {success && <SuccessBanner message="Password updated" />}
        </div>
      </form>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Avatar name={user?.displayName ?? ""} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user?.displayName || "My Profile"}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-5">
        <ProfileCard />
        <PasswordCard />
      </div>
    </div>
  );
}
