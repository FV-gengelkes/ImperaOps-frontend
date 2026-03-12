"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp, Activity, Loader2, Building2, CheckSquare2, Square, Calendar, Lightbulb, AlertTriangle as AlertTriangleIcon, AlertCircle, Info, Clock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useClientId } from "@/components/client-id-context";
import { adminGetClients, getEventAnalytics, getInsightSummary } from "@/lib/api";
import type { ClientAccessDto, EventAnalyticsDto, InsightSummaryDto } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { useTheme } from "@/components/theme-context";
import { MyTasksCard } from "./my-tasks-card";
import { WorkloadCard } from "./workload-card";
import type { MonthlyDataPoint } from "./mock-data";

// ── Date range ─────────────────────────────────────────────────────

type RangeKey = "30d" | "3m" | "6m" | "12m" | "ytd" | "all";

interface RangeOption {
  key: RangeKey;
  label: string;
  getFrom: () => string | undefined;
  getTo:   () => string | undefined;
  subtitle: string;
}

function toIso(d: Date) { return d.toISOString().slice(0, 10); }

const RANGES: RangeOption[] = [
  {
    key: "30d", label: "30D", subtitle: "Last 30 days",
    getFrom: () => { const d = new Date(); d.setDate(d.getDate() - 30); return toIso(d); },
    getTo:   () => toIso(new Date()),
  },
  {
    key: "3m", label: "3M", subtitle: "Last 3 months",
    getFrom: () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return toIso(d); },
    getTo:   () => toIso(new Date()),
  },
  {
    key: "6m", label: "6M", subtitle: "Last 6 months",
    getFrom: () => { const d = new Date(); d.setMonth(d.getMonth() - 6); return toIso(d); },
    getTo:   () => toIso(new Date()),
  },
  {
    key: "12m", label: "12M", subtitle: "Last 12 months",
    getFrom: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return toIso(d); },
    getTo:   () => toIso(new Date()),
  },
  {
    key: "ytd", label: "YTD", subtitle: `Year to date (${new Date().getFullYear()})`,
    getFrom: () => `${new Date().getFullYear()}-01-01`,
    getTo:   () => toIso(new Date()),
  },
  {
    key: "all", label: "All", subtitle: "All time",
    getFrom: () => undefined,
    getTo:   () => undefined,
  },
];

// ── Constants ─────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CHART_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#8b5cf6",
  "#6366f1", "#10b981", "#0ea5e9", "#14b8a6",
  "#2F80ED", "#ec4899",
];

// ── Data transforms ───────────────────────────────────────────────

function buildMonthlyData(raw: EventAnalyticsDto["byMonth"]): MonthlyDataPoint[] {
  const map = new Map<string, { year: number; month: number; total: number }>();
  for (const r of raw) {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    const existing = map.get(key);
    if (existing) {
      existing.total += r.count;
    } else {
      map.set(key, { year: r.year, month: r.month, total: r.count });
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      month: `${MONTH_NAMES[v.month - 1]} '${String(v.year).slice(2)}`,
      total: v.total,
    }));
}

// ── Tooltip ───────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-3 text-xs border border-slate-700/60 pointer-events-none min-w-[160px]">
      {label && <p className="font-semibold text-slate-200 mb-2 pb-2 border-b border-slate-700">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color ?? p.fill }} />
            <span className="text-slate-400 flex-1">{p.name}</span>
            <span className="font-semibold tabular-nums">{p.value}</span>
          </div>
        ))}
        {payload.length > 1 && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-700 mt-1">
            <span className="w-2 h-2 shrink-0" />
            <span className="text-slate-300 flex-1 font-medium">Total</span>
            <span className="font-bold tabular-nums">{total}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  goodWhenDown?: boolean;
  href?: string;
}

function KpiCard({ title, value, unit, change, changeLabel, goodWhenDown, href }: KpiCardProps) {
  const showTrend = change !== undefined && changeLabel !== undefined;
  const isUp = (change ?? 0) >= 0;
  const isGood = goodWhenDown ? !isUp : isUp;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;
  const trendClasses = isGood
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-red-600 bg-red-50 border-red-200";

  const Tag = href ? "a" : "div";

  return (
    <Tag href={href} className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-steel-white leading-none tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span className="text-base font-medium text-slate-400 ml-1.5">{unit}</span>}
      </p>
      {showTrend && (
        <span className={`inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full border text-[11px] font-semibold ${trendClasses}`}>
          <TrendIcon size={10} />
          {Math.abs(change!).toFixed(1)}% {changeLabel}
        </span>
      )}
    </Tag>
  );
}

