"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, CheckCircle2, ChevronRight, Edit2, Layers, Plus, Power,
  RefreshCw, Search, Shield, SwitchCamera, X, XCircle,
} from "lucide-react";
import {
  adminCreateClient, adminGetClients, adminToggleClientActive, adminUpdateClient,
} from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import type { AdminClientDto } from "@/lib/types";

// ── Small helpers ─────────────────────────────────────────────────────────────

function Badge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/50">
      <CheckCircle2 size={10} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
      <XCircle size={10} /> Inactive
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-indigo-900/60 border border-indigo-800/40 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ── Edit / Create modal ───────────────────────────────────────────────────────

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; client: AdminClientDto };

function ClientModal({
  state,
  clients,
  onClose,
  onSaved,
}: {
  state: ModalState;
  clients: AdminClientDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = state.mode === "edit";
  const [name, setName]         = useState(isEdit ? state.client.name : "");
  const [parentId, setParentId] = useState(isEdit ? (state.client.parentClientId ?? "") : "");
  const [isActive, setIsActive] = useState(isEdit ? state.client.isActive : true);
  const [saving, setSaving]     = useState(false);
  const [nameError, setNameError] = useState("");
  const [apiError, setApiError]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError("Client name is required."); return; }
    setSaving(true); setNameError(""); setApiError("");
    try {
      if (isEdit) {
        await adminUpdateClient(state.client.id, {
          name: name.trim(),
          parentClientId: parentId || null,
          isActive,
        });
      } else {
        await adminCreateClient(name.trim(), parentId || undefined);
      }
      onSaved();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // Filter out self and children from parent options when editing
  const parentOptions = clients.filter(c =>
    !isEdit || (c.id !== state.client.id && c.parentClientId !== state.client.id)
  );

  const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
    "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? "Edit Client" : "New Client"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">
              {apiError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Client Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => { setName(e.target.value); setNameError(""); }}
              placeholder="e.g. Acme Freight Co."
              className={nameError ? inputCls.replace("border-slate-700", "border-red-500") : inputCls}
            />
            {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Parent Client (optional)</label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className={inputCls + " cursor-pointer"}
            >
              <option value="">— None (top-level) —</option>
              {parentOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-300">Active</p>
                <p className="text-xs text-slate-500">Inactive clients are hidden from users.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? "bg-indigo-600" : "bg-slate-700"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold transition">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminClientsPage() {
  const { activeClientId, setActiveClientId, isSuperAdmin } = useAuth();
  const router = useRouter();

  const [clients, setClients]   = useState<AdminClientDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState<ModalState | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setClients(await adminGetClients());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(id: string) {
    setToggling(id);
    try {
      const res = await adminToggleClientActive(id);
      setClients(prev => prev.map(c => c.id === id ? { ...c, isActive: res.isActive } : c));
    } finally {
      setToggling(null);
    }
  }

  function handleSwitchTo(clientId: string, clientName: string) {
    setSwitching(clientId);
    // Update active client — this triggers re-fetches across the app
    setActiveClientId(clientId);
    // router.refresh() clears Next.js server-component cache and causes re-render
    router.refresh();
    // Small delay to show the feedback, then navigate to dashboard
    setTimeout(() => {
      setSwitching(null);
      router.push("/dashboard");
    }, 400);
    void clientName; // used in the button label
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.parentClientName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalActive   = clients.filter(c => c.isActive).length;
  const totalInactive = clients.filter(c => !c.isActive).length;
  const totalChild    = clients.filter(c => c.parentClientId).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Super Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Client Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create, edit, and switch between all clients.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
            title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setModal({ mode: "create" })}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition shadow-sm"
          >
            <Plus size={16} /> New Client
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Clients",    value: clients.length, icon: Building2, color: "text-slate-700" },
          { label: "Active",           value: totalActive,    icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Inactive",         value: totalInactive,  icon: XCircle,     color: "text-slate-400" },
          { label: "Child Clients",    value: totalChild,     icon: Layers,      color: "text-indigo-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={color} />
              <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            {search ? "No clients match your search." : "No clients yet."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Parent</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Users</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(client => {
                const isActive    = client.id === activeClientId;
                const isToggling  = toggling === client.id;
                const isSwitching = switching === client.id;

                return (
                  <tr key={client.id}
                    className={`group transition-colors ${isActive ? "bg-indigo-50/40" : "hover:bg-slate-50/60"}`}
                  >
                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.name} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{client.name}</span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                                Viewing
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{client.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>

                    {/* Parent */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      {client.parentClientName ? (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <ChevronRight size={12} className="text-slate-400" />
                          <span className="text-xs">{client.parentClientName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    {/* Users */}
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-slate-600">{client.userCount}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <Badge active={client.isActive} />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Switch to */}
                        {!isActive && (
                          <button
                            onClick={() => handleSwitchTo(client.id, client.name)}
                            disabled={!!switching}
                            title="Switch to this client"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                       bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60 transition"
                          >
                            {isSwitching ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <SwitchCamera size={12} />
                            )}
                            {isSwitching ? "Switching…" : "Switch to"}
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => setModal({ mode: "edit", client })}
                          title="Edit client"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggle(client.id)}
                          disabled={isToggling}
                          title={client.isActive ? "Deactivate" : "Activate"}
                          className={`p-1.5 rounded-lg transition ${
                            client.isActive
                              ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          } disabled:opacity-50`}
                        >
                          {isToggling
                            ? <RefreshCw size={15} className="animate-spin" />
                            : <Power size={15} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ClientModal
          state={modal}
          clients={clients}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
