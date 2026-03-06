"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "warning" | "info";

type ToastEntry = {
  id: string;
  variant: ToastVariant;
  message: string;
};

type ToastContextValue = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ── Config ────────────────────────────────────────────────────────────────────

const MAX_TOASTS = 5;

const DISMISS_DELAY: Record<ToastVariant, number> = {
  success: 3000,
  error:   5000,
  warning: 5000,
  info:    5000,
};

const VARIANT_CONFIG: Record<ToastVariant, {
  bg: string; border: string; text: string; icon: string;
  Icon: React.ElementType;
}> = {
  success: {
    bg: "bg-emerald-50", border: "border-emerald-200",
    text: "text-emerald-800", icon: "text-emerald-600", Icon: CheckCircle2,
  },
  error: {
    bg: "bg-red-50", border: "border-red-200",
    text: "text-red-800", icon: "text-red-600", Icon: XCircle,
  },
  warning: {
    bg: "bg-amber-50", border: "border-amber-200",
    text: "text-amber-800", icon: "text-amber-600", Icon: AlertTriangle,
  },
  info: {
    bg: "bg-sky-50", border: "border-sky-200",
    text: "text-sky-800", icon: "text-sky-600", Icon: Info,
  },
};

// ── ToastItem ─────────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastEntry;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const { bg, border, text, icon, Icon } = VARIANT_CONFIG[toast.variant];

  // Slide in after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), DISMISS_DELAY[toast.variant]);
    return () => clearTimeout(t);
  }, [toast.id, toast.variant, onDismiss]);

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 w-80 rounded-xl border shadow-lg
        px-4 py-3 ${bg} ${border}
        transform transition-all duration-300 ease-out
        ${visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}
      `}
    >
      <Icon size={16} className={`${icon} shrink-0 mt-0.5`} />
      <p className={`flex-1 text-sm font-medium ${text}`}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── ToastProvider ─────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: string) => {
    setToasts(prev => {
      const next: ToastEntry = { id: `toast-${++counterRef.current}`, variant, message };
      const updated = [...prev, next];
      return updated.slice(-MAX_TOASTS);
    });
  }, []);

  const ctx = useMemo<ToastContextValue>(() => ({
    success: (msg) => push("success", msg),
    error:   (msg) => push("error",   msg),
    warning: (msg) => push("warning", msg),
    info:    (msg) => push("info",    msg),
  }), [push]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
