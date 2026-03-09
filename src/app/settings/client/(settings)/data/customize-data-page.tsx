"use client";

import { useEffect, useState } from "react";
import { Database, GripVertical, Lock, Pencil, Plus, Trash2, X, Check } from "lucide-react";
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
  getEventTypes, createEventType, updateEventType, deleteEventType,
  getWorkflowStatuses, createWorkflowStatus, updateWorkflowStatus, deleteWorkflowStatus,
  getRootCauseTaxonomy, createRootCauseTaxonomyItem, updateRootCauseTaxonomyItem, deleteRootCauseTaxonomyItem,
} from "@/lib/api";
import type { EventTypeDto, WorkflowStatusDto, RootCauseTaxonomyItemDto } from "@/lib/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand " +
  "focus:border-transparent transition";

// ── Event Types section ───────────────────────────────────────────────────────

type EventTypeSectionState = {
  rows: EventTypeDto[];
  loading: boolean;
  error: string;
  addLabel: string | null;
  addSaving: boolean;
  editId: number | null;
  editLabel: string;
  editSaving: boolean;
};

function initEventTypeSection(): EventTypeSectionState {
  return {
    rows: [], loading: true, error: "",
    addLabel: null, addSaving: false,
    editId: null, editLabel: "", editSaving: false,
  };
}

