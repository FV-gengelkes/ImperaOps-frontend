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
import { getLookups, createLookup, updateLookup, deleteLookup } from "@/lib/api";
import type { IncidentLookupDto } from "@/lib/types";
import { ModuleTabs } from "../module-tabs";

// ── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
  "focus:border-transparent transition";

// ── Sortable client row ──────────────────────────────────────────────────────

function SortableRow({
  row,
  isEditing,
  editLabel,
  editSaving,
  onStartEdit,
  onLabelChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  row: IncidentLookupDto;
  isEditing: boolean;
  editLabel: string;
  editSaving: boolean;
  onStartEdit: () => void;
  onLabelChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-5 py-3 ${isDragging ? "opacity-50 bg-slate-50" : ""}`}
    >
      {/* Drag handle */}
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
              onKeyDown={e => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
            />
          </div>
          <button
            onClick={onSaveEdit}
            disabled={editSaving}
            className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
            title="Save"
          >
            <Check size={14} />
          </button>
          <button
            onClick={onCancelEdit}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-slate-700">{row.label}</span>
          <span className="text-xs text-slate-500 tabular-nums">{row.count.toLocaleString()}</span>
          <button
            onClick={onStartEdit}
            className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            disabled={row.count > 0}
            className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={row.count > 0 ? `Cannot delete — ${row.count} incident(s) use this value` : "Delete"}
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
    </li>
  );
}

// ── Section state ────────────────────────────────────────────────────────────

type SectionState = {
  rows: IncidentLookupDto[];
  loading: boolean;
  error: string;
  addLabel: string | null;
  addSaving: boolean;
  editId: string | null;
  editLabel: string;
  editSaving: boolean;
};

function initSection(): SectionState {
  return {
    rows: [], loading: true, error: "",
    addLabel: null, addSaving: false,
    editId: null, editLabel: "", editSaving: false,
  };
}

// ── LookupSection ────────────────────────────────────────────────────────────

function LookupSection({
  title, fieldKey, clientId,
}: {
  title: string; fieldKey: string; clientId: string;
}) {
  const [s, setS] = useState<SectionState>(initSection);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function update(patch: Partial<SectionState>) {
    setS(prev => ({ ...prev, ...patch }));
  }

  async function load() {
    update({ loading: true, error: "" });
    try {
      const rows = await getLookups(clientId, fieldKey);
      update({ rows, loading: false });
    } catch (e: unknown) {
      update({ loading: false, error: (e as Error).message ?? "Failed to load." });
    }
  }

  useEffect(() => {
    if (clientId) void load();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    if (!s.addLabel?.trim()) return;
    update({ addSaving: true });
    try {
      await createLookup(clientId, fieldKey, s.addLabel.trim());
      update({ addLabel: null, addSaving: false });
      await load();
    } catch (e: unknown) {
      update({ addSaving: false, error: (e as Error).message ?? "Create failed." });
    }
  }

  async function handleEdit(row: IncidentLookupDto) {
    update({ editSaving: true });
    try {
      await updateLookup(row.id, clientId, s.editLabel.trim() || row.label, row.sortOrder);
      update({ editId: null, editLabel: "", editSaving: false });
      await load();
    } catch (e: unknown) {
      update({ editSaving: false, error: (e as Error).message ?? "Update failed." });
    }
  }

  async function handleDelete(row: IncidentLookupDto) {
    if (!confirm(`Delete "${row.label}"?`)) return;
    try {
      await deleteLookup(row.id, clientId);
      await load();
    } catch (e: unknown) {
      update({ error: (e as Error).message ?? "Delete failed." });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const systemRows = s.rows.filter(r => r.isSystem);
    const clientRows = s.rows.filter(r => !r.isSystem);
    const originalRows = s.rows;

    const oldIdx = clientRows.findIndex(r => r.id === active.id);
    const newIdx = clientRows.findIndex(r => r.id === over.id);
    const reordered = arrayMove(clientRows, oldIdx, newIdx);

    const maxSystemOrder = systemRows.reduce((max, r) => Math.max(max, r.sortOrder), 0);
    const updated = reordered.map((row, i) => ({
      ...row,
      sortOrder: maxSystemOrder + i + 1,
    }));

    // Optimistic UI update
    update({ rows: [...systemRows, ...updated] });

    try {
      await Promise.all(
        updated
          .filter(row => {
            const orig = clientRows.find(r => r.id === row.id);
            return orig && orig.sortOrder !== row.sortOrder;
          })
          .map(row => updateLookup(row.id, clientId, row.label, row.sortOrder)),
      );
    } catch (e: unknown) {
      update({ rows: originalRows, error: "Failed to save order." });
    }
  }

  const systemRows = s.rows.filter(r => r.isSystem);
  const clientRows = s.rows.filter(r => !r.isSystem);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {s.addLabel === null && (
          <button
            onClick={() => update({ addLabel: "" })}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        )}
      </div>

      {/* Error */}
      {s.error && (
        <p className="px-5 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{s.error}</p>
      )}

      {/* Loading */}
      {s.loading && (
        <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
      )}

      {/* Rows */}
      {!s.loading && (
        <ul className="divide-y divide-slate-100">

          {/* System rows — fixed, not draggable */}
          {systemRows.map(row => (
            <li key={row.id} className="flex items-center gap-3 px-5 py-3">
              <Lock size={13} className="text-slate-300 shrink-0 ml-[18px]" />
              <span className="flex-1 text-sm text-slate-400">{row.label}</span>
              <span className="text-xs text-slate-400 tabular-nums">{row.count.toLocaleString()}</span>
            </li>
          ))}

          {/* Client rows — sortable */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={clientRows.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              {clientRows.map(row => (
                <SortableRow
                  key={row.id}
                  row={row}
                  isEditing={s.editId === row.id}
                  editLabel={s.editLabel}
                  editSaving={s.editSaving}
                  onStartEdit={() => update({ editId: row.id, editLabel: row.label })}
                  onLabelChange={v => update({ editLabel: v })}
                  onSaveEdit={() => void handleEdit(row)}
                  onCancelEdit={() => update({ editId: null })}
                  onDelete={() => void handleDelete(row)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {s.rows.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-slate-400">No entries yet.</li>
          )}
        </ul>
      )}

      {/* Add row */}
      {s.addLabel !== null && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <input
            className={inputCls + " flex-1"}
            placeholder="New label…"
            value={s.addLabel}
            onChange={e => update({ addLabel: e.target.value })}
            onKeyDown={e => {
              if (e.key === "Enter") void handleAdd();
              if (e.key === "Escape") update({ addLabel: null });
            }}
            autoFocus
          />
          <button
            onClick={() => void handleAdd()}
            disabled={s.addSaving || !s.addLabel.trim()}
            className="px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {s.addSaving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => update({ addLabel: null })}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CustomizeDataPage() {
  const { clientId } = useClientId();
  const [activeModule, setActiveModule] = useState("incidents");

  return (
    <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
          <Database className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Customize Your Data</h1>
      </div>
      <div className="mb-8">
        <p className="text-slate-500">Define custom dropdown values for your records.</p>
        <p className="inline-flex items-center gap-1 text-sm text-slate-400 mt-0.5">
          <Lock size={11} />
          System defaults are read-only.
        </p>
      </div>

      <ModuleTabs activeModule={activeModule} onChange={setActiveModule} />

      {!clientId ? (
        <p className="text-sm text-slate-400">Set a client ID above to manage lookups.</p>
      ) : activeModule === "incidents" ? (
        <div className="space-y-6">
          <LookupSection title="Incident Type" fieldKey="incident_type" clientId={clientId} />
          <LookupSection title="Status" fieldKey="status" clientId={clientId} />
        </div>
      ) : null}
    </div>
  );
}
