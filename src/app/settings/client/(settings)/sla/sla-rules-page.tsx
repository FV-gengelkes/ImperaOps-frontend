"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Plus, Trash2, Pencil, RefreshCw, X } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { isManagerOrAbove } from "@/lib/role-helpers";
import { getSlaRules, createSlaRule, updateSlaRule, deleteSlaRule, getEventTypes } from "@/lib/api";
import type { SlaRuleDto, EventTypeDto } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";

type SlaRuleForm = { name: string; eventTypeId: string; investigationHours: string; closureHours: string };

function emptySlaForm(): SlaRuleForm {
  return { name: "", eventTypeId: "", investigationHours: "", closureHours: "" };
}

function hoursLabel(h: number | null): string {
  if (h === null) return "—";
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  const rem = h % 24;
  return rem ? `${days}d ${rem}h` : `${days}d`;
}

export default function SlaRulesPage() {
  const { clientId } = useClientId();
  const { clients, isSuperAdmin } = useAuth();
  const toast = useToast();

  const role = clients.find(c => c.id === clientId)?.role;
  const isManager = isManagerOrAbove(isSuperAdmin, role);

  const [rules, setRules] = useState<SlaRuleDto[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<SlaRuleForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SlaRuleForm>(emptySlaForm());
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true); setError("");
    try {
      const [r, et] = await Promise.all([getSlaRules(clientId), getEventTypes(clientId)]);
      setRules(r); setEventTypes(et);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  if (!isManager) {
    return (
      <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
        <p className="text-sm text-slate-500">Manager or Admin access required to manage SLA rules.</p>
      </div>
    );
  }

  async function handleAdd() {
    if (!clientId || !form?.name.trim()) return;
    setSaving(true); setError("");
    try {
      await createSlaRule(clientId, {
        name: form.name.trim(),
        eventTypeId: form.eventTypeId ? Number(form.eventTypeId) : null,
        investigationHours: form.investigationHours ? Number(form.investigationHours) : null,
        closureHours: form.closureHours ? Number(form.closureHours) : null,
      });
      setForm(null);
      toast.success("SLA rule created");
      await load();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(rule: SlaRuleDto) {
    if (!clientId) return;
    setSaving(true); setError("");
    try {
      await updateSlaRule(clientId, rule.id, {
        name: editForm.name.trim() || rule.name,
        eventTypeId: editForm.eventTypeId ? Number(editForm.eventTypeId) : null,
        investigationHours: editForm.investigationHours ? Number(editForm.investigationHours) : null,
        closureHours: editForm.closureHours ? Number(editForm.closureHours) : null,
      });
      setEditId(null);
      toast.success("SLA rule updated");
      await load();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rule: SlaRuleDto) {
    if (!clientId || !confirm(`Delete "${rule.name}"?`)) return;
    setDeleting(rule.id);
    try {
      await deleteSlaRule(clientId, rule.id);
      toast.success("SLA rule deleted");
      await load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  function startEdit(rule: SlaRuleDto) {
    setEditId(rule.id);
    setEditForm({
      name: rule.name,
      eventTypeId: rule.eventTypeId ? String(rule.eventTypeId) : "",
      investigationHours: rule.investigationHours ? String(rule.investigationHours) : "",
      closureHours: rule.closureHours ? String(rule.closureHours) : "",
    });
    setForm(null);
  }

  return (
    <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand">
          <Clock className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">SLA Rules</h1>
      </div>
      <p className="text-slate-500 mb-8">
        Define investigation and closure deadlines for events. Rules can apply to all event types or a specific type.
        When an event is created, matching SLA deadlines are automatically tracked.
      </p>

      {!clientId ? (
        <p className="text-sm text-slate-400">Set a client to manage SLA rules.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Configured Rules
                {!loading && <span className="ml-2 text-sm font-normal text-slate-400">({rules.length})</span>}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => void load()} title="Refresh" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                  <RefreshCw size={14} />
                </button>
                {!form && (
                  <button
                    onClick={() => { setForm(emptySlaForm()); setEditId(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
                  >
                    <Plus size={14} /> Add Rule
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="px-5 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</p>
            )}

            {/* Create form */}
            {form && (
              <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">New SLA Rule</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Rule Name <span className="text-red-400">*</span></label>
                    <input className={inputCls} placeholder="e.g. Default SLA" value={form.name}
                      onChange={e => setForm(f => ({ ...f!, name: e.target.value }))} autoFocus />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Event Type</label>
                    <select className={inputCls} value={form.eventTypeId}
                      onChange={e => setForm(f => ({ ...f!, eventTypeId: e.target.value }))}>
                      <option value="">All Types</option>
                      {eventTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Investigation Hours</label>
                    <input type="number" min="1" className={inputCls} placeholder="e.g. 4"
                      value={form.investigationHours}
                      onChange={e => setForm(f => ({ ...f!, investigationHours: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Closure Hours</label>
                    <input type="number" min="1" className={inputCls} placeholder="e.g. 168"
                      value={form.closureHours}
                      onChange={e => setForm(f => ({ ...f!, closureHours: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setForm(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">Cancel</button>
                  <button onClick={() => void handleAdd()} disabled={saving || !form.name.trim()}
                    className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
                    {saving ? "Saving…" : "Add Rule"}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
            ) : rules.length === 0 && !form ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                No SLA rules configured yet. Add a rule to start tracking event deadlines.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rules.map(rule => (
                  <li key={rule.id}>
                    {editId === rule.id ? (
                      <div className="px-5 py-4 bg-slate-50/60 space-y-3">
                        <p className="text-sm font-semibold text-slate-700">Edit Rule</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Rule Name <span className="text-red-400">*</span></label>
                            <input className={inputCls} value={editForm.name}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Event Type</label>
                            <select className={inputCls} value={editForm.eventTypeId}
                              onChange={e => setEditForm(f => ({ ...f, eventTypeId: e.target.value }))}>
                              <option value="">All Types</option>
                              {eventTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Investigation Hours</label>
                            <input type="number" min="1" className={inputCls} placeholder="e.g. 4"
                              value={editForm.investigationHours}
                              onChange={e => setEditForm(f => ({ ...f, investigationHours: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Closure Hours</label>
                            <input type="number" min="1" className={inputCls} placeholder="e.g. 168"
                              value={editForm.closureHours}
                              onChange={e => setEditForm(f => ({ ...f, closureHours: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">Cancel</button>
                          <button onClick={() => void handleEdit(rule)} disabled={saving}
                            className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
                            {saving ? "Saving…" : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{rule.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {rule.eventTypeName ?? "All event types"} · Investigation: {hoursLabel(rule.investigationHours)} · Closure: {hoursLabel(rule.closureHours)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => startEdit(rule)} className="p-1.5 text-slate-300 hover:text-brand transition-colors" title="Edit rule">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => void handleDelete(rule)}
                            disabled={deleting === rule.id}
                            className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors"
                            title="Delete rule"
                          >
                            {deleting === rule.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Help text */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">How SLA Rules Work</h3>
            <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4">
              <li><strong>Investigation Hours</strong> — How long from event creation until an investigation must begin. The event detail page shows a countdown and alerts when breached.</li>
              <li><strong>Closure Hours</strong> — How long from event creation until the event must be closed (moved to a closed status). Managers and Admins are notified of breaches.</li>
              <li><strong>Event Type</strong> — If set, the rule only applies to events of that type. Leave as "All Types" for a global default.</li>
              <li>When multiple rules match, the most specific (by event type) takes priority.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
