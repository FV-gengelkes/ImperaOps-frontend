"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldAlert, Loader2, ChevronLeft, ChevronRight, Building2, ChevronDown, Check, Search, Download } from "lucide-react";
import { adminGetAuditLog, adminGetClients, exportAuditCsv } from "@/lib/api";
import type { AdminAuditEventDto, AdminClientDto } from "@/lib/types";

const PAGE_SIZE = 50;

const ENTITY_LABELS: Record<string, { label: string; classes: string }> = {
  client:             { label: "Client",  classes: "bg-blue-900/60 text-blue-300 border-blue-700/60" },
  user:               { label: "User",    classes: "bg-violet-900/60 text-violet-300 border-violet-700/60" },
  user_client_access: { label: "Access",  classes: "bg-amber-900/60 text-amber-300 border-amber-700/60" },
};

const EVENT_LABELS: Record<string, string> = {
  created:          "Created",
  updated:          "Updated",
  toggled:          "Toggled",
  invited:          "Invited",
  password_changed: "Password changed",
  access_granted:   "Access granted",
  access_revoked:   "Access revoked",
  role_changed:     "Role changed",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ── Client dropdown ────────────────────────────────────────────────────────────

function ClientDropdown({
  clients,
  selected,
  onChange,
}: {
  clients: AdminClientDto[];
  selected: number | null;
  onChange: (id: number | null) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const ref                 = useRef<HTMLDivElement>(null);
  const searchRef           = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find(c => c.id === selected) ?? null;
  const filtered = query.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
    else setQuery("");
  }, [open]);

  function pick(id: number | null) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/60 text-sm text-slate-200 hover:border-slate-500 hover:bg-slate-700/60 transition-colors min-w-[180px]"
      >
        <Building2 size={14} className="text-slate-400 shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedClient ? selectedClient.name : "All clients"}
        </span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-[#1E293B] border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-700">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-700/60">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search clients…"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto py-1">
            {/* All clients */}
            {!query && (
              <button
                onClick={() => pick(null)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-700/50 transition-colors ${selected === null ? "text-brand" : "text-slate-300"}`}
              >
                <span className="flex-1">All clients</span>
                {selected === null && <Check size={13} className="text-brand shrink-0" />}
              </button>
            )}

            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500 text-center">No clients match.</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => pick(c.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-700/50 transition-colors ${selected === c.id ? "text-brand" : "text-slate-300"}`}
                >
                  <span className="flex-1 truncate">{c.name}</span>
                  {selected === c.id && <Check size={13} className="text-brand shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminAuditPage() {
  const [clients, setClients]                     = useState<AdminClientDto[]>([]);
  const [selectedClientId, setSelectedClientId]   = useState<number | null>(null);
  const [rows, setRows]                           = useState<AdminAuditEventDto[]>([]);
  const [total, setTotal]                         = useState(0);
  const [page, setPage]                           = useState(1);
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState("");

  // Load client list once
  useEffect(() => {
    adminGetClients()
      .then(list => setClients(list.filter(c => c.status !== "Inactive")))
      .catch(() => {});
  }, []);

  // intentionally no auto-default — start with all clients visible

  // Fetch when page or filter changes
  useEffect(() => {
    setLoading(true);
    setError("");
    adminGetAuditLog(page, PAGE_SIZE, selectedClientId ?? undefined)
      .then(res => { setRows(res.items); setTotal(res.totalCount); })
      .catch(() => setError("Failed to load audit log."))
      .finally(() => setLoading(false));
  }, [page, selectedClientId]);

  function handleClientChange(id: number | null) {
    setSelectedClientId(id);
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 lg:p-8">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/20">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">Admin Audit Log</h1>
              <p className="text-sm text-slate-400 mt-0.5">User, client, and access changes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {clients.length > 0 && (
              <ClientDropdown
                clients={clients}
                selected={selectedClientId}
                onChange={handleClientChange}
              />
            )}
            {selectedClientId && (
              <button
                onClick={() => exportAuditCsv(selectedClientId)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/60 text-sm text-slate-200 hover:border-slate-500 hover:bg-slate-700/60 transition-colors"
                title="Export audit log as CSV"
              >
                <Download size={14} />
                Export
              </button>
            )}
            {!loading && total > 0 && (
              <span className="text-xs text-slate-400 whitespace-nowrap">{total.toLocaleString()} entries</span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-slate-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center text-sm text-red-400">{error}</div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No audit entries{selectedClientId ? " for this client" : ""}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">When</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Action</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Client</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">By</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-full">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const entityMeta = ENTITY_LABELS[row.entityType] ?? { label: row.entityType, classes: "bg-slate-700/60 text-slate-300 border-slate-600" };
                    return (
                      <tr key={row.id} className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${i % 2 === 0 ? "" : "bg-slate-800/20"}`}>
                        <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${entityMeta.classes}`}>
                            {entityMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300 font-medium whitespace-nowrap">
                          {EVENT_LABELS[row.eventType] ?? row.eventType}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
                          {row.clientName ?? <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
                          {row.userDisplayName}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 min-w-[300px]">{row.body}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
