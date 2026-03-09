"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutTemplate, X } from "lucide-react";
import {
  adminCreateClient, adminGetTemplates, adminUpdateClient,
} from "@/lib/api";
import type { AdminClientDto, ClientStatus, EventTemplateDto } from "@/lib/types";

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ClientModalState = { mode: "create" } | { mode: "edit"; client: AdminClientDto };

// ── Component ──────────────────────────────────────────────────────────────────

export function ClientModal({
  state, clients, onClose, onSaved,
}: {
  state: ClientModalState;
  clients: AdminClientDto[];
  onClose: () => void;
  onSaved: (refreshId?: number) => void;
}) {
  const isEdit = state.mode === "edit";
  const [name, setName]         = useState(isEdit ? state.client.name : "");
  const [parentId, setParentId] = useState(isEdit ? String(state.client.parentClientId ?? "") : "");
  const [status, setStatus] = useState<ClientStatus>(isEdit ? state.client.status : "Active");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates]   = useState<EventTemplateDto[]>([]);
  const [seedDemoData, setSeedDemoData] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [nameError, setNameError] = useState("");
  const [apiError, setApiError]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (!isEdit) adminGetTemplates().then(setTemplates).catch(() => {});
  }, [isEdit]);

  const parentOptions = clients.filter(c =>
    !isEdit || (c.id !== state.client.id && c.parentClientId !== state.client.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError("Client name is required."); return; }
    setSaving(true); setNameError(""); setApiError("");
    try {
      if (isEdit) {
        await adminUpdateClient(state.client.id, {
          name: name.trim(),
          parentClientId: parentId ? Number(parentId) : null,
          status,
        });
        onSaved(state.client.id);
      } else {
        await adminCreateClient(
          name.trim(),
          parentId ? Number(parentId) : undefined,
          templateId || undefined,
          status,
          seedDemoData && !!templateId,
        );
        onSaved();
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">{isEdit ? "Edit Client" : "New Client"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{apiError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Client Name <span className="text-red-400">*</span>
            </label>
            <input ref={inputRef} value={name}
              onChange={e => { setName(e.target.value); setNameError(""); }}
              placeholder="e.g. Acme Freight Co."
              className={nameError ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
            {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Parent Client (optional)</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)}
              className={inputCls + " cursor-pointer"}>
              <option value="">— None (top-level) —</option>
              {parentOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as ClientStatus)}
              className={inputCls + " cursor-pointer"}>
              <option value="Active">Active</option>
              <option value="Demo">Demo</option>
              <option value="SalesDemo">Sales Demo</option>
              <option value="Inactive">Inactive</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Inactive clients are hidden from users.</p>
          </div>
          {!isEdit && templates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Pre-built Configuration <span className="text-slate-600">(optional)</span>
              </label>
              <div className="space-y-2">
                {/* Blank option */}
                <button type="button" onClick={() => setTemplateId("")}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${
                    templateId === ""
                      ? "border-brand bg-brand/10"
                      : "border-slate-700 hover:border-slate-600 bg-slate-800/40"
                  }`}>
                  <p className="text-sm font-medium text-white">Start blank</p>
                  <p className="text-xs text-slate-500 mt-0.5">Configure event types and workflows manually</p>
                </button>
                {templates.map(t => (
                  <button key={t.id} type="button" onClick={() => setTemplateId(t.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${
                      templateId === t.id
                        ? "border-brand bg-brand/10"
                        : "border-slate-700 hover:border-slate-600 bg-slate-800/40"
                    }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                        {t.industry}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.eventTypeCount} event types · {t.statusCount} statuses · {t.customFieldCount} custom fields
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isEdit && templateId && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={seedDemoData}
                onChange={e => setSeedDemoData(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-brand focus:ring-brand"
              />
              <span className="text-sm text-slate-300">Seed demo data</span>
              <span className="text-xs text-slate-500">(events, insights, root causes)</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
