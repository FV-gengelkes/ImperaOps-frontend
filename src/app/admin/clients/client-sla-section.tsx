"use client";

import { useEffect, useState } from "react";
import { Clock, Edit2, Plus, Trash2 } from "lucide-react";
import {
  adminGetSlaRules, adminCreateSlaRule, adminUpdateSlaRule, adminDeleteSlaRule,
  getEventTypes,
} from "@/lib/api";
import type { SlaRuleDto, EventTypeDto } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────────────────

type SlaRuleForm = { name: string; eventTypeId: string; investigationHours: string; closureHours: string };

function emptySlaForm(): SlaRuleForm {
  return { name: "", eventTypeId: "", investigationHours: "", closureHours: "" };
}

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  "rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

// ── Component ──────────────────────────────────────────────────────────────────

export function ClientSlaSection({ clientId }: { clientId: number }) {
  const [rules, setRules]         = useState<SlaRuleDto[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [form, setForm]           = useState<SlaRuleForm | null>(null);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [editForm, setEditForm]   = useState<SlaRuleForm>(emptySlaForm());

  async function load() {
    setLoading(true); setError("");
    try {
      const [r, et] = await Promise.all([adminGetSlaRules(clientId), getEventTypes(clientId)]);
      setRules(r); setEventTypes(et);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    if (!form?.name.trim()) return;
    setSaving(true); setError("");
    try {
      await adminCreateSlaRule(clientId, {
        name: form.name.trim(),
        eventTypeId: form.eventTypeId ? Number(form.eventTypeId) : null,
        investigationHours: form.investigationHours ? Number(form.investigationHours) : null,
        closureHours: form.closureHours ? Number(form.closureHours) : null,
      });
      setForm(null);
      await load();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(rule: SlaRuleDto) {
    setSaving(true); setError("");
    try {
      await adminUpdateSlaRule(clientId, rule.id, {
        name: editForm.name.trim() || rule.name,
        eventTypeId: editForm.eventTypeId ? Number(editForm.eventTypeId) : null,
        investigationHours: editForm.investigationHours ? Number(editForm.investigationHours) : null,
        closureHours: editForm.closureHours ? Number(editForm.closureHours) : null,
      });
      setEditId(null);
      await load();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rule: SlaRuleDto) {
    if (!confirm(`Delete "${rule.name}"?`)) return;
    try {
      await adminDeleteSlaRule(clientId, rule.id);
      await load();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Delete failed.");
    }
  }

  function hoursLabel(h: number | null): string {
    if (h === null) return "—";
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    const rem = h % 24;
    return rem ? `${days}d ${rem}h` : `${days}d`;
  }

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-slate-500" />
          <div>
            <h2 className="text-sm font-semibold text-white">SLA Rules</h2>
            <p className="text-xs text-slate-500 mt-0.5">Set investigation and closure time limits per event type.</p>
          </div>
        </div>
        {!form && (
          <button onClick={() => setForm(emptySlaForm())}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover transition-colors">
            <Plus size={14} /> Add Rule
          </button>
        )}
      </div>
      {error && <p className="px-5 py-2 text-sm text-red-400 bg-red-950/40 border-b border-red-800/40">{error}</p>}
      {loading && <div className="px-5 py-8 text-center text-sm text-slate-500">Loading…</div>}
      {!loading && (
        <div className="divide-y divide-slate-700/40">
          {rules.length === 0 && !form && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No SLA rules defined yet.</p>
          )}
          {rules.map(rule => (
            <div key={rule.id} className="px-5 py-3">
              {editId === rule.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Rule Name *</label>
                      <input className={inputCls} value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Event Type</label>
                      <select className={inputCls} value={editForm.eventTypeId}
                        onChange={e => setEditForm(f => ({ ...f, eventTypeId: e.target.value }))}>
                        <option value="">All Types</option>
                        {eventTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Investigation Hours</label>
                      <input type="number" min="1" className={inputCls} placeholder="e.g. 4"
                        value={editForm.investigationHours}
                        onChange={e => setEditForm(f => ({ ...f, investigationHours: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Closure Hours</label>
                      <input type="number" min="1" className={inputCls} placeholder="e.g. 168"
                        value={editForm.closureHours}
                        onChange={e => setEditForm(f => ({ ...f, closureHours: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => void handleEdit(rule)} disabled={saving}
                      className="px-3 py-1.5 text-xs font-medium bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{rule.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rule.eventTypeName ?? "All types"} ·
                      Investigation: {hoursLabel(rule.investigationHours)} ·
                      Closure: {hoursLabel(rule.closureHours)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditId(rule.id);
                      setEditForm({
                        name: rule.name,
                        eventTypeId: rule.eventTypeId ? String(rule.eventTypeId) : "",
                        investigationHours: rule.investigationHours ? String(rule.investigationHours) : "",
                        closureHours: rule.closureHours ? String(rule.closureHours) : "",
                      });
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors" title="Edit">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => void handleDelete(rule)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {form && (
            <div className="px-5 py-4 bg-slate-800/30 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">New Rule</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rule Name *</label>
                  <input className={inputCls} placeholder="e.g. Default SLA" value={form.name}
                    onChange={e => setForm(f => ({ ...f!, name: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Event Type</label>
                  <select className={inputCls} value={form.eventTypeId}
                    onChange={e => setForm(f => ({ ...f!, eventTypeId: e.target.value }))}>
                    <option value="">All Types</option>
                    {eventTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Investigation Hours</label>
                  <input type="number" min="1" className={inputCls} placeholder="e.g. 4"
                    value={form.investigationHours}
                    onChange={e => setForm(f => ({ ...f!, investigationHours: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Closure Hours</label>
                  <input type="number" min="1" className={inputCls} placeholder="e.g. 168"
                    value={form.closureHours}
                    onChange={e => setForm(f => ({ ...f!, closureHours: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void handleAdd()} disabled={saving || !form.name.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
                  {saving ? "Saving…" : "Add Rule"}
                </button>
                <button onClick={() => setForm(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
