"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { ModuleGuard } from "@/components/ModuleGuard";
import { createSprayJob, getAgFields } from "@/lib/api";
import type { AgFieldListItemDto } from "@/lib/types";
import { ArrowLeft, Loader2 } from "lucide-react";

const inputCls =
  "w-full px-3 py-2 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand/50";

export function NewSprayJobPage() {
  const { activeClientId } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fields, setFields] = useState<AgFieldListItemDto[]>([]);
  const [saving, setSaving] = useState(false);

  const [fieldId, setFieldId] = useState<number | "">(
    searchParams.get("fieldId") ? Number(searchParams.get("fieldId")) : ""
  );
  const [scheduledDate, setScheduledDate] = useState("");
  const [droneOperator, setDroneOperator] = useState("");
  const [product, setProduct] = useState("");
  const [applicationRate, setApplicationRate] = useState("");
  const [applicationUnit, setApplicationUnit] = useState("");
  const [weatherConditions, setWeatherConditions] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!activeClientId) return;
    getAgFields(activeClientId).then(setFields).catch(() => {});
  }, [activeClientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeClientId || !fieldId) {
      toast.error("Please select a field");
      return;
    }
    setSaving(true);
    try {
      const job = await createSprayJob(activeClientId, {
        fieldId: fieldId as number,
        scheduledDate: scheduledDate || null,
        droneOperator: droneOperator || null,
        product: product || null,
        applicationRate: applicationRate || null,
        applicationUnit: applicationUnit || null,
        weatherConditions: weatherConditions || null,
        notes: notes || null,
      });
      toast.success("Spray job created");
      router.push(`/ag/jobs/${job.id}`);
    } catch {
      toast.error("Failed to create spray job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModuleGuard moduleId="ag_field_mapping" moduleName="Precision Ag Field Mapping">
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Link href="/ag/jobs" className="text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-semibold text-steel-white">New Spray Job</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1E293B] rounded-2xl border border-slate-700/50 p-6 space-y-5">
          {/* Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Field *</label>
            <select
              value={fieldId}
              onChange={(e) => setFieldId(e.target.value ? Number(e.target.value) : "")}
              className={inputCls}
              required
            >
              <option value="">Select a field...</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Scheduled Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className={inputCls}
            />
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
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Create Spray Job
            </button>
            <Link
              href="/ag/jobs"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </ModuleGuard>
  );
}
