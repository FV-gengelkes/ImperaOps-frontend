"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Loader2, Save } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { isAdmin as checkAdmin } from "@/lib/role-helpers";
import { getReportSchedule, upsertReportSchedule, deleteReportSchedule } from "@/lib/api";
import type { ReportScheduleDto } from "@/lib/types";
import { useToast } from "@/components/toast-context";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1);

export default function ReportsSettingsPage() {
  const { clientId } = useClientId();
  const { isSuperAdmin, clients } = useAuth();
  const toast = useToast();
  const role = clients.find(c => c.id === clientId)?.role;
  const admin = checkAdmin(isSuperAdmin, role);

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [enabled, setEnabled]     = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [hasSchedule, setHasSchedule] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const schedule = await getReportSchedule(clientId);
      if (schedule) {
        setEnabled(schedule.isEnabled);
        setFrequency(schedule.frequency as "weekly" | "monthly");
        setDayOfWeek(schedule.dayOfWeek);
        setDayOfMonth(schedule.dayOfMonth);
        setLastSentAt(schedule.lastSentAt);
        setHasSchedule(true);
      } else {
        setHasSchedule(false);
      }
    } catch {
      // no schedule yet
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!clientId) return;
    setSaving(true);
    try {
      const result = await upsertReportSchedule(clientId, {
        frequency,
        dayOfWeek,
        dayOfMonth,
        isEnabled: enabled,
      });
      setLastSentAt(result.lastSentAt);
      setHasSchedule(true);
      toast.success("Report schedule saved.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!clientId || !confirm("Delete this report schedule?")) return;
    setSaving(true);
    try {
      await deleteReportSchedule(clientId);
      setEnabled(false);
      setFrequency("weekly");
      setDayOfWeek(1);
      setDayOfMonth(1);
      setLastSentAt(null);
      setHasSchedule(false);
      toast.success("Report schedule removed.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete schedule.");
    } finally {
      setSaving(false);
    }
  }

  if (!admin) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
            <Mail size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Scheduled Reports</h1>
            <p className="text-sm text-slate-500">Admin access required.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
            <Mail size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Scheduled Reports</h1>
            <p className="text-sm text-slate-500">Send periodic email digests with event KPIs to Managers and Admins.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Enable scheduled reports</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  When enabled, a summary email is sent on the configured schedule to all Manager and Admin users.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-brand" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {enabled && (
              <>
                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Frequency</label>
                  <div className="flex gap-2">
                    {(["weekly", "monthly"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFrequency(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          frequency === f
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day picker */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {frequency === "weekly" ? "Day of week" : "Day of month"}
                  </label>
                  {frequency === "weekly" ? (
                    <select
                      value={dayOfWeek}
                      onChange={e => setDayOfWeek(Number(e.target.value))}
                      className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                    >
                      {DAYS_OF_WEEK.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={dayOfMonth}
                      onChange={e => setDayOfMonth(Number(e.target.value))}
                      className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                    >
                      {DAYS_OF_MONTH.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Info */}
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                  <p className="text-xs text-slate-500">
                    Reports are sent at 07:00 UTC on the selected day. All users with Manager or Admin roles will
                    receive the email unless they opt out in their notification preferences.
                  </p>
                  {lastSentAt && (
                    <p className="text-xs text-slate-400 mt-2">
                      Last sent: {new Date(lastSentAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
              {hasSchedule && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-sm text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  Remove schedule
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
