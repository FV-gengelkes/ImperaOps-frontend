"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Sliders, Star } from "lucide-react";
import { getCustomFieldValues, upsertCustomFieldValues } from "@/lib/api";
import type { CustomFieldValueDto } from "@/lib/types";

// ── Field input renderers ─────────────────────────────────────────────────────

const inputBase =
  "w-full px-3.5 py-2.5 text-sm text-slate-800 rounded-xl bg-slate-50 " +
  "focus:bg-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400";

const inputCls    = inputBase + " border border-slate-200 focus:ring-indigo-500/40 focus:border-indigo-400";
const inputErrCls = inputBase + " border border-red-400 focus:ring-red-400/30 focus:border-red-400";

function isEmpty(dataType: string, value: string): boolean {
  if (dataType === "boolean") return false; // boolean is never "empty"
  if (dataType === "multi_select") {
    try { return !value || (JSON.parse(value) as string[]).length === 0; }
    catch { return true; }
  }
  return !value.trim();
}

function RatingInput({
  value, onChange, hasError,
}: { value: string; onChange: (v: string) => void; hasError?: boolean }) {
  const num = parseInt(value) || 0;
  return (
    <div className={`flex gap-1 ${hasError ? "ring-1 ring-red-400 rounded-lg p-1" : ""}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === num ? "" : String(star))}
          className={`p-0.5 transition-colors ${star <= num ? "text-amber-400" : "text-slate-300 hover:text-amber-300"}`}
        >
          <Star size={20} fill={star <= num ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function MultiSelectInput({
  options, value, onChange, hasError,
}: { options: string[]; value: string; onChange: (v: string) => void; hasError?: boolean }) {
  let selected: string[] = [];
  try { selected = value ? (JSON.parse(value) as string[]) : []; } catch { /* ignore */ }

  function toggle(opt: string) {
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt];
    onChange(next.length > 0 ? JSON.stringify(next) : "");
  }

  return (
    <div className={`flex flex-wrap gap-2 ${hasError ? "p-1 ring-1 ring-red-400 rounded-lg" : ""}`}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FieldInput({ field, value, onChange, hasError }: {
  field: CustomFieldValueDto; value: string; onChange: (v: string) => void; hasError?: boolean;
}) {
  const cls = hasError ? inputErrCls : inputCls;
  const options: string[] = (() => {
    try { return field.options ? (JSON.parse(field.options) as string[]) : []; } catch { return []; }
  })();

  switch (field.dataType) {
    case "textarea":
      return <textarea className={`${cls} resize-none`} rows={3} value={value} onChange={e => onChange(e.target.value)} />;
    case "number":
      return <input type="number" className={cls} value={value} onChange={e => onChange(e.target.value)} />;
    case "currency":
      return (
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input type="number" min="0" step="0.01" className={cls + " pl-7"} value={value} onChange={e => onChange(e.target.value)} />
        </div>
      );
    case "percentage":
      return (
        <div className="relative">
          <input type="number" min="0" max="100" step="0.1" className={cls + " pr-8"} value={value} onChange={e => onChange(e.target.value)} />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
        </div>
      );
    case "date":
      return <input type="date" className={cls} value={value} onChange={e => onChange(e.target.value)} />;
    case "boolean":
      return (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={value === "true"} onChange={e => onChange(e.target.checked ? "true" : "false")} />
          <span className="text-sm text-slate-700 mt-px">{value === "true" ? "Yes" : "No"}</span>
        </label>
      );
    case "dropdown":
      return (
        <select className={cls} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    case "multi_select":
      return <MultiSelectInput options={options} value={value} onChange={onChange} hasError={hasError} />;
    case "url":
      return <input type="url" className={cls} placeholder="https://…" value={value} onChange={e => onChange(e.target.value)} />;
    case "phone":
      return <input type="tel" className={cls} placeholder="+1 (555) 000-0000" value={value} onChange={e => onChange(e.target.value)} />;
    case "email":
      return <input type="email" className={cls} placeholder="name@example.com" value={value} onChange={e => onChange(e.target.value)} />;
    case "rating":
      return <RatingInput value={value} onChange={onChange} hasError={hasError} />;
    default:
      return <input type="text" className={cls} value={value} onChange={e => onChange(e.target.value)} />;
  }
}

// ── Card ──────────────────────────────────────────────────────────────────────

export interface CustomFieldsCardHandle {
  save: () => Promise<void>;
  reset: () => void;
}

export const CustomFieldsCard = forwardRef<
  CustomFieldsCardHandle,
  { incidentId: string; clientId: string; onDirtyChange?: (dirty: boolean) => void }
>(function CustomFieldsCard({ incidentId, clientId, onDirtyChange }, ref) {
  const [fields, setFields] = useState<CustomFieldValueDto[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!incidentId || !clientId) return;
    setLoading(true);
    getCustomFieldValues(incidentId, clientId)
      .then(data => {
        setFields(data);
        const init: Record<string, string> = {};
        data.forEach(f => { init[f.customFieldId] = f.value; });
        setValues(init);
        setSavedValues(init);
      })
      .finally(() => setLoading(false));
  }, [incidentId, clientId]);

  const isDirty = fields.some(
    f => (values[f.customFieldId] ?? "") !== (savedValues[f.customFieldId] ?? "")
  );
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    async save() {
      if (fields.length === 0) return;

      // Validate required fields
      const missing = fields.filter(
        f => f.isRequired && isEmpty(f.dataType, values[f.customFieldId] ?? "")
      );
      if (missing.length > 0) {
        setSubmitted(true);
        throw new Error(
          `Required custom field${missing.length > 1 ? "s" : ""} missing: ${missing.map(f => f.fieldName).join(", ")}.`
        );
      }

      const entries = Object.entries(values)
        .filter(([, v]) => v !== "")
        .map(([customFieldId, value]) => ({ customFieldId, value }));
      await upsertCustomFieldValues(incidentId, clientId, entries);
      setSavedValues({ ...values });
      setSubmitted(false);
    },
    reset() {
      setValues({ ...savedValues });
      setSubmitted(false);
    },
  }));

  if (!loading && fields.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-5">
      <div className="flex items-center gap-2 mb-5">
        <Sliders size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Custom Fields</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fields.map(field => {
            const val = values[field.customFieldId] ?? "";
            const hasError = submitted && field.isRequired && isEmpty(field.dataType, val);
            return (
              <div key={field.customFieldId} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {field.fieldName}
                  {field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <FieldInput
                  field={field}
                  value={val}
                  onChange={v => setValues(prev => ({ ...prev, [field.customFieldId]: v }))}
                  hasError={hasError}
                />
                {hasError && (
                  <p className="text-xs text-red-500">This field is required.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
