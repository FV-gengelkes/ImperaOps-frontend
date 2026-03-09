"use client";

import { useState } from "react";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

// ── Shared styles ─────────────────────────────────────────────────────────────

export const LABEL = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

export function inputCls(hasError = false) {
  return `w-full rounded-lg border ${
    hasError
      ? "border-red-400 focus:ring-red-400"
      : "border-slate-300 dark:border-slate-line focus:ring-brand"
  } bg-white dark:bg-graphite px-3 py-2 text-sm text-slate-900 dark:text-steel-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
  return (
    <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center shrink-0">
      <span className="text-white text-lg font-bold tracking-wide">{initials || "?"}</span>
    </div>
  );
}

// ── Password field with show/hide toggle ──────────────────────────────────────

export function PasswordInput({
  value, onChange, placeholder, autoComplete, hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  hasError?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={`${inputCls(hasError)} pr-10`}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ── Inline banners ────────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400">
      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
      {message}
    </div>
  );
}
