"use client";

import { useEffect, useRef, useState } from "react";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import {
  getEvents, getEventTypes, getWorkflowStatuses, exportEventsCsv,
  getClientUsers, bulkUpdateEvents, bulkDeleteEvents,
} from "@/lib/api";
import type { EventFilters, BulkUpdateEventRequest, BulkDeleteEventRequest } from "@/lib/api";
import type { EventListItemDto, EventTypeDto, WorkflowStatusDto, PagedResult, ClientUserDto } from "@/lib/types";
import { EventListTable } from "./event-list-table";
import { AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, X, Search, Download, Loader2, Check, Bookmark, BookmarkCheck, Trash2 } from "lucide-react";

// ── Filter Presets ────────────────────────────────────────────────────────────

type FilterPreset = {
  id: string;
  name: string;
  search: string;
  eventTypeId: string;
  workflowStatusId: string;
  dateFrom: string;
  dateTo: string;
};

function presetKey(clientId: number) {
  return `imperaops.filter-presets.${clientId}`;
}

function loadPresets(clientId: number): FilterPreset[] {
  try {
    const raw = localStorage.getItem(presetKey(clientId));
    return raw ? (JSON.parse(raw) as FilterPreset[]) : [];
  } catch {
    return [];
  }
}

function savePresets(clientId: number, presets: FilterPreset[]) {
  localStorage.setItem(presetKey(clientId), JSON.stringify(presets));
}

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
  "focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors";

const dateCls =
  "px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 " +
  "focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors";

