"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { updateProfile } from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { LABEL, inputCls, ErrorBanner } from "./profile-shared";

export function ProfileInfoCard() {
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
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
