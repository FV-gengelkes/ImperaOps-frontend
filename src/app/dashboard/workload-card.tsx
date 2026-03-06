"use client";

import { useEffect, useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { getWorkload } from "@/lib/api";
import type { WorkloadRowDto } from "@/lib/types";

interface WorkloadCardProps {
  clientId: number;
}

export function WorkloadCard({ clientId }: WorkloadCardProps) {
  const [rows, setRows]       = useState<WorkloadRowDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (clientId <= 0) return;
    setLoading(true);
    setError("");
    getWorkload(clientId)
      .then(setRows)
      .catch(() => setError("Failed to load workload."))
      .finally(() => setLoading(false));
  }, [clientId]);

  const maxEvents = Math.max(1, ...rows.map(r => r.openEvents));

  function barColor(count: number): string {
    if (count >= 10) return "bg-critical";
    if (count >= 5)  return "bg-warning";
    return "bg-brand";
  }

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-line/40">
        <Users size={15} className="text-brand shrink-0" />
        <span className="font-semibold text-slate-800 dark:text-steel-white text-sm">Team Workload</span>
        {!loading && rows.length > 0 && (
          <span className="text-xs text-slate-400 ml-1">open events by assignee</span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-72">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="text-slate-300 animate-spin" />
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No open events</div>
        ) : (
          <div className="px-5 py-3 space-y-3">
            {rows.map((row, i) => (
              <div key={row.userId ?? `unassigned-${i}`} className="flex items-center gap-3">
                {/* Avatar initial */}
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-midnight flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    {row.userName[0]}
                  </span>
                </div>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{row.userName}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-steel-white tabular-nums">
                        {row.openEvents} event{row.openEvents !== 1 ? "s" : ""}
                      </span>
                      {row.openTasks > 0 && (
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          · {row.openTasks} task{row.openTasks !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-line rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor(row.openEvents)}`}
                      style={{ width: `${Math.round((row.openEvents / maxEvents) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      {rows.length > 0 && !loading && (
        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-slate-100 dark:border-slate-line/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand" />
            <span className="text-[10px] text-slate-400">&lt;5</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-[10px] text-slate-400">5–9</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-critical" />
            <span className="text-[10px] text-slate-400">10+</span>
          </div>
        </div>
      )}
    </div>
  );
}