export default function EventListPage() {
  const { clientId } = useClientId();
  const { clients, isSuperAdmin } = useAuth();
  const role             = clients.find(c => c.id === clientId)?.role;
  const isAdmin          = isSuperAdmin || role === "Admin";
  const isManagerOrAbove = isSuperAdmin || ["Admin", "Manager"].includes(role ?? "");
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Filters
  const [filterSearch,   setFilterSearch]   = useState<string>("");
  const [filterType,     setFilterType]     = useState<string>("");
  const [filterStatus,   setFilterStatus]   = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo,   setFilterDateTo]   = useState<string>("");

  // Presets
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const presetInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(filterSearch, 300);

  const [typeOptions,   setTypeOptions]   = useState<EventTypeDto[]>([]);
  const [statusOptions, setStatusOptions] = useState<WorkflowStatusDto[]>([]);

  const [data,      setData]      = useState<PagedResult<EventListItemDto> | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string>("");
  const [exporting, setExporting] = useState(false);

  // Bulk action state
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [users,        setUsers]        = useState<ClientUserDto[]>([]);
  const [bulkStatus,   setBulkStatus]   = useState<string>("");
  const [bulkOwner,    setBulkOwner]    = useState<string>("");  // userId as string, "" or "CLEAR"
  const [bulkLoading,  setBulkLoading]  = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const canQuery   = clientId > 0;
  const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 0;
  const rangeStart = data && data.totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd   = data ? Math.min(page * pageSize, data.totalCount) : 0;

  const hasFilters = !!(debouncedSearch || filterType || filterStatus || filterDateFrom || filterDateTo);

  function buildFilters(): EventFilters {
    return {
      search:           debouncedSearch || undefined,
      eventTypeId:      filterType   ? Number(filterType)   : undefined,
      workflowStatusId: filterStatus ? Number(filterStatus) : undefined,
      dateFrom:         filterDateFrom || undefined,
      dateTo:           filterDateTo   || undefined,
    };
  }

  function clearFilters() {
    setFilterSearch("");
    setFilterType("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  function applyPreset(preset: FilterPreset) {
    setFilterSearch(preset.search);
    setFilterType(preset.eventTypeId);
    setFilterStatus(preset.workflowStatusId);
    setFilterDateFrom(preset.dateFrom);
    setFilterDateTo(preset.dateTo);
  }

  function confirmSavePreset() {
    const name = presetName.trim();
    if (!name) return;
    const preset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      search: filterSearch,
      eventTypeId: filterType,
      workflowStatusId: filterStatus,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
    };
    const next = [...presets, preset];
    setPresets(next);
    savePresets(clientId, next);
    setSavingPreset(false);
    setPresetName("");
    toast.success(`Preset "${name}" saved`);
  }

  function deletePreset(id: string) {
    const next = presets.filter(p => p.id !== id);
    setPresets(next);
    savePresets(clientId, next);
  }

  function buildExportFilename(): string {
    const clientName = clients.find(c => c.id === clientId)?.name ?? "Client";
    const date = new Date().toISOString().slice(0, 10);

    const parts: string[] = [];
    if (filterType) {
      const label = typeOptions.find(o => String(o.id) === filterType)?.name;
      if (label) parts.push(label);
    }
    if (filterStatus) {
      const label = statusOptions.find(o => String(o.id) === filterStatus)?.name;
      if (label) parts.push(label);
    }
    if (filterDateFrom) parts.push(`From ${filterDateFrom}`);
    if (filterDateTo)   parts.push(`To ${filterDateTo}`);
    if (debouncedSearch) parts.push(`Search ${debouncedSearch}`);

    const base = `${clientName} - Events - ${date}`;
    const full = parts.length > 0 ? `${base} - ${parts.join(", ")}` : base;
    return full.replace(/[/\\:*?"<>|]/g, "") + ".csv";
  }

  async function handleExport() {
    if (!canQuery) return;
    setExporting(true);
    try {
      await exportEventsCsv(clientId, buildFilters(), buildExportFilename());
      toast.success("Export ready");
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
      const res = await getEvents(clientId, p, pageSize, buildFilters());
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load events.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(publicId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  function toggleAll() {
    const pageIds = (data?.items ?? []).map(i => i.publicId);
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

    const payload: BulkUpdateEventRequest = {
      clientId,
      eventPublicIds: Array.from(selectedIds),
    };
    if (bulkStatus)            payload.workflowStatusId = Number(bulkStatus);
    if (bulkOwner === "CLEAR") payload.clearOwner = true;
    else if (bulkOwner)        payload.ownerUserId = Number(bulkOwner);

    const count = selectedIds.size;
    setBulkLoading(true);
    setError("");
    try {
      await bulkUpdateEvents(payload);
      setSelectedIds(new Set());
      setBulkStatus("");
      setBulkOwner("");
      await load(page);
      toast.success(`${count} event${count !== 1 ? "s" : ""} updated`);
    } catch (e: any) {
      setError(e?.message ?? "Bulk update failed.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.size} event${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;

    const payload: BulkDeleteEventRequest = {
      clientId,
      eventPublicIds: Array.from(selectedIds),
    };

    const count = selectedIds.size;
    setBulkDeleteLoading(true);
    setError("");
    try {
      await bulkDeleteEvents(payload);
      setSelectedIds(new Set());
      await load(page);
      toast.success(`${count} event${count !== 1 ? "s" : ""} deleted`);
    } catch (e: any) {
      setError(e?.message ?? "Bulk delete failed.");
    } finally {
      setBulkDeleteLoading(false);
    }
  }

  // Load presets whenever clientId changes
  useEffect(() => {
    if (!clientId) return;
    setPresets(loadPresets(clientId));
    setSavingPreset(false);
    setPresetName("");
  }, [clientId]);

  // Fetch lookup options + users whenever clientId changes
  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      getEventTypes(clientId),
      getWorkflowStatuses(clientId),
    ]).then(([types, statuses]) => {
      setTypeOptions(types);
      setStatusOptions(statuses);
    }).catch(() => {});

    getClientUsers(clientId).then(u => setUsers(u.filter(u => !u.isSuperAdmin))).catch(() => {});
  }, [clientId]);

  // Reset page + selection when clientId or any filter changes
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [clientId, debouncedSearch, filterType, filterStatus, filterDateFrom, filterDateTo]);

  // Reload whenever page changes
  useEffect(() => { void load(page); /* eslint-disable-next-line */ }, [clientId, page, debouncedSearch, filterType, filterStatus, filterDateFrom, filterDateTo]);

  const currentPageIds = data?.items?.map(i => i.publicId) ?? [];
  const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Events</h1>
          <p className="text-sm text-slate-500 mt-1">
            {!canQuery
              ? "Select a client to load events"
              : data
              ? `${data.totalCount.toLocaleString()} event${data.totalCount !== 1 ? "s" : ""}${hasFilters ? " (filtered)" : ""}`
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
            placeholder="Search by title, location, description, or type…"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
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
            {typeOptions.map(t => (
              <option key={t.id} value={String(t.id)}>{t.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={selectCls}
          >
            <option value="">All Statuses</option>
            {statusOptions.map(s => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
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

          {/* Save preset */}
          {hasFilters && !savingPreset && (
            <button
              onClick={() => { setSavingPreset(true); setTimeout(() => presetInputRef.current?.focus(), 0); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand hover:text-brand-hover bg-brand/5 hover:bg-brand/10 rounded-lg transition-colors ml-auto"
            >
              <Bookmark size={13} />
              Save
            </button>
          )}

          {savingPreset && (
            <div className="flex items-center gap-1.5 ml-auto">
              <input
                ref={presetInputRef}
                type="text"
                placeholder="Preset name…"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") confirmSavePreset(); if (e.key === "Escape") { setSavingPreset(false); setPresetName(""); } }}
                className="px-3 py-2 text-sm border border-brand/40 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40 w-40"
              />
              <button
                onClick={confirmSavePreset}
                disabled={!presetName.trim()}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-40 transition-colors"
              >
                <BookmarkCheck size={13} />
                Confirm
              </button>
              <button
                onClick={() => { setSavingPreset(false); setPresetName(""); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preset chips */}
      {canQuery && presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 -mt-3">
          {presets.map(p => (
            <div key={p.id} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-brand/10 text-brand rounded-full text-xs font-medium">
              <button onClick={() => applyPreset(p)} className="hover:text-brand-hover transition-colors">
                {p.name}
              </button>
              <button
                onClick={() => deletePreset(p.id)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-brand/20 text-brand/60 hover:text-brand transition-colors"
                title="Remove preset"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3 bg-brand/5 border border-brand/20 rounded-xl shadow-sm">
          <span className="text-sm font-semibold text-brand-link">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-brand-link opacity-70 hover:opacity-100 underline transition-opacity"
          >
            Clear
          </button>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {isManagerOrAbove && (
              <>
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Set status…</option>
                  {statusOptions.map(s => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
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
                    <option key={u.id} value={String(u.id)}>{u.displayName}</option>
                  ))}
                </select>

                <button
                  onClick={handleBulkApply}
                  disabled={bulkLoading || (!bulkStatus && !bulkOwner)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {bulkLoading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Check size={14} />}
                  Apply to {selectedIds.size}
                </button>
              </>
            )}

            {isAdmin && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteLoading || bulkLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bulkDeleteLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Trash2 size={14} />}
                Delete ({selectedIds.size})
              </button>
            )}
          </div>
        </div>
      )}

      {/* No client state */}
      {!canQuery && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">No client selected</p>
          <p className="text-sm text-slate-400 mt-1">Select a client to load events.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5 flex gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Failed to load events</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Table card */}
      {canQuery && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <EventListTable
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
