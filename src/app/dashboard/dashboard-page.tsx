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
import { TrendingDown, TrendingUp, Activity, Loader2, Building2, CheckSquare2, Square, Calendar } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { adminGetClients, getEventAnalytics } from "@/lib/api";
import type { ClientAccessDto, EventAnalyticsDto } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { useTheme } from "@/components/theme-context";
import { MyTasksCard } from "./my-tasks-card";
import { WorkloadCard } from "./workload-card";
import { monthlyData as mockMonthly, typeData as mockType, statusData as mockStatus, locationData as mockLocation, kpi as mockKpi } from "./mock-data";
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
}

function KpiCard({ title, value, unit, change, changeLabel, goodWhenDown }: KpiCardProps) {
  const showTrend = change !== undefined && changeLabel !== undefined;
  const isUp = (change ?? 0) >= 0;
  const isGood = goodWhenDown ? !isUp : isUp;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;
  const trendClasses = isGood
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
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
    </div>
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

// ── Dashboard ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const { clientId }              = useClientId();
  const { clients, isSuperAdmin } = useAuth();
  const { theme }                 = useTheme();
  const [analytics, setAnalytics] = useState<EventAnalyticsDto | null>(null);
  const [fetching, setFetching]   = useState(false);
  const [fetchErr, setFetchErr]   = useState("");
  const [available, setAvailable] = useState<ClientAccessDto[]>([]);
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [rangeKey, setRangeKey]   = useState<RangeKey>("12m");

  const activeRange = RANGES.find(r => r.key === rangeKey)!;
  const hasClient = clientId > 0;
  const isLive    = !!analytics;

  // Build the list of clients the user can toggle
  useEffect(() => {
    if (!hasClient) { setAvailable([]); return; }

    if (isSuperAdmin) {
      adminGetClients()
        .then(dtos => {
          const mapped: ClientAccessDto[] = dtos
            .filter(c => c.isActive)
            .map(c => ({ id: c.id, name: c.name, role: "Admin", parentClientId: c.parentClientId }));
          setAvailable(mapped);
        })
        .catch(() => setAvailable(clients));
    } else {
      setAvailable(clients);
    }
  }, [hasClient, isSuperAdmin, clients]);

  // When the active client changes, reset selection to just that client
  useEffect(() => {
    if (clientId > 0) setSelected(new Set([clientId]));
  }, [clientId]);

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
  }, [hasClient, selected, rangeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build chart-ready data
  const monthly     = isLive ? buildMonthlyData(analytics!.byMonth) : mockMonthly;
  const avgPerMonth = monthly.length > 0
    ? Math.round(monthly.reduce((s, d) => s + d.total, 0) / monthly.length)
    : 0;

  const chartTypeData = isLive
    ? analytics!.byType.map((t, i) => ({
        name: t.eventTypeName,
        value: t.count,
        color: CHART_PALETTE[i % CHART_PALETTE.length],
      }))
    : mockType;

  const chartStatusData = isLive
    ? [
        { name: "Open",   value: analytics!.open,   color: "#2F80ED" },
        { name: "Closed", value: analytics!.closed,  color: "#16A34A" },
      ]
    : mockStatus;

  const chartLocationData = isLive
    ? analytics!.topLocations.slice(0, 8)
    : mockLocation;

  const thisMonthTrend = isLive && analytics!.lastMonth !== 0
    ? ((analytics!.thisMonth - analytics!.lastMonth) / analytics!.lastMonth) * 100
    : undefined;

  const total = isLive ? analytics!.total : mockKpi.total;

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
              {!fetching && !isLive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                  Demo Data
                </span>
              )}
              {!fetching && isLive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isLive ? `Event analytics · ${activeRange.subtitle}` : "Set a Client ID above to see live data"}
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

      {/* Fetch error */}
      {fetchErr && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Failed to load analytics: {fetchErr}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Events" value={isLive ? analytics!.total : mockKpi.total}
          change={isLive ? undefined : mockKpi.totalChange} changeLabel={isLive ? undefined : "vs prior period"} />
        <KpiCard title="Open" value={isLive ? analytics!.open : mockKpi.open}
          change={isLive ? undefined : mockKpi.openChange} changeLabel={isLive ? undefined : "vs prior period"} goodWhenDown />
        <KpiCard
          title="This Month"
          value={isLive ? analytics!.thisMonth : mockKpi.thisMonth}
          change={isLive ? thisMonthTrend : mockKpi.thisMonthChange}
          changeLabel="vs last month"
          goodWhenDown
        />
        <KpiCard title="Closed" value={isLive ? analytics!.closed : mockKpi.total - mockKpi.open} />
      </div>

      {/* My Tasks + Workload */}
      {hasClient && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MyTasksCard clientId={clientId} />
          <WorkloadCard clientId={clientId} />
        </div>
      )}

      {/* Trend + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Event Trend"
          subtitle={`Total events · ${isLive ? activeRange.subtitle : "12-month rolling"}`}
          className="lg:col-span-2"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
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
                  paddingAngle={3} dataKey="value" strokeWidth={0}>
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
            {chartTypeData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
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
      </div>

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

      {/* Status + Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Status Breakdown" subtitle="Current event resolution state">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartStatusData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                <XAxis type="number" tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12, fill: tickFill }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" name="Events" radius={[0, 5, 5, 0]}>
                  {chartStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {chartStatusData.map((d) => (
              <div key={d.name} className="rounded-xl p-3 text-center" style={{ background: `${d.color}18` }}>
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
                <Bar dataKey="count" name="Events" fill="#2F80ED" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Root Cause Distribution — only shown when root cause data is available */}
      {isLive && analytics!.byRootCause.length > 0 && (() => {
        const rcData = analytics!.byRootCause.map((rc, i) => ({
          name: rc.name,
          value: rc.count,
          color: CHART_PALETTE[i % CHART_PALETTE.length],
        }));
        const rcTotal = rcData.reduce((s, d) => s + d.value, 0);
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Root Cause Distribution" subtitle="Investigation findings breakdown">
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rcData} cx="50%" cy="50%" innerRadius={58} outerRadius={88}
                      paddingAngle={3} dataKey="value" strokeWidth={0}>
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
                {rcData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
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
