"use client";

import {
  CheckSquare, GripVertical, Loader2, Pencil, Square, Trash2,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ClientUserDto, TaskDto } from "@/lib/types";
import { TaskFormFields, type TaskForm } from "./task-form-fields";

function formatDue(iso: string): { label: string; overdue: boolean } {
  const d = new Date(iso);
  // Date is stored as UTC midnight — extract UTC parts to get the intended calendar date
  const dDay = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  // Compare against local "today" at local midnight
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((dDay.getTime() - today.getTime()) / 86400000);
  if (diff === 0)  return { label: "Today",                overdue: false };
  if (diff === 1)  return { label: "Tomorrow",             overdue: false };
  if (diff === -1) return { label: "Yesterday",            overdue: true  };
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, overdue: true };
  return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), overdue: false };
}

export function SortableTaskRow({
  task,
  users,
  isEditing,
  editForm,
  editSaving,
  completing,
  uncompleting,
  deleting,
  onEditChange,
  onEditSave,
  onEditCancel,
  onStartEdit,
  onComplete,
  onUncomplete,
  onDelete,
}: {
  task: TaskDto;
  users: ClientUserDto[];
  isEditing: boolean;
  editForm: TaskForm;
  editSaving: boolean;
  completing: boolean;
  uncompleting: boolean;
  deleting: boolean;
  onEditChange: (f: Partial<TaskForm>) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onStartEdit: () => void;
  onComplete: () => void;
  onUncomplete: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.publicId, disabled: task.isComplete || isEditing });

  const style    = { transform: CSS.Transform.toString(transform), transition };
  const due      = task.dueAt ? formatDue(task.dueAt) : null;
  const anyBusy  = completing || uncompleting;

  return (
    <li ref={setNodeRef} style={style} className={`group ${isDragging ? "opacity-50" : ""}`}>
      {isEditing ? (
        <div className="py-3 px-1">
          <TaskFormFields
            form={editForm}
            users={users}
            saving={editSaving}
            onChange={onEditChange}
            onSave={onEditSave}
            onCancel={onEditCancel}
            saveLabel="Save"
          />
        </div>
      ) : (
        <div className="flex items-start gap-2 py-2.5">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 touch-none text-slate-200 hover:text-slate-400 transition-colors cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100"
            tabIndex={-1}
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} />
          </button>

          {/* Checkbox */}
          <button
            onClick={task.isComplete ? onUncomplete : onComplete}
            disabled={anyBusy}
            className={`mt-0.5 shrink-0 transition-colors disabled:opacity-40 ${
              task.isComplete
                ? "text-emerald-500 hover:text-slate-400"
                : "text-slate-400 hover:text-brand"
            }`}
            title={task.isComplete ? "Click to reopen" : "Mark complete"}
          >
            {anyBusy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : task.isComplete ? (
              <CheckSquare size={15} />
            ) : (
              <Square size={15} />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm leading-snug ${task.isComplete ? "line-through text-slate-400" : "text-slate-800"}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {task.assignedToDisplayName && (
                <span className="text-xs text-slate-400">{task.assignedToDisplayName}</span>
              )}
              {due && (
                <span className={`text-xs font-medium ${due.overdue ? "text-red-500" : "text-slate-400"}`}>
                  {due.label}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {!task.isComplete && (
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onStartEdit}
                className="p-1 text-slate-300 hover:text-brand transition-colors rounded"
                title="Edit"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded disabled:opacity-40"
                title="Delete"
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </div>
          )}
          {task.isComplete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-1 text-slate-200 hover:text-red-400 transition-colors rounded disabled:opacity-40 opacity-0 group-hover:opacity-100 shrink-0"
              title="Delete"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
