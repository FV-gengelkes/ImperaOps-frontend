"use client";

import { useEffect, useState } from "react";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { getIncidents, getLookups, exportIncidentsCsv, getClientUsers, bulkUpdateIncidents } from "@/lib/api";
import type { IncidentFilters, BulkUpdateIncidentRequest } from "@/lib/api";
import type { IncidentListItemDto, IncidentLookupDto, PagedResult, ClientUserDto } from "@/lib/types";
import { IncidentListTable } from "./incident-list-table";
import { AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, X, Search, Download, Loader2, Check } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const selectCls =
  "px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-colors";

export default function IncidentListPage() {
  const { clientId } = useClientId();
  const { clients }  = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Filters
  const [filterSearch,   setFilterSearch]   = useState<string>("");
  const [filterType,     setFilterType]     = useState<string>("");
  const [filterStatus,   setFilterStatus]   = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo,   setFilterDateTo]   = useState<string>("");

  const debouncedSearch = useDebounce(filterSearch, 300);

  const [typeOptions,   setTypeOptions]   = useState<IncidentLookupDto[]>([]);
  const [statusOptions, setStatusOptions] = useState<IncidentLookupDto[]>([]);

  const [data,      setData]      = useState<PagedResult<IncidentListItemDto> | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string>("");
  const [exporting, setExporting] = useState(false);

  // Bulk action state
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [users,        setUsers]        = useState<ClientUserDto[]>([]);
  const [bulkStatus,   setBulkStatus]   = useState<string>("");
  const [bulkOwner,    setBulkOwner]    = useState<string>("");  // userId, "" or "CLEAR"
  const [bulkLoading,  setBulkLoading]  = useState(false);

  const canQuery   = clientId.trim().length > 0;
  const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 0;
  const rangeStart = data && data.totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd   = data ? Math.min(page * pageSize, data.totalCount) : 0;

  const hasFilters = !!(debouncedSearch || filterType || filterStatus || filterDateFrom || filterDateTo);

  function buildFilters(): IncidentFilters {
    return {
      search:   debouncedSearch || undefined,
      type:     filterType   ? Number(filterType)   : undefined,
      status:   filterStatus ? Number(filterStatus) : undefined,
      dateFrom: filterDateFrom || undefined,
      dateTo:   filterDateTo   || undefined,
    };
  }

  function clearFilters() {
    setFilterSearch("");
    setFilterType("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  function buildExportFilename(): string {
    const clientName = clients.find(c => c.id === clientId.trim())?.name ?? "Client";
    const date = new Date().toISOString().slice(0, 10);

    const parts: string[] = [];
    if (filterType) {
      const label = typeOptions.find(o => String(o.value) === filterType)?.label;
      if (label) parts.push(label);
    }
    if (filterStatus) {
      const label = statusOptions.find(o => String(o.value) === filterStatus)?.label;
      if (label) parts.push(label);
    }
    if (filterDateFrom) parts.push(`From ${filterDateFrom}`);
    if (filterDateTo)   parts.push(`To ${filterDateTo}`);
    if (debouncedSearch) parts.push(`Search ${debouncedSearch}`);

    const base = `${clientName} - Incidents - ${date}`;
    const full = parts.length > 0 ? `${base} - ${parts.join(", ")}` : base;
    return full.replace(/[/\\:*?"<>|]/g, "") + ".csv";
  }

  async function handleExport() {
    if (!canQuery) return;
    setExporting(true);
    try {
      await exportIncidentsCsv(clientId.trim(), buildFilters(), buildExportFilename());
    } catch (e: any) {
      setError(e?.message ?? "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function load(p: number) {
    if (!canQuery) return;
    setLoading(true);
    setError("");
    try {
      const res = await getIncidents(clientId.trim(), p, pageSize, buildFilters());
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load incidents.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Toggle helpers
  function toggleRow(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const pageIds = (data?.items ?? []).map(i => i.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }

  async function handleBulkApply() {
    if (selectedIds.size === 0) return;
    if (!bulkStatus && !bulkOwner) return;

    const payload: BulkUpdateIncidentRequest = {
      clientId: clientId.trim(),
      incidentIds: Array.from(selectedIds),
    };
    if (bulkStatus)          payload.status = Number(bulkStatus);
    if (bulkOwner === "CLEAR") payload.clearOwner = true;
    else if (bulkOwner)      payload.ownerUserId = bulkOwner;

    setBulkLoading(true);
    setError("");
    try {
      await bulkUpdateIncidents(payload);
      setSelectedIds(new Set());
      setBulkStatus("");
      setBulkOwner("");
      await load(page);
    } catch (e: any) {
      setError(e?.message ?? "Bulk update failed.");
    } finally {
      setBulkLoading(false);
    }
  }

  // Fetch lookup options + users whenever clientId changes
  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      getLookups(clientId, "incident_type"),
      getLookups(clientId, "status"),
    ]).then(([types, statuses]) => {
      setTypeOptions(types);
      setStatusOptions(statuses);
    }).catch(() => { /* leave options empty on error */ });

    getClientUsers(clientId).then(setUsers).catch(() => {});
  }, [clientId]);

  // Reset page + selection when clientId or any filter changes
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [clientId, debouncedSearch, filterType, filterStatus, filterDateFrom, filterDateTo]);

  // Reload whenever page changes (page was already reset to 1 above on filter change)
  useEffect(() => { void load(page); /* eslint-disable-next-line */ }, [clientId, page, debouncedSearch, filterType, filterStatus, filterDateFrom, filterDateTo]);

  const currentPageIds = data?.items?.map(i => i.id) ?? [];
  const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Incidents</h1>
          <p className="text-sm text-slate-500 mt-1">
            {!canQuery
              ? "Enter a Client ID above to load incidents"
              : data
              ? `${data.totalCount.toLocaleString()} incident${data.totalCount !== 1 ? "s" : ""}${hasFilters ? " (filtered)" : ""}`
              : loading ? "Loading…" : "—"}
          </p>
        </div>

        {canQuery && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExport}
              disabled={exporting || !clientId}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors shadow-sm"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            <button
              onClick={() => load(page)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Search input */}
      {canQuery && (
        <div className="relative mb-2.5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by location, description, type, or status…"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      )}

      {/* Filter bar */}
      {canQuery && (
        <div className="flex flex-wrap items-center gap-2.5 mb-5 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={selectCls}
          >
            <option value="">All Types</option>
            {typeOptions.map(l => (
              <option key={l.id} value={String(l.value)}>{l.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={selectCls}
          >
            <option value="">All Statuses</option>
            {statusOptions.map(l => (
              <option key={l.id} value={String(l.value)}>{l.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">From</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className={dateCls}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">To</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className={dateCls}
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm">
          <span className="text-sm font-semibold text-indigo-700">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-indigo-500 hover:text-indigo-700 underline transition-colors"
          >
            Clear
          </button>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className={selectCls}
            >
              <option value="">Set status…</option>
              {statusOptions.map(l => (
                <option key={l.id} value={String(l.value)}>{l.label}</option>
              ))}
            </select>

            <select
              value={bulkOwner}
              onChange={e => setBulkOwner(e.target.value)}
              className={selectCls}
            >
              <option value="">Assign owner…</option>
              <option value="CLEAR">— Unassign —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
              ))}
            </select>

            <button
              onClick={handleBulkApply}
              disabled={bulkLoading || (!bulkStatus && !bulkOwner)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {bulkLoading
                ? <Loader2 size={14} className="animate-spin" />
                : <Check size={14} />}
              Apply to {selectedIds.size}
            </button>
          </div>
        </div>
      )}

      {/* No client state */}
      {!canQuery && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">No Client ID set</p>
          <p className="text-sm text-slate-400 mt-1">Enter a Client ID in the bar above to load incidents.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5 flex gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Failed to load incidents</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Table card */}
      {canQuery && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <IncidentListTable
            items={data?.items ?? []}
            loading={loading}
            selectedIds={selectedIds}
            onToggle={toggleRow}
            onToggleAll={toggleAll}
            allSelected={allSelected}
          />

          {/* Pagination */}
          {data && data.totalCount > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-sm text-slate-500">
                {rangeStart}–{rangeEnd} of {data.totalCount.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                  Prev
                </button>
                <span className="text-sm text-slate-500 px-2 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={loading || page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
