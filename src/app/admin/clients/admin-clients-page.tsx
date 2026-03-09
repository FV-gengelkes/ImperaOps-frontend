"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, CheckCircle2, Edit2, LayoutTemplate, Loader2, Plus, Power,
  RefreshCw, Search, SwitchCamera, XCircle,
} from "lucide-react";
import {
  adminApplyTemplate, adminGetClients, adminGetClientUsers, adminGetTemplates,
  adminUpdateClientStatus,
} from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import type { AdminClientDto, AdminClientUserDto, ClientStatus, EventTemplateDto } from "@/lib/types";

import { ClientModal, type ClientModalState } from "./client-modal";
import { ClientUsersSection } from "./client-users-section";
import { ClientBrandingSection } from "./client-branding-section";
import { ClientInboundEmailSection } from "./client-inbound-email-section";
import { ClientSlaSection } from "./client-sla-section";
import { ClientPurgeSection } from "./client-purge-section";

// ── Status config ──────────────────────────────────────────────────────────────

const statusConfig: Record<string, { dot: string; label: string; badge: string }> = {
  Active:    { dot: "bg-emerald-500", label: "Active",     badge: "bg-emerald-900/50 text-emerald-400 border-emerald-700/50" },
  Inactive:  { dot: "bg-slate-600",   label: "Inactive",   badge: "bg-slate-800 text-slate-500 border-slate-700" },
  Demo:      { dot: "bg-amber-500",   label: "Demo",       badge: "bg-amber-900/50 text-amber-400 border-amber-700/50" },
  SalesDemo: { dot: "bg-purple-500",  label: "Sales Demo", badge: "bg-purple-900/50 text-purple-400 border-purple-700/50" },
};

// ── Main page ──────────────────────────────────────────────────────────────────

type ClientDetailTab = "users" | "branding" | "reporting" | "templates" | "sla" | "data";

