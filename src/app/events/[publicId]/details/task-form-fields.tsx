"use client";

import { Loader2 } from "lucide-react";
import type { ClientUserDto } from "@/lib/types";

export type TaskForm = {
  title: string;
  description: string;
  assignedToUserId: number | null;
  dueAt: string;
};

export const emptyForm: TaskForm = { title: "", description: "", assignedToUserId: null, dueAt: "" };

export function TaskFormFields({
  form,
  users,
  saving,
  titleRef,
  onChange,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: TaskForm;
  users: ClientUserDto[];
  saving: boolean;
  titleRef?: React.RefObject<HTMLInputElement | null>;
  onChange: (f: Partial<TaskForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <div className="space-y-2.5">
      <input
        ref={titleRef}
        className="w-full px-3 py-2 text-sm rounded-lg border border-brand bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
        placeholder="Task title *"
        value={form.title}
        onChange={e => onChange({ title: e.target.value })}
        onKeyDown={e => { if (e.key === "Escape") onCancel(); }}
        autoFocus={!titleRef}
      />
      <textarea
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
        rows={2}
        placeholder="Notes (optional)"
        value={form.description}
        onChange={e => onChange({ description: e.target.value })}
      />
      <div className="flex gap-2">
        <select
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
          value={form.assignedToUserId ?? ""}
          onChange={e => onChange({ assignedToUserId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Unassigned</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
        </select>
        <input
          type="date"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
          value={form.dueAt}
          onChange={e => onChange({ dueAt: e.target.value })}
          onClick={e => (e.target as HTMLInputElement).showPicker?.()}
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.title.trim()}
          className="px-4 py-1.5 text-xs font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={12} className="inline animate-spin" /> : saveLabel}
        </button>
      </div>
    </div>
  );
}
