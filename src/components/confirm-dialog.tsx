"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

type Variant = "danger" | "warning" | "default";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  /** If set, the user must type this string to enable the confirm button. */
  confirmText?: string;
}

const variantStyles: Record<Variant, { icon: string; btn: string; border: string }> = {
  danger: {
    icon: "text-critical",
    btn: "bg-critical hover:bg-red-700",
    border: "border-red-900/40",
  },
  warning: {
    icon: "text-warning",
    btn: "bg-amber-600 hover:bg-amber-500",
    border: "border-amber-800/40",
  },
  default: {
    icon: "text-brand",
    btn: "bg-brand hover:bg-brand-hover",
    border: "border-slate-line",
  },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  confirmText,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  // Reset typed text when dialog opens/closes
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  if (!open) return null;

  const styles = variantStyles[variant];
  const isTypeMode = !!confirmText;
  const canConfirm = isTypeMode
    ? typed.toLowerCase() === confirmText!.toLowerCase()
    : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`bg-graphite rounded-xl border ${styles.border} shadow-2xl w-full max-w-md`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-line">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className={styles.icon} />
            <h3 className="font-semibold text-steel-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-steel-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-300">{description}</p>

          {isTypeMode && (
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400">
                Type <strong className="text-steel-white">{confirmText}</strong> to confirm
              </label>
              <input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={`Type "${confirmText}" to confirm`}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-line">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-steel-white font-medium transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            disabled={!canConfirm}
            className={`px-4 py-2 rounded-lg text-sm text-white font-semibold transition ${styles.btn} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
