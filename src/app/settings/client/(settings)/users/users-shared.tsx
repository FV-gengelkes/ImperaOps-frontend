"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
  "focus:border-transparent transition";

export const darkInputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

export const ROLES = ["Viewer", "Investigator", "Manager", "Admin"] as const;

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-indigo-600" : "bg-slate-600"
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-5" : "translate-x-0"
      }`} />
    </button>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <CheckCircle2 size={12} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <XCircle size={12} /> Inactive
    </span>
  );
}