// ── SLA Breached card ─────────────────────────────────────────────

function SlaBreachedCard({ count }: { count: number }) {
  const hasBreach = count > 0;
  return (
    <a
      href="/events/list?slaBreached=true"
      className={`rounded-2xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200 ${
        hasBreach
          ? "bg-red-50 dark:bg-critical/10 border-red-200 dark:border-critical/30"
          : "bg-white dark:bg-graphite border-slate-200 dark:border-slate-line"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Clock size={12} className={hasBreach ? "text-critical" : "text-slate-400"} />
        <p className={`text-[11px] font-semibold uppercase tracking-widest ${
          hasBreach ? "text-critical" : "text-slate-400 dark:text-slate-500"
        }`}>
          Past SLA
        </p>
      </div>
      <p className={`text-3xl font-extrabold leading-none tabular-nums ${
        hasBreach ? "text-critical" : "text-slate-900 dark:text-steel-white"
      }`}>
        {count}
      </p>
      {hasBreach && (
        <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full border text-[11px] font-semibold text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40">
          <AlertTriangleIcon size={10} />
          overdue
        </span>
      )}
    </a>
  );
}

// ── Chart card ────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5 flex flex-col gap-4 ${className}`}>
      <div>
        <p className="font-semibold text-slate-800 dark:text-steel-white">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Empty / Error overlays ────────────────────────────────────────

function EmptyDashboard() {
  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-12 text-center">
      <div className="w-14 h-14 bg-slate-100 dark:bg-midnight rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Activity size={24} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-steel-white">No event data yet</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
        Create your first event to start seeing analytics here. Your dashboard will populate with trends, breakdowns, and insights as data comes in.
      </p>
      <a href="/events/list" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
        Go to Events
      </a>
    </div>
  );
}

function ErrorOverlay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-red-200 dark:border-red-800/40 shadow-sm p-12 text-center">
      <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertTriangleIcon size={24} className="text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-steel-white">Unable to load dashboard</h3>
      <p className="text-sm text-red-600 dark:text-red-400 mt-2 max-w-md mx-auto">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}

