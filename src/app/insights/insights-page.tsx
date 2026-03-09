"use client";

import { useEffect, useState } from "react";
import { Lightbulb, AlertTriangle, AlertCircle, Info, CheckCircle2, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useToast } from "@/components/toast-context";
import { getInsights, acknowledgeInsight, aiAnalyzeTrends } from "@/lib/api";
import type { InsightAlertDto } from "@/lib/types";

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; bg: string; border: string; text: string; dot: string }> = {
  critical: { icon: AlertTriangle, bg: "bg-critical/5", border: "border-critical/20", text: "text-critical", dot: "bg-critical" },
  warning:  { icon: AlertCircle,   bg: "bg-warning/5",  border: "border-warning/20",  text: "text-warning",  dot: "bg-warning" },
  info:     { icon: Info,          bg: "bg-info/5",     border: "border-info/20",     text: "text-info",     dot: "bg-info" },
};

const TYPE_LABELS: Record<string, string> = {
  spike: "Event Spike",
  location_hotspot: "Location Hotspot",
  recurring_person: "Recurring Person",
  recurring_location: "Recurring Location",
  overdue: "SLA Overdue",
  trend: "Trend",
  pattern: "Pattern",
  positive: "Improvement",
};

function buildInsightLink(alert: InsightAlertDto): string | null {
  const t = alert.title;
  switch (alert.alertType) {
    case "overdue":
      return "/events/list?slaBreached=true";
    case "location_hotspot": {
      // Real: "{Location} incidents up — {count} in 30 days"
      const locMatch = t.match(/^(.+?) incidents/);
      const search = locMatch?.[1];
      return search ? `/events/list?search=${encodeURIComponent(search)}` : "/events/list";
    }
    case "recurring_location":
    case "pattern": {
      // Real: "{Type} recurring at {Location} ({count} in 30 days)"
      // Demo: "Recurring pattern: {type} at {location}"
      const atMatch = t.match(/at (.+?)(?:\s*\(|\s*$)/);
      const search = atMatch?.[1];
      return search ? `/events/list?search=${encodeURIComponent(search)}` : "/events/list";
    }
    case "spike": {
      // Real: "{Type} events up {pct}% this week"
      // Demo: "Event spike detected in {location}"
      const detectedIn = t.match(/detected in (.+?)$/);
      const eventsUp = t.match(/^(.+?) events/);
      const search = detectedIn?.[1] ?? eventsUp?.[1];
      return search ? `/events/list?search=${encodeURIComponent(search)}` : "/events/list";
    }
    case "trend": {
      // Demo: "{type} events trending upward"
      const typeMatch = t.match(/^(.+?) events/);
      const search = typeMatch?.[1];
      return search ? `/events/list?search=${encodeURIComponent(search)}` : "/events/list";
    }
    case "positive": {
      // Demo: "Improvement: {type} events down {pct}%"
      const impMatch = t.match(/Improvement:\s*(.+?) events/);
      const search = impMatch?.[1];
      return search ? `/events/list?search=${encodeURIComponent(search)}` : "/events/list";
    }
    case "recurring_person": {
      // Real: "Recurring reporter: {Name} ({count} events in 90 days)"
      const nameMatch = t.match(/Recurring reporter: (.+?)(?:\s*\(|$)/);
      const search = nameMatch?.[1];
      return search ? `/events/list?search=${encodeURIComponent(search)}` : "/events/list";
    }
    default:
      return "/events/list";
  }
}

export default function InsightsPage() {
  const { clientId } = useClientId();
  const toast = useToast();
  const [alerts, setAlerts] = useState<InsightAlertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [trendSummary, setTrendSummary] = useState<string | null>(null);
  const [analyzingTrends, setAnalyzingTrends] = useState(false);

  async function load() {
    if (!clientId) return;
    setLoading(true);
    try {
      setAlerts(await getInsights(clientId));
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [clientId]);

  async function handleAcknowledge(id: number) {
    try {
      await acknowledgeInsight(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isAcknowledged: true } : a));
      toast.success("Alert acknowledged");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to acknowledge");
    }
  }

  async function handleAnalyzeTrends() {
    if (!clientId) return;
    setAnalyzingTrends(true);
    try {
      const result = await aiAnalyzeTrends(clientId);
      setTrendSummary(result.summary);
    } catch (err: any) {
      toast.error(err?.message ?? "Trend analysis failed");
    }
    setAnalyzingTrends(false);
  }

  const filteredAlerts = filter ? alerts.filter(a => a.alertType === filter) : alerts;

  const severityOrder = ["critical", "warning", "info"];
  const sorted = [...filteredAlerts].sort((a, b) => {
    if (a.isAcknowledged !== b.isAcknowledged) return a.isAcknowledged ? 1 : -1;
    const aSev = severityOrder.indexOf(a.severity);
    const bSev = severityOrder.indexOf(b.severity);
    if (aSev !== bSev) return aSev - bSev;
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  });

  const counts = {
    total: alerts.filter(a => !a.isAcknowledged).length,
    critical: alerts.filter(a => !a.isAcknowledged && a.severity === "critical").length,
    warning: alerts.filter(a => !a.isAcknowledged && a.severity === "warning").length,
    info: alerts.filter(a => !a.isAcknowledged && a.severity === "info").length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center shrink-0">
          <Lightbulb size={20} className="text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-steel-white leading-tight">Insights</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Automated pattern detection and anomaly alerts
          </p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-3 flex-wrap">
        {counts.critical > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-critical/10 text-critical border border-critical/20">
            <AlertTriangle size={12} /> {counts.critical} Critical
          </span>
        )}
        {counts.warning > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
            <AlertCircle size={12} /> {counts.warning} Warning
          </span>
        )}
        {counts.info > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-info/10 text-info border border-info/20">
            <Info size={12} /> {counts.info} Info
          </span>
        )}
        {counts.total === 0 && !loading && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
            <CheckCircle2 size={12} /> All clear
          </span>
        )}
      </div>

      {/* AI Trend Analysis */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleAnalyzeTrends}
          disabled={analyzingTrends || loading || alerts.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-purple-50 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-100 disabled:opacity-50 transition"
        >
          {analyzingTrends ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {analyzingTrends ? "Analyzing…" : "Analyze Trends with AI"}
        </button>
      </div>

      {trendSummary && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-purple-500" />
            <h3 className="font-semibold text-purple-800">AI Trend Analysis</h3>
          </div>
          <div className="text-sm text-purple-900 whitespace-pre-wrap leading-relaxed">{trendSummary}</div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!filter ? "bg-brand text-white" : "bg-slate-100 dark:bg-midnight text-slate-500 hover:text-slate-700"}`}
        >
          All
        </button>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter === key ? "bg-brand text-white" : "bg-slate-100 dark:bg-midnight text-slate-500 hover:text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">No insights available for this client yet.</p>
          <p className="text-xs text-slate-400 mt-1">Insights are generated every 6 hours based on event patterns.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(alert => {
            const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
            const Icon = sev.icon;
            return (
              <div
                key={alert.id}
                className={`rounded-2xl border shadow-sm p-5 transition ${
                  alert.isAcknowledged
                    ? "bg-slate-50 dark:bg-midnight border-slate-200 dark:border-slate-line opacity-60"
                    : `${sev.bg} ${sev.border}`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alert.isAcknowledged ? "bg-slate-200 dark:bg-graphite" : sev.bg}`}>
                    <Icon size={16} className={alert.isAcknowledged ? "text-slate-400" : sev.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        alert.isAcknowledged ? "bg-slate-200 text-slate-500" : `${sev.bg} ${sev.text}`
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-slate-400">{TYPE_LABELS[alert.alertType] ?? alert.alertType}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(alert.generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-steel-white mb-1">{alert.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{alert.body}</p>
                    {alert.aiSummary && (
                      <div className="mt-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <p className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1 mb-1 font-semibold">
                          <Sparkles size={10} /> AI Summary
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">{alert.aiSummary}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {buildInsightLink(alert) && (
                      <a
                        href={buildInsightLink(alert)!}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand bg-brand/5 border border-brand/20 rounded-lg hover:bg-brand/10 transition"
                      >
                        View Events <ExternalLink size={10} />
                      </a>
                    )}
                    {!alert.isAcknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-graphite border border-slate-200 dark:border-slate-line rounded-lg hover:bg-slate-50 dark:hover:bg-midnight transition"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.isAcknowledged && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Acked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
