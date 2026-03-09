"use client";

import { useEffect, useRef, useState } from "react";
import { ListTodo, Plus } from "lucide-react";
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
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
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
import { TaskFormFields, emptyForm, type TaskForm } from "./task-form-fields";
import { SortableTaskRow } from "./sortable-task-row";

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

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