function NoClientSelected() {
  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-12 text-center">
      <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Building2 size={24} className="text-brand" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-steel-white">Select a client</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
        Choose a client from the sidebar to view their dashboard analytics.
      </p>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const { clientId }              = useClientId();
  const { clients, isSuperAdmin } = useAuth();
  const { theme }                 = useTheme();
  const router                    = useRouter();
  const [analytics, setAnalytics] = useState<EventAnalyticsDto | null>(null);
  const [fetching, setFetching]   = useState(false);
  const [fetchErr, setFetchErr]   = useState("");
  const [available, setAvailable] = useState<ClientAccessDto[]>([]);
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [rangeKey, setRangeKey]   = useState<RangeKey>("12m");
  const [insightSummary, setInsightSummary] = useState<InsightSummaryDto | null>(null);
  const [retryCount, setRetryCount]       = useState(0);

  const activeRange = RANGES.find(r => r.key === rangeKey)!;
  const hasClient = clientId > 0;
  const isLive    = !!analytics;

  // Build the list of clients the user can toggle — scoped to current client + children
  useEffect(() => {
    if (!hasClient) { setAvailable([]); return; }

    if (isSuperAdmin) {
      adminGetClients()
        .then(dtos => {
          const all: ClientAccessDto[] = dtos
            .filter(c => c.status !== "Inactive")
            .map(c => ({ id: c.id, name: c.name, role: "Admin", parentClientId: c.parentClientId }));
          // Show current client + its children (if it's a parent)
          const current = all.find(c => c.id === clientId);
          const isParent = current && !current.parentClientId;
          const scoped = isParent
            ? all.filter(c => c.id === clientId || c.parentClientId === clientId)
            : [current ?? { id: clientId, name: "Unknown", role: "Admin", parentClientId: null }];
          setAvailable(scoped);
        })
        .catch(() => setAvailable(clients.filter(c => c.id === clientId)));
    } else {
      // Non-super-admin: show current client + siblings under same parent
      const current = clients.find(c => c.id === clientId);
      if (current?.parentClientId) {
        setAvailable(clients.filter(c => c.parentClientId === current.parentClientId || c.id === current.parentClientId));
      } else {
        setAvailable(clients.filter(c => c.id === clientId || c.parentClientId === clientId));
      }
    }
  }, [hasClient, clientId, isSuperAdmin, clients]);

  // When the active client changes, reset selection to just that client
  useEffect(() => {
    if (clientId > 0) setSelected(new Set([clientId]));
  }, [clientId]);

  // Fetch insights summary
  useEffect(() => {
    if (!hasClient) return;
    getInsightSummary(clientId).then(setInsightSummary).catch(() => {});
  }, [hasClient, clientId]);

  function toggleClient(id: number) {
    setSelected(prev => {
      if (prev.has(id) && prev.size === 1) return prev;
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(available.map(c => c.id)));
  }

  // Fetch analytics whenever the selection or date range changes
  useEffect(() => {
    if (!hasClient || selected.size === 0) { setAnalytics(null); return; }
    setFetching(true);
    setFetchErr("");
    getEventAnalytics([...selected], activeRange.getFrom(), activeRange.getTo())
      .then(setAnalytics)
      .catch((e) => setFetchErr(e?.message ?? "Failed to load analytics."))
      .finally(() => setFetching(false));
  }, [hasClient, selected, rangeKey, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build chart-ready data (only when live)
  const monthly     = isLive ? buildMonthlyData(analytics!.byMonth) : [];
  const avgPerMonth = monthly.length > 0
    ? Math.round(monthly.reduce((s, d) => s + d.total, 0) / monthly.length)
    : 0;

  // Merge duplicate names (e.g. same event type across clients) by summing counts
  function mergeByName<T extends Record<string, any>>(items: T[], nameKey: keyof T, idKey?: keyof T) {
    const map = new Map<string, { count: number; id?: number }>();
    for (const item of items) {
      const name = String(item[nameKey]);
      const existing = map.get(name);
      if (existing) {
        existing.count += item.count;
      } else {
        map.set(name, { count: item.count, id: idKey ? item[idKey] : undefined });
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, { count, id }], i) => ({ name, value: count, color: CHART_PALETTE[i % CHART_PALETTE.length], id }));
  }

  const chartTypeData = isLive
    ? mergeByName(analytics!.byType, "eventTypeName", "eventTypeId")
    : [];

  const chartStatusData = isLive
    ? [
        { name: "Open",   value: analytics!.open,   color: "#2F80ED" },
        { name: "Closed", value: analytics!.closed,  color: "#16A34A" },
      ]
    : [];

  const chartLocationData = isLive
    ? mergeByName(analytics!.topLocations, "location").slice(0, 8).map(d => ({ location: d.name, count: d.value }))
    : [];

  const thisMonthTrend = isLive && analytics!.lastMonth !== 0
    ? ((analytics!.thisMonth - analytics!.lastMonth) / analytics!.lastMonth) * 100
    : undefined;

  const total = isLive ? analytics!.total : 0;
  const isEmpty = isLive && analytics!.total === 0;

  const gridStroke = theme === "dark" ? "#334155" : "#f1f5f9";
  const tickFill   = "#94a3b8";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/20">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-steel-white leading-tight">Dashboard</h1>
              {fetching && <Loader2 size={16} className="text-slate-400 animate-spin" />}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isLive ? `Event analytics · ${activeRange.subtitle}` : "Select a client to view analytics"}
            </p>
          </div>
        </div>

        {/* Date range picker */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-graphite rounded-xl p-1 shrink-0">
          <Calendar size={13} className="text-slate-400 ml-1.5" />
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                rangeKey === r.key
                  ? "bg-white dark:bg-midnight text-slate-900 dark:text-steel-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client selector */}
      {available.length > 1 && (
        <div className="bg-white dark:bg-graphite rounded-xl border border-slate-200 dark:border-slate-line shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            <Building2 size={13} />
            Clients
          </div>
          {available.map(c => {
            const on = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleClient(c.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  on
                    ? "bg-brand text-brand-text border-brand shadow-sm"
                    : "bg-white dark:bg-midnight text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-line hover:border-brand/40 hover:text-brand"
                }`}
              >
                {on ? <CheckSquare2 size={13} /> : <Square size={13} />}
                {c.name}
              </button>
            );
          })}
          {selected.size < available.length && (
            <button
              onClick={selectAll}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-brand-link hover:bg-brand/5 transition-colors"
            >
              Select all
            </button>
          )}
          {selected.size > 1 && (
            <span className="ml-auto text-xs text-slate-400">
              Showing combined data for {selected.size} clients
            </span>
          )}
        </div>
      )}

      {/* Error state */}
      {fetchErr && !fetching && <ErrorOverlay message={fetchErr} onRetry={() => setRetryCount(c => c + 1)} />}

      {/* No client selected */}
      {!hasClient && !fetching && !fetchErr && <NoClientSelected />}

      {/* Empty state — client selected but no events */}
      {isEmpty && !fetching && !fetchErr && <EmptyDashboard />}

      {/* KPI Cards — only when live data is available */}
      {isLive && !isEmpty && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {(() => {
            const now = new Date();
            const thisMonthFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const thisMonthTo = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-${String(nextMonth.getDate()).padStart(2, "0")}`;
            return (<>
              <KpiCard title="Total Events" value={analytics!.total} href="/events/list" />
              <KpiCard title="Open" value={analytics!.open} goodWhenDown href="/events/list?isClosed=false" />
              <KpiCard
                title="This Month"
                value={analytics!.thisMonth}
                change={thisMonthTrend}
                changeLabel="vs last month"
                goodWhenDown
                href={`/events/list?dateFrom=${thisMonthFrom}&dateTo=${thisMonthTo}`}
              />
              <KpiCard title="Closed" value={analytics!.closed} href="/events/list?isClosed=true" />
            </>);
          })()}
          <SlaBreachedCard count={analytics!.slaBreachedCount} />
        </div>
      )}

      {/* My Tasks + Workload */}
      {hasClient && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MyTasksCard clientId={clientId} />
          <WorkloadCard clientId={clientId} />
        </div>
      )}

      {/* Insights Summary */}
      {hasClient && insightSummary && insightSummary.total > 0 && (
        <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-warning" />
              <h3 className="font-semibold text-slate-800 dark:text-steel-white">Insights</h3>
              <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-semibold">{insightSummary.total} unread</span>
            </div>
            <a href="/insights" className="text-xs font-semibold text-brand hover:text-brand-hover transition">View all</a>
          </div>
          <div className="flex items-center gap-3 mb-3">
            {insightSummary.critical > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-critical"><AlertTriangleIcon size={11} /> {insightSummary.critical} critical</span>
            )}
            {insightSummary.warning > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning"><AlertCircle size={11} /> {insightSummary.warning} warning</span>
            )}
            {insightSummary.info > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-info"><Info size={11} /> {insightSummary.info} info</span>
            )}
          </div>
          {insightSummary.recent.length > 0 && (
            <div className="space-y-2">
              {insightSummary.recent.map(a => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    a.severity === "critical" ? "bg-critical" : a.severity === "warning" ? "bg-warning" : "bg-info"
                  }`} />
                  <span className="text-slate-700 dark:text-slate-300 truncate">{a.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trend + Donut — only when live data with events */}
      {isLive && !isEmpty && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Event Trend"
          subtitle={`Total events · ${isLive ? activeRange.subtitle : "12-month rolling"}`}
          className="lg:col-span-2"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} className="cursor-pointer"
                onClick={(state: any) => {
                  if (!state?.activePayload?.length) return;
                  const pt = state.activePayload[0]?.payload;
                  if (!pt?.month) return;
                  const parts = pt.month.split(" '");
                  const mi = MONTH_NAMES.indexOf(parts[0]);
                  const yr = parts[1] ? 2000 + parseInt(parts[1]) : undefined;
                  if (mi < 0 || !yr || isNaN(yr)) return;
                  const from = `${yr}-${String(mi + 1).padStart(2, "0")}-01`;
                  const last = new Date(yr, mi + 1, 0);
                  const to = `${yr}-${String(mi + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
                  router.push(`/events/list?dateFrom=${from}&dateTo=${to}`);
                }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                {avgPerMonth > 0 && (
                  <ReferenceLine y={avgPerMonth} stroke="#cbd5e1" strokeDasharray="4 3"
                    label={{ value: `avg ${avgPerMonth}`, position: "insideTopRight", fontSize: 10, fill: "#94a3b8", dy: -6 }} />
                )}
                <Area type="monotone" dataKey="total" name="Events" stroke="#2F80ED" fill="#2F80ED" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="By Event Type" subtitle="All-time distribution">
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartTypeData} cx="50%" cy="50%" innerRadius={58} outerRadius={88}
                  paddingAngle={3} dataKey="value" strokeWidth={0} className="cursor-pointer"
                  onClick={(data: any) => {
                    if (!data?.name) return;
                    const d = chartTypeData.find(t => t.name === data.name);
                    if (!d) return;
                    if (d.id) router.push(`/events/list?eventTypeId=${d.id}`);
                    else router.push(`/events/list?search=${encodeURIComponent(d.name)}`);
                  }}>
                  {chartTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-steel-white leading-none">{total.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">total</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {chartTypeData.map((d, i) => (
              <div key={i}
                onClick={() => {
                  if (d.id) router.push(`/events/list?eventTypeId=${d.id}`);
                  else router.push(`/events/list?search=${encodeURIComponent(d.name)}`);
                }}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-midnight/50 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                <span className="text-slate-600 dark:text-slate-400 flex-1">{d.name}</span>
                <span className="font-semibold text-slate-800 dark:text-steel-white tabular-nums">{d.value}</span>
                <span className="text-slate-400 tabular-nums w-7 text-right">
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>}

      {/* SLA / Resolution insight cards — only shown when analytics has them */}
      {isLive && (analytics!.slaClosureComplianceRate !== null || analytics!.avgResolutionDays !== null) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {analytics!.slaClosureComplianceRate !== null && (
            <KpiCard
              title="SLA Closure Compliance"
              value={`${Math.round(analytics!.slaClosureComplianceRate! * 100)}`}
              unit="%"
            />
          )}
          {analytics!.avgResolutionDays !== null && (
            <KpiCard
              title="Avg Resolution Time"
              value={analytics!.avgResolutionDays!.toFixed(1)}
              unit="days"
            />
          )}
        </div>
      )}

      {/* Status + Locations — only when live data with events */}
      {isLive && !isEmpty && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Status Breakdown" subtitle="Current event resolution state">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartStatusData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                <XAxis type="number" tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12, fill: tickFill }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" name="Events" radius={[0, 5, 5, 0]} className="cursor-pointer"
                  onClick={(data: any) => {
                    if (!data?.name) return;
                    router.push(`/events/list?isClosed=${data.name === "Closed" ? "true" : "false"}`);
                  }}>
                  {chartStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {chartStatusData.map((d, i) => (
              <div key={i}
                onClick={() => router.push(`/events/list?isClosed=${d.name === "Closed" ? "true" : "false"}`)}
                className="rounded-xl p-3 text-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: `${d.color}18` }}>
                <p className="text-xl font-extrabold tabular-nums" style={{ color: d.color }}>{d.value}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold leading-tight">{d.name}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Top Event Locations" subtitle="By count · top 8 locations">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartLocationData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                <XAxis type="number" tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="location" width={155} tick={{ fontSize: 10.5, fill: tickFill }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" name="Events" fill="#2F80ED" radius={[0, 5, 5, 0]} className="cursor-pointer"
                  onClick={(data: any) => {
                    if (data?.location) router.push(`/events/list?search=${encodeURIComponent(data.location)}`);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>}

      {/* Root Cause Distribution — only shown when root cause data is available */}
      {isLive && analytics!.byRootCause.length > 0 && (() => {
        const rcData = mergeByName(analytics!.byRootCause, "name");
        const rcTotal = rcData.reduce((s, d) => s + d.value, 0);
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Root Cause Distribution" subtitle="Investigation findings breakdown">
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rcData} cx="50%" cy="50%" innerRadius={58} outerRadius={88}
                      paddingAngle={3} dataKey="value" strokeWidth={0} className="cursor-pointer"
                      onClick={(data: any) => {
                        if (data?.name) router.push(`/events/list?search=${encodeURIComponent(data.name)}`);
                      }}>
                      {rcData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-steel-white leading-none">{rcTotal}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">attributed</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {rcData.map((d, i) => (
                  <div key={i}
                    onClick={() => router.push(`/events/list?search=${encodeURIComponent(d.name)}`)}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-midnight/50 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600 dark:text-slate-400 flex-1">{d.name}</span>
                    <span className="font-semibold text-slate-800 dark:text-steel-white tabular-nums">{d.value}</span>
                    <span className="text-slate-400 tabular-nums w-7 text-right">
                      {rcTotal > 0 ? Math.round((d.value / rcTotal) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        );
      })()}
    </div>
  );
}
