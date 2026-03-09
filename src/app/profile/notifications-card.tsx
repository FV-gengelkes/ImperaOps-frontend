"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getNotificationPreferences, saveNotificationPreferences } from "@/lib/api";
import { useToast } from "@/components/toast-context";
import type { NotificationPreferenceDto } from "@/lib/types";

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

export function NotificationPreferencesCard() {
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
        <p className="text-sm text-slate-400">Loading...</p>
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
              {saving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
