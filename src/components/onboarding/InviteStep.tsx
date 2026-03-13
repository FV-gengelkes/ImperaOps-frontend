"use client";

import { useState } from "react";
import { Loader2, Plus, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { inviteClientUser } from "@/lib/api";

interface InviteRow {
  email: string;
  displayName: string;
  role: string;
  status: "idle" | "sending" | "sent" | "error";
  error?: string;
}

const ROLES = ["Viewer", "Investigator", "Manager", "Admin"];

function emptyRow(): InviteRow {
  return { email: "", displayName: "", role: "Investigator", status: "idle" };
}

interface InviteStepProps {
  clientId: number;
  onNext: () => void;
  onSkip: () => void;
}

export function InviteStep({ clientId, onNext, onSkip }: InviteStepProps) {
  const [rows, setRows] = useState<InviteRow[]>([emptyRow()]);
  const [sending, setSending] = useState(false);

  function updateRow(idx: number, patch: Partial<InviteRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function addRow() {
    if (rows.length < 5) setRows((prev) => [...prev, emptyRow()]);
  }

  const validRows = rows.filter((r) => r.email.trim() && r.displayName.trim());

  async function handleSend() {
    if (validRows.length === 0) {
      onNext();
      return;
    }

    setSending(true);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.email.trim() || !r.displayName.trim()) continue;

      updateRow(i, { status: "sending" });
      try {
        await inviteClientUser(clientId, r.email.trim(), r.displayName.trim(), r.role);
        updateRow(i, { status: "sent" });
      } catch (e: any) {
        updateRow(i, { status: "error", error: e?.message ?? "Failed to send invite" });
      }
    }

    setSending(false);
    // Auto-advance after a short delay so user can see results
    setTimeout(onNext, 1500);
  }

  const inputCls =
    "rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-midnight px-3 py-2 text-sm text-slate-900 dark:text-steel-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

  return (
    <div className="pt-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-steel-white">
          Invite Your Team
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add team members who will use ImperaOps. You can always invite more later.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-[1fr_1fr_120px] gap-2">
              <input
                type="email"
                placeholder="Email"
                value={r.email}
                onChange={(e) => updateRow(i, { email: e.target.value })}
                disabled={r.status === "sent" || sending}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="Name"
                value={r.displayName}
                onChange={(e) => updateRow(i, { displayName: e.target.value })}
                disabled={r.status === "sent" || sending}
                className={inputCls}
              />
              <select
                value={r.role}
                onChange={(e) => updateRow(i, { role: e.target.value })}
                disabled={r.status === "sent" || sending}
                className={inputCls}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-8 h-9 flex items-center justify-center shrink-0">
              {r.status === "sending" && <Loader2 size={16} className="text-brand animate-spin" />}
              {r.status === "sent" && <CheckCircle2 size={16} className="text-success" />}
              {r.status === "error" && (
                <span title={r.error}>
                  <XCircle size={16} className="text-critical" />
                </span>
              )}
              {r.status === "idle" && rows.length > 1 && (
                <button
                  onClick={() => removeRow(i)}
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {rows.length < 5 && !sending && (
        <button
          onClick={addRow}
          className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover font-medium transition-colors mb-6"
        >
          <Plus size={14} />
          Add another
        </button>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          disabled={sending}
          className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {sending && <Loader2 size={14} className="animate-spin" />}
          {validRows.length > 0 ? `Send ${validRows.length} Invite${validRows.length > 1 ? "s" : ""}` : "Continue"}
        </button>
      </div>
    </div>
  );
}
