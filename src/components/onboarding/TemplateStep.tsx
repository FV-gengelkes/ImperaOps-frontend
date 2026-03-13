"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck, HardHat, Building, Factory, Monitor, Check } from "lucide-react";
import { getClientTemplates, applyClientTemplate } from "@/lib/api";
import type { EventTemplateDto } from "@/lib/types";

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  "tl-safety": Truck,
  "construction-safety": HardHat,
  "facilities-mgmt": Building,
  "manufacturing-safety": Factory,
  "saas-operations": Monitor,
};

interface TemplateStepProps {
  clientId: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TemplateStep({ clientId, onNext, onSkip }: TemplateStepProps) {
  const [templates, setTemplates] = useState<EventTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getClientTemplates(clientId)
      .then(setTemplates)
      .catch(() => setError("Failed to load templates"))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleApply() {
    if (!selectedId) return;
    setApplying(true);
    setError("");
    try {
      await applyClientTemplate(clientId, selectedId);
      onNext();
    } catch (e: any) {
      setError(e?.message ?? "Failed to apply template");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 size={24} className="text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-steel-white">
          Choose Your Industry Template
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Templates pre-configure event types, workflows, custom fields, and SLA rules for your industry.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-[340px] overflow-y-auto pr-1">
        {templates.map((t) => {
          const Icon = TEMPLATE_ICONS[t.id] ?? Monitor;
          const isSelected = selectedId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              disabled={applying}
              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-brand bg-brand/5 dark:bg-brand/10 shadow-sm"
                  : "border-slate-200 dark:border-slate-line hover:border-brand/40 bg-white dark:bg-midnight/50"
              } ${applying ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-brand text-white" : "bg-slate-100 dark:bg-midnight text-slate-500"
                }`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-steel-white leading-tight">
                    {t.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {t.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                      {t.eventTypeCount} types
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                      {t.statusCount} statuses
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                      {t.customFieldCount} fields
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          disabled={applying}
          className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={handleApply}
          disabled={!selectedId || applying}
          className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {applying && <Loader2 size={14} className="animate-spin" />}
          Apply Template
        </button>
      </div>
    </div>
  );
}
