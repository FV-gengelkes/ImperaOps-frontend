"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Bell, CheckCircle2, Eye, EyeOff, KeyRound, Laptop, Loader2, Monitor, QrCode, ShieldCheck, ShieldOff, Smartphone, User } from "lucide-react";
import { changePassword, disableTotp, getNotificationPreferences, getSessions, getTotpStatus, revokeOtherSessions, revokeSession, saveNotificationPreferences, setupTotp, updateProfile, verifyTotpSetup } from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import type { NotificationPreferenceDto, SessionDto } from "@/lib/types";

// ── Shared styles ─────────────────────────────────────────────────────────────

const LABEL = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

function inputCls(hasError = false) {
  return `w-full rounded-lg border ${
    hasError
      ? "border-red-400 focus:ring-red-400"
      : "border-slate-300 dark:border-slate-line focus:ring-brand"
  } bg-white dark:bg-graphite px-3 py-2 text-sm text-slate-900 dark:text-steel-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition`;
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
    <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center shrink-0">
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
    <div className="flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400">
      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
      {message}
    </div>
  );
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail]             = useState(user?.email ?? "");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setEmail(user?.email ?? "");
  }, [user?.displayName, user?.email]);

  const isDirty =
    displayName.trim() !== (user?.displayName ?? "") ||
    email.trim() !== (user?.email ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!displayName.trim()) { setError("Display name is required."); return; }
    if (!email.trim() || !email.includes("@")) { setError("A valid email is required."); return; }
    setSaving(true);
    try {
      const updated = await updateProfile(displayName.trim(), email.trim());
      updateUser(updated.displayName, updated.email);
      toast.success("Profile updated");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <User size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Profile</h2>
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
            className="px-4 py-2 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Password card ─────────────────────────────────────────────────────────────

function PasswordCard() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const meetsLength     = next.length >= 8;
  const confirmMismatch = confirm.length > 0 && next !== confirm;
  const canSubmit       = !!current && meetsLength && !!confirm && !confirmMismatch;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!current) { setError("Current password is required."); return; }
    if (!meetsLength) { setError("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent(""); setNext(""); setConfirm("");
      toast.success("Password changed");
    } catch (e: any) {
      setError(e?.message ?? "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <KeyRound size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Change Password</h2>
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
            className="px-4 py-2 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Notification Preferences card ─────────────────────────────────────────────

const NOTIF_LABELS: Record<string, string> = {
  event_assigned:   "Event assigned to me",
  task_assigned:    "Task assigned to me",
  comment_added:    "Comment on my event",
  status_changed:   "Status changed on my event",
  task_due_reminder: "Task due-date reminders",
};

const KNOWN_TYPES = ["event_assigned", "task_assigned", "comment_added", "status_changed", "task_due_reminder"] as const;

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${on ? "bg-brand" : "bg-slate-200"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

function NotificationPreferencesCard() {
  const toast = useToast();
  const [prefs,   setPrefs]   = useState<NotificationPreferenceDto[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPrefs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function setPref(type: string, field: "emailEnabled" | "inAppEnabled", val: boolean) {
    setPrefs(prev => prev.map(p => p.notificationType === type ? { ...p, [field]: val } : p));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveNotificationPreferences(prefs);
      toast.success("Preferences saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Bell size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notification Preferences</h2>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_60px_60px] gap-4 px-2 pb-2 border-b border-slate-100 dark:border-slate-line/40">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Notification</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">Email</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">In-App</span>
          </div>

          {KNOWN_TYPES.map(type => {
            const pref = prefs.find(p => p.notificationType === type);
            const emailOn  = pref?.emailEnabled  ?? true;
            const inAppOn  = pref?.inAppEnabled   ?? true;
            return (
              <div key={type} className="grid grid-cols-[1fr_60px_60px] gap-4 items-center px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-midnight transition">
                <span className="text-sm text-slate-700 dark:text-slate-300">{NOTIF_LABELS[type]}</span>
                <div className="flex justify-center">
                  <Toggle on={emailOn} onChange={v => setPref(type, "emailEnabled", v)} />
                </div>
                <div className="flex justify-center">
                  <Toggle on={inAppOn} onChange={v => setPref(type, "inAppEnabled", v)} />
                </div>
              </div>
            );
          })}

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sessions card ─────────────────────────────────────────────────────────────

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
  // Extract a short human-readable label from the raw UA string
  const match = ua.match(/\(([^)]+)\)/);
  const platform = match?.[1]?.split(";")[0]?.trim() ?? "";
  const browser =
    ua.includes("Edg/")     ? "Edge" :
    ua.includes("Chrome/")  ? "Chrome" :
    ua.includes("Firefox/") ? "Firefox" :
    ua.includes("Safari/")  ? "Safari" : "Browser";
  return platform ? `${browser} · ${platform}` : browser;
}

function SessionsCard() {
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
          <Loader2 size={14} className="animate-spin" /> Loading…
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
                {revoking === "others" ? "Revoking…" : `Sign out all other sessions (${otherCount})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Two-Factor Authentication card ────────────────────────────────────────────

function TwoFactorCard() {
  const toast = useToast();

  const [loading,      setLoading]      = useState(true);
  const [isEnabled,    setIsEnabled]    = useState(false);
  const [setupData,    setSetupData]    = useState<{ secret: string; qrCodeUri: string } | null>(null);
  const [activateCode, setActivateCode] = useState("");
  const [activating,   setActivating]   = useState(false);
  const [activateErr,  setActivateErr]  = useState("");
  const [showDisable,  setShowDisable]  = useState(false);
  const [disablePass,  setDisablePass]  = useState("");
  const [disabling,    setDisabling]    = useState(false);
  const [disableErr,   setDisableErr]   = useState("");
  const [startingSetup, setStartingSetup] = useState(false);

  useEffect(() => {
    getTotpStatus()
      .then(r => setIsEnabled(r.isTotpEnabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleStartSetup() {
    setStartingSetup(true);
    setSetupData(null);
    setActivateCode("");
    setActivateErr("");
    try {
      const data = await setupTotp();
      setSetupData(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start setup.");
    } finally {
      setStartingSetup(false);
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setActivateErr("");
    setActivating(true);
    try {
      await verifyTotpSetup(activateCode);
      setIsEnabled(true);
      setSetupData(null);
      setActivateCode("");
      toast.success("Two-factor authentication enabled");
    } catch (e: any) {
      setActivateErr(e?.message?.includes("Invalid") ? "Invalid code. Please try again." : (e?.message ?? "Verification failed."));
    } finally {
      setActivating(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setDisableErr("");
    setDisabling(true);
    try {
      await disableTotp(disablePass);
      setIsEnabled(false);
      setShowDisable(false);
      setDisablePass("");
      toast.success("Two-factor authentication disabled");
    } catch (e: any) {
      setDisableErr(e?.message?.includes("incorrect") ? "Password is incorrect." : (e?.message ?? "Failed to disable 2FA."));
    } finally {
      setDisabling(false);
    }
  }


  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Two-Factor Authentication</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : isEnabled ? (
        /* ── Enabled state ── */
        <div className="max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50">
              <CheckCircle2 size={11} /> Enabled
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">Authenticator app is protecting your account.</p>
          </div>
          {!showDisable ? (
            <button
              onClick={() => { setShowDisable(true); setDisableErr(""); setDisablePass(""); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-red-300 dark:border-red-700/60 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <ShieldOff size={14} /> Disable 2FA
            </button>
          ) : (
            <form onSubmit={handleDisable} className="space-y-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Confirm your password to disable 2FA</p>
              <PasswordInput
                value={disablePass}
                onChange={setDisablePass}
                placeholder="Current password"
                autoComplete="current-password"
              />
              {disableErr && <ErrorBanner message={disableErr} />}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={disabling || !disablePass}
                  className="px-4 py-1.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {disabling ? "Disabling…" : "Disable 2FA"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDisable(false); setDisableErr(""); }}
                  className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* ── Disabled state ── */
        <div className="max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
              Not enabled
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">Add extra security to your account.</p>
          </div>

          {!setupData ? (
            <button
              onClick={handleStartSetup}
              disabled={startingSetup}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <QrCode size={14} />
              {startingSetup ? "Loading…" : "Set up authenticator app"}
            </button>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-midnight border border-slate-200 dark:border-slate-line">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="flex gap-4 items-start">
                  {/* QR code */}
                  <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white p-2 shrink-0">
                    <QRCodeSVG value={setupData.qrCodeUri} size={150} />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Or enter this key manually:</p>
                    <code className="block break-all text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 select-all">
                      {setupData.secret}
                    </code>
                  </div>
                </div>
              </div>

              <form onSubmit={handleActivate} className="space-y-3">
                <div>
                  <label className={LABEL}>Enter the 6-digit code to activate</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={activateCode}
                    onChange={e => setActivateCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    required
                    className={`${inputCls()} tracking-[0.35em] text-center`}
                    autoComplete="one-time-code"
                  />
                </div>
                {activateErr && <ErrorBanner message={activateErr} />}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={activating || activateCode.length !== 6}
                    className="px-4 py-2 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {activating ? "Activating…" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSetupData(null); setActivateCode(""); setActivateErr(""); }}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type ProfileTab = "account" | "security" | "notifications";

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: "account",       label: "Account"       },
  { key: "security",      label: "Security"      },
  { key: "notifications", label: "Notifications" },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ProfileTab>("account");

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={user?.displayName ?? ""} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-steel-white">{user?.displayName || "My Profile"}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6">
        {PROFILE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              t.key === tab
                ? "bg-brand text-brand-text"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {tab === "account" && (
          <>
            <ProfileCard />
            <PasswordCard />
          </>
        )}
        {tab === "security" && (
          <>
            <TwoFactorCard />
            <SessionsCard />
          </>
        )}
        {tab === "notifications" && <NotificationPreferencesCard />}
      </div>
    </div>
  );
}
