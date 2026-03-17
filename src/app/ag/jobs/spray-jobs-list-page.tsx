"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { ModuleGuard } from "@/components/ModuleGuard";
import { getSprayJobs, getAgFields } from "@/lib/api";
import type { SprayJobListItemDto, AgFieldListItemDto } from "@/lib/types";
import { Plus, Loader2 } from "lucide-react";

const STATUS_OPTIONS = ["all", "scheduled", "in_progress", "completed", "cancelled"] as const;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: "bg-blue-900/50 text-blue-400",
    in_progress: "bg-amber-900/50 text-amber-400",
    completed: "bg-emerald-900/50 text-emerald-400",
    cancelled: "bg-slate-800 text-slate-500",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] ?? "bg-slate-800 text-slate-400"}`}>
      {label}
    </span>
  );
}

function formatDate(d: string | null) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function SprayJobsListPage() {
  const { activeClientId } = useAuth();
  const toast = useToast();

  const [jobs, setJobs] = useState<SprayJobListItemDto[]>([]);
  const [fields, setFields] = useState<AgFieldListItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterFieldId, setFilterFieldId] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!activeClientId) return;
    getAgFields(activeClientId).then(setFields).catch(() => {});
  }, [activeClientId]);

  useEffect(() => {
    if (!activeClientId) return;
    setLoading(true);
    const filters: { fieldId?: number; status?: string } = {};
    if (filterFieldId) filters.fieldId = filterFieldId;
    if (filterStatus !== "all") filters.status = filterStatus;
    getSprayJobs(activeClientId, filters)
      .then(setJobs)
      .catch(() => toast.error("Failed to load spray jobs"))
      .finally(() => setLoading(false));
  }, [activeClientId, filterFieldId, filterStatus, toast]);

  return (
    <ModuleGuard moduleId="ag_field_mapping" moduleName="Precision Ag Field Mapping">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-steel-white">Spray Jobs</h1>
          <Link
            href="/ag/jobs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
          >
            <Plus size={16} />
            New Spray Job
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <select
            value={filterFieldId ?? ""}
            onChange={(e) => setFilterFieldId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand/50"
          >
            <option value="">All Fields</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand/50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-slate-500" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-sm">
              <p>No spray jobs found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Job #</th>
                  <th className="px-4 py-3 font-medium">Field</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium">Completed</th>
                  <th className="px-4 py-3 font-medium">Operator</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/ag/jobs/${job.id}`} className="text-brand hover:underline font-medium">
                        {job.jobNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{job.fieldName ?? "\u2014"}</td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(job.scheduledDate)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(job.completedDate)}</td>
                    <td className="px-4 py-3 text-slate-300">{job.droneOperator ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-slate-300">{job.product ?? "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ModuleGuard>
  );
}
