"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { adminPurgeEvents, adminResetClient } from "@/lib/api";
import { useToast } from "@/components/toast-context";
import type { AdminClientDto, EventTemplateDto } from "@/lib/types";

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

// ── Component ──────────────────────────────────────────────────────────────────

export function ClientPurgeSection({
  client, templates, onPurged, onReset,
}: {
  client: AdminClientDto;
  templates: EventTemplateDto[];
  onPurged: () => void;
  onReset: () => void;
}) {
  const toast = useToast();
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const [purging, setPurging]           = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetTemplateId, setResetTemplateId] = useState(client.appliedTemplateIds?.[0] ?? "");
  const [resetSeedDemo, setResetSeedDemo] = useState(false);
  const [resetting, setResetting]       = useState(false);

  async function handlePurge() {
    setPurging(true);
    try {
      const res = await adminPurgeEvents(client.id, purgeConfirm);
      setPurgeConfirm("");
      toast.success(`Purged ${res.purgedEventCount} events and all dependent records.`);
      onPurged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purge failed.");
    } finally {
      setPurging(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await adminResetClient(client.id, resetConfirm, resetTemplateId || undefined, resetSeedDemo && !!resetTemplateId);
      setResetConfirm("");
      toast.success(
        `Reset complete. Purged ${res.purgedEventCount} events.` +
        (res.templateReapplied ? " Template re-applied." : ""),
      );
      onReset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Purge Event Data */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
          <Trash2 size={15} className="text-amber-500" />
          <div>
            <h2 className="text-sm font-semibold text-white">Purge Event Data</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deletes all events and dependent records (tasks, attachments, investigations, insights, notifications).
              Configuration (event types, workflows, custom fields, SLA rules) is preserved.
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-amber-950/30 border border-amber-800/40 px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80">
              This action permanently deletes event data and cannot be undone. Type <strong className="text-amber-200">{client.name}</strong> to confirm.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={purgeConfirm}
              onChange={e => setPurgeConfirm(e.target.value)}
              placeholder={`Type "${client.name}" to confirm`}
              className={inputCls + " flex-1"}
            />
            <button
              onClick={() => void handlePurge()}
              disabled={purging || purgeConfirm.toLowerCase() !== client.name.toLowerCase()}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {purging ? <><RefreshCw size={12} className="animate-spin" /> Purging…</> : <><Trash2 size={12} /> Purge Events</>}
            </button>
          </div>
        </div>
      </div>

      {/* Full Client Reset */}
      <div className="bg-[#1E293B] rounded-2xl border border-red-900/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-red-900/30 flex items-center gap-2">
          <RotateCcw size={15} className="text-red-500" />
          <div>
            <h2 className="text-sm font-semibold text-white">Full Client Reset</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deletes all events <strong className="text-slate-400">and</strong> all configuration (event types, workflows, custom fields, SLA rules, documents, webhooks).
              Only the client record, users, and branding are preserved. Optionally re-apply a template to start fresh.
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-red-950/30 border border-red-800/40 px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300/80">
              This is a destructive action. All data except the client, users, and branding will be permanently deleted. Type <strong className="text-red-200">{client.name}</strong> to confirm.
            </p>
          </div>
          {templates.length > 0 && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Re-apply template after reset</label>
                <select
                  value={resetTemplateId}
                  onChange={e => setResetTemplateId(e.target.value)}
                  className={inputCls + " cursor-pointer"}
                >
                  <option value="">— No template (blank) —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {resetTemplateId && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetSeedDemo}
                    onChange={e => setResetSeedDemo(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-brand focus:ring-brand"
                  />
                  <span className="text-xs text-slate-300">Seed demo data (events, insights, root causes)</span>
                </label>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={resetConfirm}
              onChange={e => setResetConfirm(e.target.value)}
              placeholder={`Type "${client.name}" to confirm`}
              className={inputCls + " flex-1"}
            />
            <button
              onClick={() => void handleReset()}
              disabled={resetting || resetConfirm.toLowerCase() !== client.name.toLowerCase()}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resetting ? <><RefreshCw size={12} className="animate-spin" /> Resetting…</> : <><RotateCcw size={12} /> Reset Client</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
