"use client";

import { useEffect, useState } from "react";
import {
  Sliders, Plus, Pencil, Trash2, X, Check, GripVertical,
  Type, Hash, DollarSign, Percent, Calendar, ToggleLeft,
  List, ListChecks, Link, Phone, Mail, AlignLeft, Star,
} from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useToast } from "@/components/toast-context";
import { getCustomFields, createCustomField, updateCustomField, deleteCustomField } from "@/lib/api";
import type { CustomFieldDto } from "@/lib/types";
import { ModuleTabs } from "../module-tabs";

// ── Data type config ──────────────────────────────────────────────────────────

const DATA_TYPES = [
  { value: "text",         label: "Text",          icon: Type,        hint: "Single-line text" },
  { value: "textarea",     label: "Long Text",      icon: AlignLeft,   hint: "Multi-line text" },
  { value: "number",       label: "Number",         icon: Hash,        hint: "Numeric value" },
  { value: "currency",     label: "Currency",       icon: DollarSign,  hint: "Dollar amount" },
  { value: "percentage",   label: "Percentage",     icon: Percent,     hint: "0–100%" },
  { value: "date",         label: "Date",           icon: Calendar,    hint: "Date picker" },
  { value: "boolean",      label: "Yes / No",       icon: ToggleLeft,  hint: "Checkbox toggle" },
  { value: "dropdown",     label: "Dropdown",       icon: List,        hint: "Single choice from a list" },
  { value: "multi_select", label: "Multi-select",   icon: ListChecks,  hint: "Multiple choices from a list" },
  { value: "url",          label: "URL",            icon: Link,        hint: "Web link" },
  { value: "phone",        label: "Phone",          icon: Phone,       hint: "Phone number" },
  { value: "email",        label: "Email",          icon: Mail,        hint: "Email address" },
  { value: "rating",       label: "Rating",         icon: Star,        hint: "1–5 star rating" },
] as const;

type DataTypeValue = typeof DATA_TYPES[number]["value"];

function dataTypeLabel(v: string) {
  return DATA_TYPES.find(d => d.value === v)?.label ?? v;
}

function DataTypeIcon({ dataType, className }: { dataType: string; className?: string }) {
  const Icon = DATA_TYPES.find(d => d.value === dataType)?.icon ?? Type;
  return <Icon className={className} />;
}

const inputCls =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
  "focus:border-transparent transition";

// ── Options editor ────────────────────────────────────────────────────────────

function OptionsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const t = draft.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((opt, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
          >
            {opt}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-indigo-400 hover:text-indigo-700 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="text-xs text-slate-400 italic">No options yet — add some below.</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className={inputCls + " flex-1"}
          placeholder="New option…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Field form ────────────────────────────────────────────────────────────────

type FieldFormState = {
  name: string;
  dataType: DataTypeValue;
  isRequired: boolean;
  options: string[];
};

function initForm(field?: CustomFieldDto): FieldFormState {
  return {
    name: field?.name ?? "",
    dataType: (field?.dataType as DataTypeValue) ?? "text",
    isRequired: field?.isRequired ?? false,
    options: field?.options ? (JSON.parse(field.options) as string[]) : [],
  };
}

function needsOptions(dt: string) {
  return dt === "dropdown" || dt === "multi_select";
}

function FieldFormRow({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: CustomFieldDto;
  onSave: (form: FieldFormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FieldFormState>(() => initForm(initial));

  function patch(p: Partial<FieldFormState>) {
    setForm(prev => ({ ...prev, ...p }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-indigo-200 rounded-xl bg-indigo-50/40 p-4 space-y-4"
    >
      {/* Name + Type row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Field Name</label>
          <input
            className={inputCls + " w-full"}
            placeholder="e.g. Driver License #"
            value={form.name}
            onChange={e => patch({ name: e.target.value })}
            autoFocus
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data Type</label>
          <select
            className={inputCls + " w-full"}
            value={form.dataType}
            onChange={e => patch({ dataType: e.target.value as DataTypeValue })}
          >
            {DATA_TYPES.map(dt => (
              <option key={dt.value} value={dt.value}>
                {dt.label} — {dt.hint}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Required toggle */}
      <div className="flex items-center gap-2.5">
        <input
          id="field-required"
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          checked={form.isRequired}
          onChange={e => patch({ isRequired: e.target.checked })}
        />
        <label htmlFor="field-required" className="text-sm text-slate-700 cursor-pointer select-none mt-px">
          Required field
        </label>
      </div>

      {/* Options editor (only for dropdown / multi_select) */}
      {needsOptions(form.dataType) && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Options</label>
          <OptionsEditor
            value={form.options}
            onChange={options => patch({ options })}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : initial ? "Save Changes" : "Add Field"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomFieldsPage() {
  const { clientId } = useClientId();
  const toast = useToast();
  const [activeModule, setActiveModule] = useState("incidents");
  const [fields, setFields] = useState<CustomFieldDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    if (!clientId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getCustomFields(clientId);
      setFields(data);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(form: FieldFormState) {
    setAddSaving(true);
    try {
      await createCustomField({
        clientId,
        name: form.name,
        dataType: form.dataType,
        isRequired: form.isRequired,
        options: needsOptions(form.dataType) ? JSON.stringify(form.options) : null,
      });
      setAdding(false);
      await load();
      toast.success("Field created");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to create.");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleEdit(field: CustomFieldDto, form: FieldFormState) {
    setEditSaving(true);
    try {
      await updateCustomField(field.id, {
        clientId,
        name: form.name,
        dataType: form.dataType,
        isRequired: form.isRequired,
        sortOrder: field.sortOrder,
        options: needsOptions(form.dataType) ? JSON.stringify(form.options) : null,
      });
      setEditId(null);
      await load();
      toast.success("Field updated");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to update.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(field: CustomFieldDto) {
    if (!confirm(`Delete "${field.name}"? Existing values on incidents will remain but the field won't be shown.`)) return;
    try {
      await deleteCustomField(field.id, clientId);
      await load();
      toast.success("Field deleted");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to delete.");
    }
  }

  return (
    <div className="pt-8 sm:pt-10 px-4 sm:px-8 pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
          <Sliders className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Custom Fields</h1>
      </div>
      <div className="mb-8">
        <p className="text-slate-500">Add your own fields to incident records.</p>
        <p className="text-sm text-slate-400 mt-0.5">
          Fields appear on the incident detail page and can hold different types of data.
        </p>
      </div>

      <ModuleTabs activeModule={activeModule} onChange={setActiveModule} />

      {!clientId ? (
        <p className="text-sm text-slate-400">Set a client ID above to manage custom fields.</p>
      ) : activeModule !== "incidents" ? null : (
        <div className="space-y-4">
          {/* Error */}
          {error && (
            <p className="px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">{error}</p>
          )}

          {/* Field list */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Fields</h2>
              {!adding && (
                <button
                  onClick={() => { setAdding(true); setEditId(null); }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <Plus size={14} />
                  Add Field
                </button>
              )}
            </div>

            {loading && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
            )}

            {!loading && fields.length === 0 && !adding && (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                No custom fields yet. Click "Add Field" to create your first one.
              </div>
            )}

            {!loading && (
              <ul className="divide-y divide-slate-100">
                {fields.map(field => (
                  <li key={field.id}>
                    {editId === field.id ? (
                      <div className="px-5 py-4">
                        <FieldFormRow
                          initial={field}
                          onSave={form => handleEdit(field, form)}
                          onCancel={() => setEditId(null)}
                          saving={editSaving}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-5 py-3.5">
                        <GripVertical size={14} className="text-slate-300 shrink-0" />
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100">
                          <DataTypeIcon dataType={field.dataType} className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{field.name}</span>
                            {field.isRequired && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {dataTypeLabel(field.dataType)}
                            {field.options && (() => {
                              try {
                                const opts = JSON.parse(field.options) as string[];
                                return opts.length > 0
                                  ? ` · ${opts.slice(0, 3).join(", ")}${opts.length > 3 ? ` +${opts.length - 3} more` : ""}`
                                  : null;
                              } catch { return null; }
                            })()}
                          </p>
                        </div>
                        <button
                          onClick={() => { setEditId(field.id); setAdding(false); }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => void handleDelete(field)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add form */}
            {adding && (
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <FieldFormRow
                  onSave={handleAdd}
                  onCancel={() => setAdding(false)}
                  saving={addSaving}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
