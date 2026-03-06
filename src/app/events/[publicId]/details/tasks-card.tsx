"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckSquare, GripVertical, Loader2, Pencil, Plus, Square, Trash2, X, ListTodo,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useClientId } from "@/components/client-id-context";
import {
  getEventTasks,
  createEventTask,
  updateEventTask,
  completeEventTask,
  uncompleteEventTask,
  deleteEventTask,
  reorderEventTasks,
  getClientUsers,
} from "@/lib/api";
import type { ClientUserDto, TaskDto } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// ── Shared form fields ────────────────────────────────────────────────────────

type TaskForm = {
  title: string;
  description: string;
  assignedToUserId: number | null;
  dueAt: string;
};

const emptyForm: TaskForm = { title: "", description: "", assignedToUserId: null, dueAt: "" };

function TaskFormFields({
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

// ── Sortable task row ─────────────────────────────────────────────────────────

function SortableTaskRow({
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

// ── Main card ─────────────────────────────────────────────────────────────────

export function TasksCard({ publicId }: { publicId: string }) {
  const { clientId } = useClientId();

  const [tasks, setTasks]     = useState<TaskDto[]>([]);
  const [users, setUsers]     = useState<ClientUserDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs to prevent double-submission (state updates are async; clicks can fire twice)
  const addingRef    = useRef(false);
  const editSavingRef = useRef(false);

  // Add task
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState<TaskForm>(emptyForm);
  const [adding, setAdding]     = useState(false);
  const addTitleRef = useRef<HTMLInputElement | null>(null);

  // Edit task
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editForm, setEditForm]     = useState<TaskForm>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  // Per-task loading
  const [completing, setCompleting]     = useState<Set<string>>(new Set());
  const [uncompleting, setUncompleting] = useState<Set<string>>(new Set());
  const [deleting, setDeleting]         = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load tasks — cancelled if publicId changes or component unmounts
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEventTasks(publicId)
      .then(ts => { if (!cancelled) setTasks(ts); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [publicId]);

  // Load users (separate so a user fetch failure doesn't block task display)
  useEffect(() => {
    if (clientId <= 0) return;
    getClientUsers(clientId)
      .then(list => setUsers(list.filter(u => u.isActive && !u.isSuperAdmin)))
      .catch(() => {});
  }, [clientId]);

  useEffect(() => {
    if (showAdd) setTimeout(() => addTitleRef.current?.focus(), 50);
  }, [showAdd]);

  // ── DnD ───────────────────────────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = tasks.findIndex(t => t.publicId === active.id);
    const newIdx = tasks.findIndex(t => t.publicId === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(tasks, oldIdx, newIdx);
    setTasks(reordered);
    reorderEventTasks(publicId, reordered.map(t => t.publicId)).catch(() => setTasks(tasks));
  }

  // ── Add ───────────────────────────────────────────────────────────────────

  function openAdd() {
    setAddForm(emptyForm);
    setEditingId(null);
    setShowAdd(true);
  }

  async function handleAdd() {
    if (!addForm.title.trim() || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    try {
      const task = await createEventTask(publicId, {
        title: addForm.title.trim(),
        description: addForm.description.trim() || null,
        assignedToUserId: addForm.assignedToUserId,
        dueAt: addForm.dueAt ? new Date(addForm.dueAt).toISOString() : null,
      });
      const assignee = users.find(u => u.id === addForm.assignedToUserId);
      setTasks(prev => [...prev, { ...task, assignedToDisplayName: assignee?.displayName ?? null }]);
      setAddForm(emptyForm);
      setShowAdd(false);
      window.dispatchEvent(new CustomEvent("notif:refresh"));
    } finally {
      setAdding(false);
      addingRef.current = false;
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit(task: TaskDto) {
    setShowAdd(false);
    setEditingId(task.publicId);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      assignedToUserId: task.assignedToUserId,
      dueAt: toDateInput(task.dueAt),
    });
  }

  async function handleEditSave() {
    if (!editingId || !editForm.title.trim() || editSavingRef.current) return;
    editSavingRef.current = true;
    setEditSaving(true);
    try {
      await updateEventTask(publicId, editingId, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        assignedToUserId: editForm.assignedToUserId,
        dueAt: editForm.dueAt ? new Date(editForm.dueAt).toISOString() : null,
      });
      const assignee = users.find(u => u.id === editForm.assignedToUserId);
      setTasks(prev => prev.map(t => t.publicId !== editingId ? t : {
        ...t,
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        assignedToUserId: editForm.assignedToUserId,
        assignedToDisplayName: assignee?.displayName ?? null,
        dueAt: editForm.dueAt ? new Date(editForm.dueAt).toISOString() : null,
      }));
      setEditingId(null);
      window.dispatchEvent(new CustomEvent("notif:refresh"));
    } finally {
      setEditSaving(false);
      editSavingRef.current = false;
    }
  }

  // ── Complete / Uncomplete / Delete ───────────────────────────────────────

  async function handleComplete(task: TaskDto) {
    setCompleting(prev => new Set(prev).add(task.publicId));
    try {
      await completeEventTask(publicId, task.publicId);
      setTasks(prev => prev.map(t => t.publicId === task.publicId ? { ...t, isComplete: true } : t));
    } finally {
      setCompleting(prev => { const s = new Set(prev); s.delete(task.publicId); return s; });
    }
  }

  async function handleUncomplete(task: TaskDto) {
    setUncompleting(prev => new Set(prev).add(task.publicId));
    try {
      await uncompleteEventTask(publicId, task.publicId);
      setTasks(prev => prev.map(t => t.publicId === task.publicId ? { ...t, isComplete: false } : t));
    } finally {
      setUncompleting(prev => { const s = new Set(prev); s.delete(task.publicId); return s; });
    }
  }

  async function handleDelete(task: TaskDto) {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    setDeleting(prev => new Set(prev).add(task.publicId));
    try {
      await deleteEventTask(publicId, task.publicId);
      setTasks(prev => prev.filter(t => t.publicId !== task.publicId));
      window.dispatchEvent(new CustomEvent("notif:refresh"));
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(task.publicId); return s; });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const open = tasks.filter(t => !t.isComplete);
  const done = tasks.filter(t => t.isComplete);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListTodo size={15} className="text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tasks</h2>
          {tasks.length > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
              {open.length}/{tasks.length}
            </span>
          )}
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover transition-colors"
        >
          <Plus size={12} />
          Add Task
        </button>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-3.5 w-3.5 rounded bg-slate-100 animate-pulse shrink-0" />
              <div className="h-3.5 flex-1 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Open tasks — draggable */}
          {open.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={open.map(t => t.publicId)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-slate-100">
                  {open.map(task => (
                    <SortableTaskRow
                      key={task.publicId}
                      task={task}
                      users={users}
                      isEditing={editingId === task.publicId}
                      editForm={editForm}
                      editSaving={editSaving}
                      completing={completing.has(task.publicId)}
                      uncompleting={uncompleting.has(task.publicId)}
                      deleting={deleting.has(task.publicId)}
                      onEditChange={f => setEditForm(prev => ({ ...prev, ...f }))}
                      onEditSave={handleEditSave}
                      onEditCancel={() => setEditingId(null)}
                      onStartEdit={() => startEdit(task)}
                      onComplete={() => handleComplete(task)}
                      onUncomplete={() => handleUncomplete(task)}
                      onDelete={() => handleDelete(task)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          {/* Add task form */}
          {showAdd && (
            <div className={`py-3 px-1 ${open.length > 0 ? "border-t border-slate-100 mt-1" : ""}`}>
              <TaskFormFields
                form={addForm}
                users={users}
                saving={adding}
                titleRef={addTitleRef}
                onChange={f => setAddForm(prev => ({ ...prev, ...f }))}
                onSave={handleAdd}
                onCancel={() => { setShowAdd(false); setAddForm(emptyForm); }}
                saveLabel="Add Task"
              />
            </div>
          )}

          {/* Completed tasks */}
          {done.length > 0 && (
            <div className={open.length > 0 || showAdd ? "mt-3 pt-3 border-t border-slate-100" : ""}>
              <p className="text-xs font-medium text-slate-400 mb-1">{done.length} completed</p>
              <ul className="divide-y divide-slate-50">
                {done.map(task => (
                  <SortableTaskRow
                    key={task.publicId}
                    task={task}
                    users={users}
                    isEditing={false}
                    editForm={emptyForm}
                    editSaving={false}
                    completing={completing.has(task.publicId)}
                    uncompleting={uncompleting.has(task.publicId)}
                    deleting={deleting.has(task.publicId)}
                    onEditChange={() => {}}
                    onEditSave={() => {}}
                    onEditCancel={() => {}}
                    onStartEdit={() => {}}
                    onComplete={() => {}}
                    onUncomplete={() => handleUncomplete(task)}
                    onDelete={() => handleDelete(task)}
                  />
                ))}
              </ul>
            </div>
          )}

          {tasks.length === 0 && !showAdd && (
            <p className="text-sm text-slate-400 py-2">No tasks yet.</p>
          )}
        </>
      )}
    </div>
  );
}
