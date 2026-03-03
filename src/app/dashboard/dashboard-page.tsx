"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp, Activity, Loader2, Building2, CheckSquare2, Square } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { adminGetClients, getIncidentAnalytics } from "@/lib/api";
import type { ClientAccessDto, IncidentAnalyticsDto } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { monthlyData as mockMonthly, typeData as mockType, statusData as mockStatus, locationData as mockLocation, kpi as mockKpi } from "./mock-data";
import type { MonthlyDataPoint } from "./mock-data";

// ── Constants ─────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TYPE_META = [
  { key: "nearMiss",        label: "Near Miss",        color: "#f59e0b" },
  { key: "propertyDamage",  label: "Property Damage",  color: "#8b5cf6" },
  { key: "safetyViolation", label: "Safety Violation", color: "#6366f1" },
  { key: "injury",          label: "Injury",           color: "#f97316" },
  { key: "accident",        label: "Accident",         color: "#ef4444" },
] as const;

const TYPE_COLOR: Record<number, string> = { 1: "#ef4444", 2: "#f97316", 3: "#f59e0b", 4: "#8b5cf6", 5: "#6366f1" };
const TYPE_NAME:  Record<number, string> = { 1: "Accident", 2: "Injury", 3: "Near Miss", 4: "Property Damage", 5: "Safety Violation" };

// ── Data transforms ───────────────────────────────────────────────

function buildMonthlyData(raw: IncidentAnalyticsDto["byMonth"]): MonthlyDataPoint[] {
  const keys = [...new Set(raw.map((r) => `${r.year}-${String(r.month).padStart(2, "0")}`))]
    .sort()
    .map((k) => { const [y, m] = k.split("-").map(Number); return { year: y, month: m }; });

  return keys.map(({ year, month }) => {
    const rows = raw.filter((r) => r.year === year && r.month === month);
    return {
      month: `${MONTH_NAMES[month - 1]} '${String(year).slice(2)}`,
      accident:        rows.find((r) => r.type === 1)?.count ?? 0,
      injury:          rows.find((r) => r.type === 2)?.count ?? 0,
      nearMiss:        rows.find((r) => r.type === 3)?.count ?? 0,
      propertyDamage:  rows.find((r) => r.type === 4)?.count ?? 0,
      safetyViolation: rows.find((r) => r.type === 5)?.count ?? 0,
    };
  });
}

type LocationStackPoint = {
  location: string;
  accident: number;
  injury: number;
  nearMiss: number;
  propertyDamage: number;
  safetyViolation: number;
};

