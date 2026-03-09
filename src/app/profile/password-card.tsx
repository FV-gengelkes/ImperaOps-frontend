"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound } from "lucide-react";
import { changePassword } from "@/lib/api";
import { useToast } from "@/components/toast-context";
import { LABEL, ErrorBanner, PasswordInput } from "./profile-shared";

export function PasswordCard() {
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
            {saving ? "Saving..." : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