function SortableEventTypeRow({
  row, isEditing, editLabel, editSaving,
  onStartEdit, onLabelChange, onSaveEdit, onCancelEdit, onDelete,
}: {
  row: EventTypeDto;
  isEditing: boolean;
  editLabel: string;
  editSaving: boolean;
  onStartEdit: () => void;
  onLabelChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-5 py-3 ${isDragging ? "opacity-50 bg-slate-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none text-slate-300 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing shrink-0"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>

      {isEditing ? (
        <>
          <div className="flex-1">
            <input
              className={inputCls + " w-full"}
              value={editLabel}
              onChange={e => onLabelChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit(); }}
              autoFocus
            />
          </div>
          <button onClick={onSaveEdit} disabled={editSaving}
            className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors" title="Save">
            <Check size={14} />
          </button>
          <button onClick={onCancelEdit}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors" title="Cancel">
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          {row.isSystem
            ? <Lock size={13} className="text-slate-300 shrink-0" />
            : null
          }
          <span className={`flex-1 text-sm ${row.isSystem ? "text-slate-400" : "text-slate-700"}`}>{row.name}</span>
          {!row.isSystem && (
            <>
              <button onClick={onStartEdit}
                className="p-1.5 text-slate-400 hover:text-brand transition-colors" title="Edit">
                <Pencil size={13} />
              </button>
              <button onClick={onDelete}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </>
      )}
    </li>
  );
}

function EventTypesSection({ clientId }: { clientId: number }) {
  const [s, setS] = useState<EventTypeSectionState>(initEventTypeSection);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function update(patch: Partial<EventTypeSectionState>) {
    setS(prev => ({ ...prev, ...patch }));
  }

  async function load() {
    update({ loading: true, error: "" });
    try {
      const rows = await getEventTypes(clientId);
      update({ rows, loading: false });
    } catch (e: unknown) {
      update({ loading: false, error: (e as Error).message ?? "Failed to load." });
    }
  }

  useEffect(() => { if (clientId) void load(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    if (!s.addLabel?.trim()) return;
    update({ addSaving: true });
    try {
      await createEventType(clientId, s.addLabel.trim());
      update({ addLabel: null, addSaving: false });
      await load();
    } catch (e: unknown) {
      update({ addSaving: false, error: (e as Error).message ?? "Create failed." });
    }
  }

  async function handleEdit(row: EventTypeDto) {
    update({ editSaving: true });
    try {
      await updateEventType(row.id, { clientId, name: s.editLabel.trim() || row.name, sortOrder: row.sortOrder, isActive: row.isActive });
      update({ editId: null, editLabel: "", editSaving: false });
      await load();
    } catch (e: unknown) {
      update({ editSaving: false, error: (e as Error).message ?? "Update failed." });
    }
  }

  async function handleDelete(row: EventTypeDto) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await deleteEventType(row.id, clientId);
      await load();
    } catch (e: unknown) {
      update({ error: (e as Error).message ?? "Delete failed." });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const clientRows = s.rows.filter(r => !r.isSystem);
    const systemRows = s.rows.filter(r => r.isSystem);
    const originalRows = s.rows;
    const oldIdx = clientRows.findIndex(r => r.id === active.id);
    const newIdx = clientRows.findIndex(r => r.id === over.id);
    const reordered = arrayMove(clientRows, oldIdx, newIdx);
    const maxSystemOrder = systemRows.reduce((max, r) => Math.max(max, r.sortOrder), 0);
    const updated = reordered.map((row, i) => ({ ...row, sortOrder: maxSystemOrder + i + 1 }));
    update({ rows: [...systemRows, ...updated] });
    try {
      await Promise.all(
        updated
          .filter(row => { const orig = clientRows.find(r => r.id === row.id); return orig && orig.sortOrder !== row.sortOrder; })
          .map(row => updateEventType(row.id, { clientId, name: row.name, sortOrder: row.sortOrder, isActive: row.isActive })),
      );
    } catch {
      update({ rows: originalRows, error: "Failed to save order." });
    }
  }

  const systemRows = s.rows.filter(r => r.isSystem);
  const clientRows = s.rows.filter(r => !r.isSystem);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">Event Types</h2>
        {s.addLabel === null && (
          <button onClick={() => update({ addLabel: "" })}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover transition-colors">
            <Plus size={14} /> Add
          </button>
        )}
      </div>
      {s.error && <p className="px-5 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{s.error}</p>}
      {s.loading && <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>}
      {!s.loading && (
        <ul className="divide-y divide-slate-100">
          {systemRows.map(row => (
            <li key={row.id} className="flex items-center gap-3 px-5 py-3">
              <Lock size={13} className="text-slate-300 shrink-0 ml-[18px]" />
              <span className="flex-1 text-sm text-slate-400">{row.name}</span>
            </li>
          ))}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={clientRows.map(r => r.id)} strategy={verticalListSortingStrategy}>
              {clientRows.map(row => (
                <SortableEventTypeRow
                  key={row.id} row={row}
                  isEditing={s.editId === row.id}
                  editLabel={s.editLabel} editSaving={s.editSaving}
                  onStartEdit={() => update({ editId: row.id, editLabel: row.name })}
                  onLabelChange={v => update({ editLabel: v })}
                  onSaveEdit={() => void handleEdit(row)}
                  onCancelEdit={() => update({ editId: null })}
                  onDelete={() => void handleDelete(row)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {s.rows.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">No entries yet.</li>}
        </ul>
      )}
      {s.addLabel !== null && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <input className={inputCls + " flex-1"} placeholder="New event type…"
            value={s.addLabel} onChange={e => update({ addLabel: e.target.value })}
            onKeyDown={e => { if (e.key === "Enter") void handleAdd(); if (e.key === "Escape") update({ addLabel: null }); }}
            autoFocus />
          <button onClick={() => void handleAdd()} disabled={s.addSaving || !s.addLabel.trim()}
            className="px-3 py-2 text-sm font-medium bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
            {s.addSaving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => update({ addLabel: null })}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Workflow Statuses section ─────────────────────────────────────────────────

type StatusFormState = { name: string; color: string; isClosed: boolean };

type WorkflowStatusSectionState = {
  rows: WorkflowStatusDto[];
  loading: boolean;
  error: string;
  addForm: StatusFormState | null;
  addSaving: boolean;
  editId: number | null;
  editForm: StatusFormState;
  editSaving: boolean;
};

function initStatusSection(): WorkflowStatusSectionState {
  return {
    rows: [], loading: true, error: "",
    addForm: null, addSaving: false,
    editId: null, editForm: { name: "", color: "#6366f1", isClosed: false }, editSaving: false,
  };
}

function SortableStatusRow({
  row, isEditing, editForm, editSaving,
  onStartEdit, onFormChange, onSaveEdit, onCancelEdit, onDelete,
}: {
  row: WorkflowStatusDto;
  isEditing: boolean;
  editForm: StatusFormState;
  editSaving: boolean;
  onStartEdit: () => void;
  onFormChange: (p: Partial<StatusFormState>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  if (isEditing) {
    return (
      <li ref={setNodeRef} style={style} className="flex items-center gap-3 px-5 py-3">
        <button {...attributes} {...listeners}
          className="touch-none text-slate-300 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing shrink-0"
          tabIndex={-1} aria-label="Drag to reorder">
          <GripVertical size={14} />
        </button>
        <input type="color" value={editForm.color}
          onChange={e => onFormChange({ color: e.target.value })}
          className="w-7 h-7 rounded cursor-pointer shrink-0 border border-slate-200" title="Color" />
        <input className={inputCls + " flex-1"} value={editForm.name}
          onChange={e => onFormChange({ name: e.target.value })}
          onKeyDown={e => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit(); }}
          autoFocus />
        <label className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0 cursor-pointer">
          <input type="checkbox" checked={editForm.isClosed} onChange={e => onFormChange({ isClosed: e.target.checked })}
            className="rounded border-slate-300" />
          Closed
        </label>
        <button onClick={onSaveEdit} disabled={editSaving}
          className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors" title="Save">
          <Check size={14} />
        </button>
        <button onClick={onCancelEdit}
          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors" title="Cancel">
          <X size={14} />
        </button>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-5 py-3 ${isDragging ? "opacity-50 bg-slate-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none text-slate-300 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing shrink-0"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
      {row.color
        ? <span className="w-3 h-3 rounded-full shrink-0" style={{ background: row.color }} />
        : <span className="w-3 h-3 rounded-full shrink-0 bg-slate-200" />
      }
      <span className="flex-1 text-sm text-slate-700">{row.name}</span>
      <span className="text-xs text-slate-500 tabular-nums">{row.count.toLocaleString()} events</span>
      {row.isClosed && <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Closed</span>}
      <button onClick={onStartEdit}
        className="p-1.5 text-slate-400 hover:text-brand transition-colors" title="Edit">
        <Pencil size={13} />
      </button>
      <button onClick={onDelete} disabled={row.count > 0}
        className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title={row.count > 0 ? `Cannot delete — ${row.count} event(s) use this status` : "Delete"}>
        <Trash2 size={13} />
      </button>
    </li>
  );
}

function WorkflowStatusesSection({ clientId }: { clientId: number }) {
  const [s, setS] = useState<WorkflowStatusSectionState>(initStatusSection);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function update(patch: Partial<WorkflowStatusSectionState>) {
    setS(prev => ({ ...prev, ...patch }));
  }

  async function load() {
    update({ loading: true, error: "" });
    try {
      const rows = await getWorkflowStatuses(clientId);
      update({ rows, loading: false });
    } catch (e: unknown) {
      update({ loading: false, error: (e as Error).message ?? "Failed to load." });
    }
  }

  useEffect(() => { if (clientId) void load(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    if (!s.addForm?.name.trim()) return;
    update({ addSaving: true });
    try {
      await createWorkflowStatus({ clientId, name: s.addForm.name.trim(), color: s.addForm.color || null, isClosed: s.addForm.isClosed });
      update({ addForm: null, addSaving: false });
      await load();
    } catch (e: unknown) {
      update({ addSaving: false, error: (e as Error).message ?? "Create failed." });
    }
  }

  async function handleEdit(row: WorkflowStatusDto) {
    update({ editSaving: true });
    try {
      await updateWorkflowStatus(row.id, {
        clientId,
        name: s.editForm.name.trim() || row.name,
        color: s.editForm.color || null,
        isClosed: s.editForm.isClosed,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
      });
      update({ editId: null, editSaving: false });
      await load();
    } catch (e: unknown) {
      update({ editSaving: false, error: (e as Error).message ?? "Update failed." });
    }
  }

  async function handleDelete(row: WorkflowStatusDto) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await deleteWorkflowStatus(row.id, clientId);
      await load();
    } catch (e: unknown) {
      update({ error: (e as Error).message ?? "Delete failed." });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const clientRows = s.rows.filter(r => !r.isSystem);
    const systemRows = s.rows.filter(r => r.isSystem);
    const originalRows = s.rows;
    const oldIdx = clientRows.findIndex(r => r.id === active.id);
    const newIdx = clientRows.findIndex(r => r.id === over.id);
    const reordered = arrayMove(clientRows, oldIdx, newIdx);
    const updated = reordered.map((row, i) => ({ ...row, sortOrder: i + 1 }));
    update({ rows: [...systemRows, ...updated] });
    try {
      await Promise.all(
        updated
          .filter(row => { const orig = clientRows.find(r => r.id === row.id); return orig && orig.sortOrder !== row.sortOrder; })
          .map(row => updateWorkflowStatus(row.id, { clientId, name: row.name, color: row.color, isClosed: row.isClosed, sortOrder: row.sortOrder, isActive: row.isActive })),
      );
    } catch {
      update({ rows: originalRows, error: "Failed to save order." });
    }
  }

  const systemRows = s.rows.filter(r => r.isSystem);
  const clientRows = s.rows.filter(r => !r.isSystem);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">Workflow Statuses</h2>
        {s.addForm === null && (
          <button
            onClick={() => update({ addForm: { name: "", color: "#6366f1", isClosed: false } })}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover transition-colors">
            <Plus size={14} /> Add
          </button>
        )}
      </div>
      {s.error && <p className="px-5 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{s.error}</p>}
      {s.loading && <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>}
      {!s.loading && (
        <ul className="divide-y divide-slate-100">
          {systemRows.map(row => (
            <li key={row.id} className="flex items-center gap-3 px-5 py-3">
              <Lock size={13} className="text-slate-300 shrink-0 ml-[18px]" />
              {row.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ background: row.color }} />}
              <span className="flex-1 text-sm text-slate-400">{row.name}</span>
              <span className="text-xs text-slate-400 tabular-nums">{row.count.toLocaleString()} events</span>
              {row.isClosed && <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Closed</span>}
            </li>
          ))}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={clientRows.map(r => r.id)} strategy={verticalListSortingStrategy}>
              {clientRows.map(row => (
                <SortableStatusRow
                  key={row.id} row={row}
                  isEditing={s.editId === row.id}
                  editForm={s.editForm} editSaving={s.editSaving}
                  onStartEdit={() => update({ editId: row.id, editForm: { name: row.name, color: row.color ?? "#6366f1", isClosed: row.isClosed } })}
                  onFormChange={p => update({ editForm: { ...s.editForm, ...p } })}
                  onSaveEdit={() => void handleEdit(row)}
                  onCancelEdit={() => update({ editId: null })}
                  onDelete={() => void handleDelete(row)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {s.rows.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">No entries yet.</li>}
        </ul>
      )}
      {s.addForm !== null && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <input type="color" value={s.addForm.color}
            onChange={e => update({ addForm: { ...s.addForm!, color: e.target.value } })}
            className="w-7 h-7 rounded cursor-pointer shrink-0 border border-slate-200" title="Color" />
          <input className={inputCls + " flex-1"} placeholder="New status name…"
            value={s.addForm.name}
            onChange={e => update({ addForm: { ...s.addForm!, name: e.target.value } })}
            onKeyDown={e => { if (e.key === "Enter") void handleAdd(); if (e.key === "Escape") update({ addForm: null }); }}
            autoFocus />
          <label className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0 cursor-pointer">
            <input type="checkbox" checked={s.addForm.isClosed}
              onChange={e => update({ addForm: { ...s.addForm!, isClosed: e.target.checked } })}
              className="rounded border-slate-300" />
            Closed
          </label>
          <button onClick={() => void handleAdd()} disabled={s.addSaving || !s.addForm.name.trim()}
            className="px-3 py-2 text-sm font-medium bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
            {s.addSaving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => update({ addForm: null })}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Root Causes section ───────────────────────────────────────────────────────

type RootCausesSectionState = {
  rows: RootCauseTaxonomyItemDto[];
  loading: boolean;
  error: string;
  addLabel: string | null;
  addSaving: boolean;
  editId: number | null;
  editLabel: string;
  editSaving: boolean;
};

function initRootCausesSection(): RootCausesSectionState {
  return {
    rows: [], loading: true, error: "",
    addLabel: null, addSaving: false,
    editId: null, editLabel: "", editSaving: false,
  };
}

function RootCausesSection({ clientId }: { clientId: number }) {
  const [s, setS] = useState<RootCausesSectionState>(initRootCausesSection);

  function update(patch: Partial<RootCausesSectionState>) {
    setS(prev => ({ ...prev, ...patch }));
  }

  async function load() {
    update({ loading: true, error: "" });
    try {
      const rows = await getRootCauseTaxonomy(clientId);
      update({ rows, loading: false });
    } catch (e: unknown) {
      update({ loading: false, error: (e as Error).message ?? "Failed to load." });
    }
  }

  useEffect(() => { if (clientId) void load(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    if (!s.addLabel?.trim()) return;
    update({ addSaving: true });
    try {
      await createRootCauseTaxonomyItem(clientId, s.addLabel.trim());
      update({ addLabel: null, addSaving: false });
      await load();
    } catch (e: unknown) {
      update({ addSaving: false, error: (e as Error).message ?? "Create failed." });
    }
  }

  async function handleEdit(row: RootCauseTaxonomyItemDto) {
    const newName = s.editLabel.trim();
    if (!newName) { update({ editId: null }); return; }
    update({ editSaving: true });
    try {
      await updateRootCauseTaxonomyItem(clientId, row.id, newName);
      update({ editId: null, editLabel: "", editSaving: false });
      await load();
    } catch (e: unknown) {
      update({ editSaving: false, error: (e as Error).message ?? "Update failed." });
    }
  }

  async function handleDelete(row: RootCauseTaxonomyItemDto) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await deleteRootCauseTaxonomyItem(clientId, row.id);
      await load();
    } catch (e: unknown) {
      update({ error: (e as Error).message ?? "Delete failed. It may be in use by events." });
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">Root Causes</h2>
        {s.addLabel === null && (
          <button onClick={() => update({ addLabel: "" })}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover transition-colors">
            <Plus size={14} /> Add
          </button>
        )}
      </div>
      <p className="px-5 py-2 text-xs text-slate-400 border-b border-slate-100">
        Root causes are used to categorise the investigation findings of an event.
      </p>
      {s.error && <p className="px-5 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{s.error}</p>}
      {s.loading && <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>}
      {!s.loading && (
        <ul className="divide-y divide-slate-100">
          {s.rows.map(row => (
            <li key={row.id} className="flex items-center gap-3 px-5 py-3">
              {s.editId === row.id ? (
                <>
                  <input
                    className={inputCls + " flex-1"}
                    value={s.editLabel}
                    onChange={e => update({ editLabel: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter") void handleEdit(row); if (e.key === "Escape") update({ editId: null }); }}
                    autoFocus
                  />
                  <button onClick={() => void handleEdit(row)} disabled={s.editSaving}
                    className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors" title="Save">
                    <Check size={14} />
                  </button>
                  <button onClick={() => update({ editId: null })}
                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors" title="Cancel">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-700">{row.name}</span>
                  <button onClick={() => update({ editId: row.id, editLabel: row.name })}
                    className="p-1.5 text-slate-400 hover:text-brand transition-colors" title="Edit">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => void handleDelete(row)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </li>
          ))}
          {s.rows.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-slate-400">
              No root causes defined yet. Add one above.
            </li>
          )}
        </ul>
      )}
      {s.addLabel !== null && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <input className={inputCls + " flex-1"} placeholder="e.g. Human Error, Equipment Failure…"
            value={s.addLabel} onChange={e => update({ addLabel: e.target.value })}
            onKeyDown={e => { if (e.key === "Enter") void handleAdd(); if (e.key === "Escape") update({ addLabel: null }); }}
            autoFocus />
          <button onClick={() => void handleAdd()} disabled={s.addSaving || !s.addLabel.trim()}
            className="px-3 py-2 text-sm font-medium bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
            {s.addSaving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => update({ addLabel: null })}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type DataTab = "event-types" | "workflow-statuses" | "root-causes";

const DATA_TABS: { key: DataTab; label: string }[] = [
  { key: "event-types",        label: "Event Types"       },
  { key: "workflow-statuses",  label: "Workflow Statuses" },
  { key: "root-causes",        label: "Root Causes"       },
];

export default function CustomizeDataPage() {
  const { clientId } = useClientId();
  const [tab, setTab] = useState<DataTab>("event-types");

  return (
    <div className="pt-8 sm:pt-10 px-4 sm:px-8 pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand">
          <Database className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Customize Your Data</h1>
      </div>
      <div className="mb-6">
        <p className="text-slate-500">Define event types and workflow statuses for your records.</p>
        <p className="inline-flex items-center gap-1 text-sm text-slate-400 mt-0.5">
          <Lock size={11} />
          System defaults are read-only.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6">
        {DATA_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              t.key === tab
                ? "bg-brand text-brand-text"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!clientId ? (
        <p className="text-sm text-slate-400">Select a client above to manage data.</p>
      ) : (
        <>
          {tab === "event-types"       && <EventTypesSection       clientId={clientId} />}
          {tab === "workflow-statuses" && <WorkflowStatusesSection clientId={clientId} />}
          {tab === "root-causes"       && <RootCausesSection       clientId={clientId} />}
        </>
      )}
    </div>
  );
}
