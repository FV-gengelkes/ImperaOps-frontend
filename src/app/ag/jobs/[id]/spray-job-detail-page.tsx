"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { ModuleGuard } from "@/components/ModuleGuard";
import { getSprayJob, updateSprayJob, deleteSprayJob, getAgFields } from "@/lib/api";
import type { SprayJobDto, AgFieldListItemDto } from "@/lib/types";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

const STATUS_OPTIONS = ["scheduled", "in_progress", "completed", "cancelled"] as const;

const inputCls =
  "w-full px-3 py-2 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand/50";

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

export function SprayJobDetailPage() {
  const { activeClientId } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const jobId = Number(params.id);

  const [job, setJob] = useState<SprayJobDto | null>(null);
  const [fields, setFields] = useState<AgFieldListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [fieldId, setFieldId] = useState<number>(0);
  const [status, setStatus] = useState<string>("scheduled");
  const [scheduledDate, setScheduledDate] = useState("");
  const [completedDate, setCompletedDate] = useState("");
  const [droneOperator, setDroneOperator] = useState("");
  const [product, setProduct] = useState("");
  const [applicationRate, setApplicationRate] = useState("");
  const [applicationUnit, setApplicationUnit] = useState("");
  const [weatherConditions, setWeatherConditions] = useState("");
  const [flightLogGeoJson, setFlightLogGeoJson] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!activeClientId) return;
    getAgFields(activeClientId).then(setFields).catch(() => {});
  }, [activeClientId]);

  useEffect(() => {
    if (!activeClientId || !jobId) return;
    setLoading(true);
    getSprayJob(activeClientId, jobId)
      .then((j) => {
        setJob(j);
        setFieldId(j.fieldId);
        setStatus(j.status);
        setScheduledDate(j.scheduledDate?.slice(0, 10) ?? "");
        setCompletedDate(j.completedDate?.slice(0, 10) ?? "");
        setDroneOperator(j.droneOperator ?? "");
        setProduct(j.product ?? "");
        setApplicationRate(j.applicationRate ?? "");
        setApplicationUnit(j.applicationUnit ?? "");
        setWeatherConditions(j.weatherConditions ?? "");
        setFlightLogGeoJson(j.flightLogGeoJson ?? "");
        setNotes(j.notes ?? "");
      })
      .catch(() => toast.error("Failed to load spray job"))
      .finally(() => setLoading(false));
  }, [activeClientId, jobId, toast]);

  async function handleSave() {
    if (!activeClientId || !job) return;
    setSaving(true);
    try {
      await updateSprayJob(activeClientId, job.id, {
        fieldId,
        status,
        scheduledDate: scheduledDate || null,
        completedDate: completedDate || null,
        droneOperator: droneOperator || null,
        product: product || null,
        applicationRate: applicationRate || null,
        applicationUnit: applicationUnit || null,
        weatherConditions: weatherConditions || null,
        flightLogGeoJson: flightLogGeoJson || null,
        notes: notes || null,
      });
      toast.success("Spray job updated");
    } catch {
      toast.error("Failed to update spray job");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeClientId || !job) return;
    if (!window.confirm(`Delete spray job ${job.jobNumber}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteSprayJob(activeClientId, job.id);
      toast.success("Spray job deleted");
      router.push("/ag/jobs");
    } catch {
      toast.error("Failed to delete spray job");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <ModuleGuard moduleId="ag_field_mapping" moduleName="Precision Ag Field Mapping">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-500" />
        </div>
      </ModuleGuard>
    );
  }

  if (!job) {
    return (
      <ModuleGuard moduleId="ag_field_mapping" moduleName="Precision Ag Field Mapping">
        <div className="text-center py-20 text-slate-500">Spray job not found.</div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard moduleId="ag_field_mapping" moduleName="Precision Ag Field Mapping">
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/ag/jobs" className="text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-steel-white">{job.jobNumber}</h1>
              {job.fieldName && (
                <Link
                  href={`/ag/fields/${job.fieldId}`}
                  className="text-sm text-brand hover:underline"
                >
                  Field: {job.fieldName}
                </Link>
              )}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Form */}
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 p-6 space-y-5">
          {/* Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Field</label>
            <select
              value={fieldId}
              onChange={(e) => setFieldId(Number(e.target.value))}
              className={inputCls}
            >
              {fields.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputCls}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Scheduled Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Completed Date</label>
              <input
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Drone Operator */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Drone Operator</label>
            <input
              type="text"
              value={droneOperator}
              onChange={(e) => setDroneOperator(e.target.value)}
              placeholder="Operator name"
              className={inputCls}
            />
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Product</label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. Roundup, Fungicide blend"
              className={inputCls}
            />
          </div>

          {/* Application Rate + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Application Rate</label>
              <input
                type="text"
                value={applicationRate}
                onChange={(e) => setApplicationRate(e.target.value)}
                placeholder="e.g. 2.5"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Application Unit</label>
              <input
                type="text"
                value={applicationUnit}
                onChange={(e) => setApplicationUnit(e.target.value)}
                placeholder="e.g. gal/acre"
                className={inputCls}
              />
            </div>
          </div>

          {/* Weather Conditions */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Weather Conditions</label>
            <textarea
              value={weatherConditions}
              onChange={(e) => setWeatherConditions(e.target.value)}
              placeholder="Wind speed, temperature, humidity..."
              rows={3}
              className={inputCls}
            />
          </div>

          {/* Flight Log GeoJSON */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Flight Log GeoJSON</label>
            <textarea
              value={flightLogGeoJson}
              onChange={(e) => setFlightLogGeoJson(e.target.value)}
              placeholder='{"type": "FeatureCollection", ...}'
              rows={4}
              className={`${inputCls} font-mono text-xs`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className={inputCls}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save Changes
              </button>
              <Link
                href="/ag/jobs"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back
              </Link>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