export function AdminClientsPage() {
  const { activeClientId, setActiveClientId, refreshClients } = useAuth();
  const router = useRouter();
  const toast  = useToast();

  // Clients
  const [clients, setClients]     = useState<AdminClientDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Users for selected client
  const [users, setUsers]               = useState<AdminClientUserDto[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Templates
  const [templates, setTemplates]   = useState<EventTemplateDto[]>([]);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

  // Action state
  const [togglingClient, setTogglingClient] = useState<number | null>(null);
  const [switching, setSwitching]           = useState<number | null>(null);

  // Modals
  const [clientModal, setClientModal] = useState<ClientModalState | null>(null);

  // Client detail tabs
  const [clientDetailTab, setClientDetailTab] = useState<ClientDetailTab>("users");

  const selectedClient = clients.find(c => c.id === selectedId) ?? null;

  const loadClients = useCallback(async () => {
    setLoading(true);
    try { setClients(await adminGetClients()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadClients();
    adminGetTemplates().then(setTemplates).catch(() => {});
  }, [loadClients]);

  useEffect(() => {
    if (!selectedId) { setUsers([]); return; }
    setUsersLoading(true);
    adminGetClientUsers(selectedId)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [selectedId]);

  // Reset detail tab when client selection changes
  useEffect(() => { setClientDetailTab("users"); }, [selectedId]);

  async function handleStatusChange(id: number, newStatus: ClientStatus) {
    setTogglingClient(id);
    try {
      const res = await adminUpdateClientStatus(id, newStatus);
      setClients(prev => prev.map(c => c.id === id ? { ...c, status: res.status as ClientStatus } : c));
    } finally {
      setTogglingClient(null);
    }
  }

  function handleSwitchTo(clientId: number) {
    setSwitching(clientId);
    setActiveClientId(clientId);
    router.refresh();
    setTimeout(() => { setSwitching(null); router.push("/dashboard"); }, 400);
  }

  const [seedDemoData, setSeedDemoData] = useState(true);

  async function handleApplyTemplate(templateId: string, templateName: string) {
    if (!selectedId) return;
    if (!window.confirm(
      `Apply "${templateName}" to ${selectedClient?.name}?\n\n` +
      `This will add event types, workflow statuses, transitions, and custom fields. ` +
      `Existing configuration will not be removed.` +
      (seedDemoData ? `\n\nDemo events will also be generated.` : ``)
    )) return;
    setApplyingTemplate(templateId);
    try {
      await adminApplyTemplate(selectedId, templateId, seedDemoData);
      toast.success(seedDemoData
        ? `Template applied with demo data — events and insights generated.`
        : `Template applied — event types and workflow configured.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply template.");
    } finally {
      setApplyingTemplate(null);
    }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1">

      {/* ── Left: Client list ──────────────────────────────────────────── */}
      <div className="w-64 lg:w-72 flex-shrink-0 border-r border-slate-800 flex flex-col">

        {/* Panel header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Clients</span>
            <button
              onClick={() => setClientModal({ mode: "create" })}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand text-xs font-semibold transition"
            >
              <Plus size={12} /> New
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand/50 transition"
            />
          </div>
        </div>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-slate-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-xs text-slate-600 text-center">
              {search ? "No clients match." : "No clients yet."}
            </p>
          ) : (
            filtered.map(client => {
              const isSelected  = client.id === selectedId;
              const isToggling  = togglingClient === client.id;

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedId(client.id)}
                  className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-r-2 ${
                    isSelected
                      ? "bg-brand/10 border-brand"
                      : "border-transparent hover:bg-slate-800/50"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    isSelected ? "bg-brand/20 text-brand" : "bg-slate-700/60 text-slate-400"
                  }`}>
                    {client.name[0]?.toUpperCase()}
                  </div>

                  {/* Name + users */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate transition-colors ${isSelected ? "text-brand" : "text-slate-200"}`}>
                      {client.name}
                    </p>
                    <p className="text-xs text-slate-500">{client.userCount} {client.userCount === 1 ? "user" : "users"}</p>
                  </div>

                  {/* Active dot + hover actions */}
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full shrink-0 transition-opacity ${statusConfig[client.status]?.dot ?? "bg-slate-600"} ${isSelected ? "opacity-100" : "group-hover:opacity-0"}`} />
                    <div className="hidden group-hover:flex items-center gap-0.5 absolute right-3">
                      <button
                        onClick={e => { e.stopPropagation(); setClientModal({ mode: "edit", client }); }}
                        title="Edit client"
                        className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition"
                      >
                        <Edit2 size={11} />
                      </button>
                      {client.status !== "Inactive" ? (
                        <button
                          onClick={e => { e.stopPropagation(); handleStatusChange(client.id, "Inactive"); }}
                          disabled={isToggling}
                          title="Deactivate"
                          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition"
                        >
                          {isToggling ? <RefreshCw size={11} className="animate-spin" /> : <Power size={11} />}
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); handleStatusChange(client.id, "Active"); }}
                          disabled={isToggling}
                          title="Activate"
                          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition"
                        >
                          {isToggling ? <RefreshCw size={11} className="animate-spin" /> : <Power size={11} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Client detail ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selectedClient ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
              <Building2 size={28} className="text-slate-600" />
            </div>
            <h2 className="text-slate-400 font-medium mb-1">Select a client</h2>
            <p className="text-xs text-slate-600 max-w-xs">
              Choose a client from the list to view and manage its users.
            </p>
          </div>
        ) : (
          <div className="p-6 lg:p-8 max-w-4xl">

            {/* Client header */}
            <div className="flex items-start justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-xl font-bold text-brand shrink-0">
                  {selectedClient.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl font-bold text-white">{selectedClient.name}</h1>
                    {selectedClient.parentClientName && (
                      <span className="text-xs text-slate-500 bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 rounded-full">
                        &#8627; {selectedClient.parentClientName}
                      </span>
                    )}
                    {(() => {
                      const sc = statusConfig[selectedClient.status] ?? statusConfig.Active;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.badge}`}>
                          {selectedClient.status === "Inactive" ? <XCircle size={9} /> : <CheckCircle2 size={9} />} {sc.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">#{selectedClient.id} &middot; {selectedClient.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-1">
                {activeClientId !== selectedClient.id && (
                  <button
                    onClick={() => handleSwitchTo(selectedClient.id)}
                    disabled={!!switching}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-600 text-slate-300 hover:bg-slate-800 transition disabled:opacity-60"
                  >
                    {switching === selectedClient.id
                      ? <RefreshCw size={12} className="animate-spin" />
                      : <SwitchCamera size={12} />
                    }
                    Switch to
                  </button>
                )}
                <select
                  value={selectedClient.status}
                  onChange={e => handleStatusChange(selectedClient.id, e.target.value as ClientStatus)}
                  disabled={togglingClient === selectedClient.id}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
                >
                  <option value="Active">Active</option>
                  <option value="Demo">Demo</option>
                  <option value="SalesDemo">Sales Demo</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <button
                  onClick={() => setClientModal({ mode: "edit", client: selectedClient })}
                  className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                  title="Edit client"
                >
                  <Edit2 size={15} />
                </button>
              </div>
            </div>

            {/* Detail tabs */}
            <div className="border-b border-slate-700/60 mb-6 flex gap-1">
              {(["users", "branding", "reporting", "templates", "sla", "data"] as const).map(tab => {
                const labels: Record<string, string> = {
                  users: "Users", branding: "Branding", reporting: "Reporting", templates: "Templates", sla: "SLA Rules", data: "Data",
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setClientDetailTab(tab)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                      clientDetailTab === tab
                        ? "bg-slate-800 text-white border border-b-0 border-slate-700/60"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* ── Tab content ────────────────────────────────────────────── */}

            {clientDetailTab === "users" && (
              <ClientUsersSection
                clientId={selectedClient.id}
                users={users}
                usersLoading={usersLoading}
                onUsersChange={setUsers}
                onUserCountChange={(delta) => {
                  setClients(prev => prev.map(c =>
                    c.id === selectedId ? { ...c, userCount: Math.max(0, c.userCount + delta) } : c
                  ));
                }}
              />
            )}

            {clientDetailTab === "branding" && (
              <ClientBrandingSection
                clientId={selectedClient.id}
                activeClientId={activeClientId}
              />
            )}

            {clientDetailTab === "reporting" && (
              <ClientInboundEmailSection client={selectedClient} />
            )}

            {clientDetailTab === "sla" && (
              <ClientSlaSection clientId={selectedClient.id} />
            )}

            {clientDetailTab === "templates" && (
              <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
                  <LayoutTemplate size={15} className="text-slate-500" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">Apply a Template</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adds pre-built event types, workflow, and fields. Won&apos;t remove existing config.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seedDemoData}
                      onChange={e => setSeedDemoData(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-800 text-brand focus:ring-brand/40"
                    />
                    <span className="text-xs text-slate-300 font-medium">Seed demo data</span>
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Generate ~120 realistic events, root causes, and insight alerts
                  </span>
                </div>
                {templates.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">No templates available.</div>
                ) : (
                  <div className="p-4 space-y-3">
                    {templates.map(t => {
                      const isApplied = selectedClient?.appliedTemplateIds?.includes(t.id) ?? false;
                      return (
                        <div key={t.id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-slate-200">{t.name}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                                {t.industry}
                              </span>
                              {isApplied && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                                  Applied
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {t.eventTypeCount} event types &middot; {t.statusCount} statuses &middot; {t.customFieldCount} custom fields
                            </p>
                          </div>
                          <button
                            onClick={() => handleApplyTemplate(t.id, t.name)}
                            disabled={isApplied || applyingTemplate === t.id}
                            title={isApplied ? "Already applied to this client" : undefined}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {applyingTemplate === t.id
                              ? <><RefreshCw size={12} className="animate-spin" /> Applying&hellip;</>
                              : isApplied ? "Applied" : "Apply"
                            }
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {clientDetailTab === "data" && (
              <ClientPurgeSection
                client={selectedClient}
                templates={templates}
                onPurged={() => { toast.success("Event data purged"); }}
                onReset={() => { toast.success("Client reset complete"); void loadClients(); }}
              />
            )}
          </div>
        )}
      </div>

      {/* Client create/edit modal */}
      {clientModal && (
        <ClientModal
          state={clientModal}
          clients={clients}
          onClose={() => setClientModal(null)}
          onSaved={(refreshId) => {
            toast.success(clientModal.mode === "create" ? "Client created" : "Client updated");
            setClientModal(null);
            loadClients().then(() => {
              if (refreshId) setSelectedId(refreshId);
            });
            refreshClients();
          }}
        />
      )}
    </div>
  );
}