function buildLocationStackData(raw: IncidentAnalyticsDto["byLocationAndType"]): LocationStackPoint[] {
  const locations = [...new Map(raw.map(r => [r.location, true])).keys()];
  return locations.map(location => {
    const rows = raw.filter(r => r.location === location);
    return {
      location,
      accident:        rows.find(r => r.type === 1)?.count ?? 0,
      injury:          rows.find(r => r.type === 2)?.count ?? 0,
      nearMiss:        rows.find(r => r.type === 3)?.count ?? 0,
      propertyDamage:  rows.find(r => r.type === 4)?.count ?? 0,
      safetyViolation: rows.find(r => r.type === 5)?.count ?? 0,
    };
  });
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-extrabold text-slate-900 leading-none tabular-nums">
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

function ChartCard({ title, subtitle, children, className = "", action }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string; action?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const { clientId }                  = useClientId();
  const { clients, isSuperAdmin }     = useAuth();
  const [analytics, setAnalytics]     = useState<IncidentAnalyticsDto | null>(null);
  const [fetching,  setFetching]      = useState(false);
  const [fetchErr,  setFetchErr]      = useState("");
  const [available, setAvailable]     = useState<ClientAccessDto[]>([]);
  const [selected,  setSelected]      = useState<Set<string>>(new Set());
  const [trendMode, setTrendMode]     = useState<"stacked" | "lines">("stacked");

  const hasClient = clientId.trim().length > 0;
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

  // When the active client or available list changes, reset selection to just the active client
  useEffect(() => {
    if (clientId.trim()) setSelected(new Set([clientId.trim()]));
  }, [clientId]);

  function toggleClient(id: string) {
    setSelected(prev => {
      if (prev.has(id) && prev.size === 1) return prev; // keep at least one
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(available.map(c => c.id)));
  }

  // Fetch analytics whenever the selection changes
  useEffect(() => {
    if (!hasClient || selected.size === 0) { setAnalytics(null); return; }
    setFetching(true);
    setFetchErr("");
    getIncidentAnalytics([...selected])
      .then(setAnalytics)
      .catch((e) => setFetchErr(e?.message ?? "Failed to load analytics."))
      .finally(() => setFetching(false));
  }, [hasClient, selected]);

  // Build chart-ready data from either live analytics or mock fallback
  const monthly     = isLive ? buildMonthlyData(analytics!.byMonth) : mockMonthly;
  const avgPerMonth = monthly.length > 0
    ? Math.round(monthly.reduce((s, d) => s + d.accident + d.injury + d.nearMiss + d.propertyDamage + d.safetyViolation, 0) / monthly.length)
    : 0;

  const chartTypeData = isLive
    ? analytics!.byType.map((t) => ({ name: TYPE_NAME[t.type] ?? `Type ${t.type}`, value: t.count, color: TYPE_COLOR[t.type] ?? "#94a3b8" }))
    : mockType;

  const chartStatusData = isLive
    ? [
        { name: "Open",        value: analytics!.open,        color: "#3b82f6" },
        { name: "In Progress", value: analytics!.inProgress,  color: "#f59e0b" },
        { name: "Blocked",     value: analytics!.blocked,     color: "#ef4444" },
        { name: "Closed",      value: analytics!.closed,      color: "#10b981" },
      ]
    : mockStatus;

  const chartLocationStackData: LocationStackPoint[] = isLive
    ? buildLocationStackData(analytics!.byLocationAndType)
    : mockLocation.slice(0, 8).map(l => ({
        location: l.location,
        accident:        Math.round(l.count * 0.26),
        injury:          Math.round(l.count * 0.11),
        nearMiss:        Math.round(l.count * 0.36),
        propertyDamage:  Math.round(l.count * 0.17),
        safetyViolation: Math.round(l.count * 0.10),
      }));

  const thisMonthTrend: number | undefined = (() => {
    if (!isLive) return undefined;
    const last = analytics!.lastMonth;
    if (last === 0) return undefined;
    return ((analytics!.thisMonth - last) / last) * 100;
  })();

  const total = isLive ? analytics!.total : mockKpi.total;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">Dashboard</h1>
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
            <p className="text-sm text-slate-500 mt-0.5">
              {isLive ? "Incident analytics · Last 12 months" : "Set a Client ID above to see live data"}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400 pt-1 shrink-0">
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Client selector — only shown when multiple clients are available */}
      {available.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
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
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
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
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
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
        <KpiCard title="Total Incidents" value={isLive ? analytics!.total : mockKpi.total}
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
        <KpiCard title="Closed" value={isLive ? analytics!.closed : mockKpi.total - mockKpi.open - 47 - 23} />
      </div>

      {/* Trend + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Incident Trend"
          subtitle={trendMode === "stacked" ? "Stacked by type · 12-month rolling" : "Per type · 12-month rolling"}
          className="lg:col-span-2"
          action={
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
              {(["stacked", "lines"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setTrendMode(mode)}
                  className={`px-2.5 py-1 rounded-md transition-colors capitalize ${
                    trendMode === mode
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {trendMode === "stacked" ? (
                <AreaChart data={monthly} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  {avgPerMonth > 0 && (
                    <ReferenceLine y={avgPerMonth} stroke="#cbd5e1" strokeDasharray="4 3"
                      label={{ value: `avg ${avgPerMonth}`, position: "insideTopRight", fontSize: 10, fill: "#94a3b8", dy: -6 }} />
                  )}
                  {TYPE_META.map(({ key, label, color }) => (
                    <Area key={key} type="monotone" dataKey={key} name={label} stackId="1"
                      stroke={color} fill={color} fillOpacity={0.82} strokeWidth={1} />
                  ))}
                </AreaChart>
              ) : (
                <LineChart data={monthly} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  {avgPerMonth > 0 && (
                    <ReferenceLine y={avgPerMonth} stroke="#cbd5e1" strokeDasharray="4 3"
                      label={{ value: `avg ${avgPerMonth}`, position: "insideTopRight", fontSize: 10, fill: "#94a3b8", dy: -6 }} />
                  )}
                  {TYPE_META.map(({ key, label, color }) => (
                    <Line key={key} type="monotone" dataKey={key} name={label}
                      stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {TYPE_META.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="By Incident Type" subtitle="All-time distribution">
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
                <p className="text-2xl font-extrabold text-slate-900 leading-none">{total.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">total</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {chartTypeData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                <span className="text-slate-600 flex-1">{d.name}</span>
                <span className="font-semibold text-slate-800 tabular-nums">{d.value}</span>
                <span className="text-slate-400 tabular-nums w-7 text-right">
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Status + Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Status Breakdown" subtitle="Current incident resolution state">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartStatusData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={84} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" name="Incidents" radius={[0, 5, 5, 0]}>
                  {chartStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {chartStatusData.map((d) => (
              <div key={d.name} className="rounded-xl p-3 text-center" style={{ background: `${d.color}18` }}>
                <p className="text-xl font-extrabold tabular-nums" style={{ color: d.color }}>{d.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-semibold leading-tight">{d.name}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Top Incident Locations" subtitle="By type · top 8 locations">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartLocationStackData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="location" width={155} tick={{ fontSize: 10.5, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                {TYPE_META.map(({ key, label, color }, idx) => (
                  <Bar key={key} dataKey={key} name={label} stackId="loc" fill={color}
                    radius={idx === TYPE_META.length - 1 ? [0, 5, 5, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {TYPE_META.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
