"use client";

import { useEffect, useState } from "react";
import {
  Plus, Zap, Trash2, Pencil, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, XCircle, Clock, History,
} from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useToast } from "@/components/toast-context";
import {
  getWorkflowRules, createWorkflowRule, updateWorkflowRule,
  deleteWorkflowRule, toggleWorkflowRule, getWorkflowRuleExecutions,
  getEventTypes, getWorkflowStatuses, getClientUsers, getRootCauseTaxonomy,
} from "@/lib/api";
import type {
  WorkflowRuleDto, WorkflowCondition, WorkflowAction, WorkflowActionConfig,
  WorkflowRuleExecutionDto, EventTypeDto, WorkflowStatusDto, ClientUserDto, RootCauseTaxonomyItemDto,
} from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";

// ── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "event.created",        label: "Event Created",        desc: "Fires when a new event is created" },
  { value: "event.updated",        label: "Event Updated",        desc: "Fires when any event field changes" },
  { value: "event.status_changed", label: "Status Changed",       desc: "Fires when event status transitions" },
  { value: "event.assigned",       label: "Event Assigned",       desc: "Fires when event owner changes" },
  { value: "event.closed",         label: "Event Closed",         desc: "Fires when event transitions to a closed status" },
];

const CONDITION_FIELDS = [
  { value: "event_type_id",      label: "Event Type",      type: "select" },
  { value: "workflow_status_id", label: "Status",           type: "select" },
  { value: "location",           label: "Location",         type: "text" },
  { value: "title",              label: "Title",            type: "text" },
  { value: "description",        label: "Description",      type: "text" },
  { value: "owner_user_id",      label: "Owner",            type: "select" },
  { value: "root_cause_id",      label: "Root Cause",       type: "select" },
];

const TEXT_OPERATORS = [
  { value: "contains",     label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "equals",       label: "equals" },
  { value: "not_equals",   label: "does not equal" },
  { value: "starts_with",  label: "starts with" },
];

const SELECT_OPERATORS = [
  { value: "equals",     label: "is" },
  { value: "not_equals", label: "is not" },
  { value: "is_null",    label: "is empty" },
  { value: "is_not_null",label: "is not empty" },
  { value: "in",         label: "is one of" },
];

const ACTION_TYPES = [
  { value: "assign_owner",    label: "Assign Owner",      icon: "👤" },
  { value: "change_status",   label: "Change Status",     icon: "🔄" },
  { value: "create_task",     label: "Create Task",       icon: "✓" },
  { value: "send_notification", label: "Send Notification", icon: "🔔" },
  { value: "add_comment",     label: "Add Comment",       icon: "💬" },
  { value: "set_root_cause",  label: "Set Root Cause",    icon: "🔍" },
];

const inputCls =
  "w-full px-3 py-2 text-sm text-slate-800 rounded-lg bg-slate-50 border border-slate-200 " +
  "focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all " +
  "placeholder:text-slate-400 disabled:opacity-60";

// ── Main Page ────────────────────────────────────────────────────────────────

export default function WorkflowRulesPage() {
  const { clientId } = useClientId();
  const toast = useToast();

  const [rules, setRules] = useState<WorkflowRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRuleDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowRuleDto | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [executions, setExecutions] = useState<WorkflowRuleExecutionDto[]>([]);
  const [execLoading, setExecLoading] = useState(false);

  // Lookup data
  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([]);
  const [statuses, setStatuses] = useState<WorkflowStatusDto[]>([]);
  const [users, setUsers] = useState<ClientUserDto[]>([]);
  const [rootCauses, setRootCauses] = useState<RootCauseTaxonomyItemDto[]>([]);

  async function load() {
    if (!clientId) return;
    setLoading(true);
    try {
      const [r, et, ws, u, rc] = await Promise.all([
        getWorkflowRules(clientId),
        getEventTypes(clientId).catch(() => [] as EventTypeDto[]),
        getWorkflowStatuses(clientId).catch(() => [] as WorkflowStatusDto[]),
        getClientUsers(clientId).catch(() => [] as ClientUserDto[]),
        getRootCauseTaxonomy(clientId).catch(() => [] as RootCauseTaxonomyItemDto[]),
      ]);
      setRules(r);
      setEventTypes(et);
      setStatuses(ws);
      setUsers(u.filter(x => x.isActive && !x.isSuperAdmin));
      setRootCauses(rc);
    } catch {
      toast.error("Failed to load workflow rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [clientId]); // eslint-disable-line

  async function handleToggle(rule: WorkflowRuleDto) {
    try {
      const res = await toggleWorkflowRule(clientId, rule.id);
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: res.isActive } : r));
      toast.success(res.isActive ? "Rule enabled" : "Rule disabled");
    } catch {
      toast.error("Failed to toggle rule.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteWorkflowRule(clientId, deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Rule deleted");
      await load();
    } catch {
      toast.error("Failed to delete rule.");
    }
  }

  async function loadHistory() {
    if (!clientId) return;
    setExecLoading(true);
    try {
      setExecutions(await getWorkflowRuleExecutions(clientId));
    } catch {
      toast.error("Failed to load execution history.");
    } finally {
      setExecLoading(false);
    }
  }

  function openNew() { setEditingRule(null); setShowModal(true); }
  function openEdit(rule: WorkflowRuleDto) { setEditingRule(rule); setShowModal(true); }

  return (
    <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-steel-white">Workflow Rules</h1>
      </div>
      <p className="text-slate-500 mb-8">
        Automate event handling — auto-assign owners, change statuses, create tasks, and send notifications.
      </p>

      <div className="flex items-center justify-end gap-2 mb-6">
        <button
          onClick={() => { setShowHistory(!showHistory); if (!showHistory) void loadHistory(); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <History size={14} />
          {showHistory ? "Hide History" : "History"}
        </button>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
        >
          <Plus size={14} />
          New Rule
        </button>
      </div>

      {/* Execution History */}
      {showHistory && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Executions</h3>
          {execLoading ? (
            <div className="h-20 flex items-center justify-center text-sm text-slate-400">Loading...</div>
          ) : executions.length === 0 ? (
            <p className="text-sm text-slate-400">No executions yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {executions.map(e => (
                <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  {e.success ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> : <XCircle size={14} className="text-red-500 shrink-0" />}
                  <span className="font-medium text-slate-700">{e.workflowRuleName ?? `Rule #${e.workflowRuleId}`}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-500">{e.eventPublicId ?? `Event #${e.eventId}`}</span>
                  <span className="px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-500">{e.triggerType}</span>
                  <span className="text-xs text-slate-400 ml-auto">{new Date(e.executedAt).toLocaleString()}</span>
                  {!e.success && e.errorMessage && (
                    <span className="text-xs text-red-500 truncate max-w-48" title={e.errorMessage}>{e.errorMessage}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Zap size={32} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No workflow rules yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Create rules to automatically assign owners, change statuses, create tasks, and send notifications when events match your conditions.
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors mt-4"
          >
            <Plus size={14} />
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              eventTypes={eventTypes}
              statuses={statuses}
              users={users}
              rootCauses={rootCauses}
              onEdit={() => openEdit(rule)}
              onToggle={() => handleToggle(rule)}
              onDelete={() => setDeleteTarget(rule)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <RuleModal
          rule={editingRule}
          clientId={clientId}
          eventTypes={eventTypes}
          statuses={statuses}
          users={users}
          rootCauses={rootCauses}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); void load(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Rule"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

// ── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule, eventTypes, statuses, users, rootCauses,
  onEdit, onToggle, onDelete,
}: {
  rule: WorkflowRuleDto;
  eventTypes: EventTypeDto[];
  statuses: WorkflowStatusDto[];
  users: ClientUserDto[];
  rootCauses: RootCauseTaxonomyItemDto[];
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const trigger = TRIGGER_OPTIONS.find(t => t.value === rule.triggerType);
  const conditions = rule.conditions as WorkflowCondition[];
  const actions = rule.actions as WorkflowAction[];

  return (
    <div className={`bg-white border rounded-xl p-4 transition-colors ${rule.isActive ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className={rule.isActive ? "text-amber-500" : "text-slate-400"} />
            <h3 className="font-semibold text-slate-800 truncate">{rule.name}</h3>
            {rule.stopOnMatch && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-600 border border-amber-200">STOP</span>
            )}
          </div>
          {rule.description && <p className="text-xs text-slate-500 mb-2">{rule.description}</p>}

          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {trigger?.label ?? rule.triggerType}
            </span>
            {conditions.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {formatCondition(c, eventTypes, statuses, users, rootCauses)}
              </span>
            ))}
            <span className="text-xs text-slate-400 self-center">→</span>
            {actions.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                {formatAction(a, statuses, users, rootCauses)}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>{rule.executionCount} executions</span>
            {rule.failedExecutionCount > 0 && (
              <span className="text-red-400">{rule.failedExecutionCount} failed</span>
            )}
            {rule.createdByDisplayName && <span>by {rule.createdByDisplayName}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title={rule.isActive ? "Disable" : "Enable"}>
            {rule.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-slate-400" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Edit">
            <Pencil size={14} className="text-slate-400" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Format Helpers ───────────────────────────────────────────────────────────

function formatCondition(c: WorkflowCondition, eventTypes: EventTypeDto[], statuses: WorkflowStatusDto[], users: ClientUserDto[], rootCauses: RootCauseTaxonomyItemDto[]): string {
  const fieldLabel = CONDITION_FIELDS.find(f => f.value === c.field)?.label ?? c.field;
  const op = c.operator;

  if (op === "is_null") return `${fieldLabel} is empty`;
  if (op === "is_not_null") return `${fieldLabel} is set`;

  let val = c.value ?? "";
  if (c.field === "event_type_id") val = eventTypes.find(t => String(t.id) === val)?.name ?? val;
  if (c.field === "workflow_status_id") val = statuses.find(s => String(s.id) === val)?.name ?? val;
  if (c.field === "owner_user_id") val = users.find(u => String(u.id) === val)?.displayName ?? val;
  if (c.field === "root_cause_id") val = rootCauses.find(r => String(r.id) === val)?.name ?? val;

  const opLabel = op === "equals" ? "=" : op === "not_equals" ? "≠" : op;
  return `${fieldLabel} ${opLabel} "${val}"`;
}

function formatAction(a: WorkflowAction, statuses: WorkflowStatusDto[], users: ClientUserDto[], rootCauses: RootCauseTaxonomyItemDto[]): string {
  const at = ACTION_TYPES.find(t => t.value === a.type);
  const label = at?.label ?? a.type;
  const c = a.config;

  switch (a.type) {
    case "assign_owner": return `Assign → ${users.find(u => u.id === c.userId)?.displayName ?? "User"}`;
    case "change_status": return `Status → ${statuses.find(s => s.id === c.workflowStatusId)?.name ?? "Status"}`;
    case "create_task": return `Task: ${c.taskTitle ?? "New Task"}`;
    case "send_notification": return `Notify ${(c.notifyRoles?.length ?? 0) + (c.notifyUserIds?.length ?? 0)} targets`;
    case "add_comment": return "Auto-comment";
    case "set_root_cause": return `Root cause → ${rootCauses.find(r => r.id === c.rootCauseId)?.name ?? ""}`;
    default: return label;
  }
}

// ── Rule Modal ───────────────────────────────────────────────────────────────

function RuleModal({
  rule, clientId, eventTypes, statuses, users, rootCauses, onClose, onSaved,
}: {
  rule: WorkflowRuleDto | null;
  clientId: number;
  eventTypes: EventTypeDto[];
  statuses: WorkflowStatusDto[];
  users: ClientUserDto[];
  rootCauses: RootCauseTaxonomyItemDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = rule !== null;

  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [triggerType, setTriggerType] = useState(rule?.triggerType ?? "event.created");
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [stopOnMatch, setStopOnMatch] = useState(rule?.stopOnMatch ?? false);
  const [conditions, setConditions] = useState<WorkflowCondition[]>(rule?.conditions ?? []);
  const [actions, setActions] = useState<WorkflowAction[]>(rule?.actions ?? []);
  const [saving, setSaving] = useState(false);

  function addCondition() {
    setConditions(prev => [...prev, { field: "event_type_id", operator: "equals", value: "" }]);
  }

  function removeCondition(i: number) {
    setConditions(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateCondition(i: number, patch: Partial<WorkflowCondition>) {
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function addAction() {
    setActions(prev => [...prev, { type: "assign_owner", config: {} }]);
  }

  function removeAction(i: number) {
    setActions(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateAction(i: number, patch: Partial<WorkflowAction>) {
    setActions(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  }

  function updateActionConfig(i: number, configPatch: Partial<WorkflowActionConfig>) {
    setActions(prev =>
      prev.map((a, idx) => idx === i ? { ...a, config: { ...a.config, ...configPatch } } : a)
    );
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Name is required."); return; }
    if (actions.length === 0) { toast.error("At least one action is required."); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        triggerType,
        isActive,
        stopOnMatch,
        conditions,
        actions,
      };
      if (isEdit) {
        await updateWorkflowRule(clientId, rule!.id, payload);
        toast.success("Rule updated");
      } else {
        await createWorkflowRule(clientId, payload);
        toast.success("Rule created");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save rule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{isEdit ? "Edit Rule" : "New Workflow Rule"}</h3>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name *</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Auto-assign vehicle accidents" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
            <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">When</label>
            <select className={inputCls} value={triggerType} onChange={e => setTriggerType(e.target.value)}>
              {TRIGGER_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
              ))}
            </select>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">If (all match)</label>
              <button onClick={addCondition} className="text-xs font-semibold text-brand hover:underline">+ Add Condition</button>
            </div>
            {conditions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No conditions — rule will fire on every trigger.</p>
            ) : (
              <div className="space-y-2">
                {conditions.map((c, i) => (
                  <ConditionRow
                    key={i}
                    condition={c}
                    eventTypes={eventTypes}
                    statuses={statuses}
                    users={users}
                    rootCauses={rootCauses}
                    onChange={patch => updateCondition(i, patch)}
                    onRemove={() => removeCondition(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Then</label>
              <button onClick={addAction} className="text-xs font-semibold text-brand hover:underline">+ Add Action</button>
            </div>
            {actions.length === 0 ? (
              <p className="text-xs text-red-400">At least one action is required.</p>
            ) : (
              <div className="space-y-2">
                {actions.map((a, i) => (
                  <ActionRow
                    key={i}
                    action={a}
                    statuses={statuses}
                    users={users}
                    rootCauses={rootCauses}
                    onChange={patch => updateAction(i, patch)}
                    onConfigChange={patch => updateActionConfig(i, patch)}
                    onRemove={() => removeAction(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer" title="When checked, no further rules are evaluated after this one matches">
              <input type="checkbox" checked={stopOnMatch} onChange={e => setStopOnMatch(e.target.checked)} className="rounded" />
              Stop on match
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : isEdit ? "Update Rule" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Condition Row ────────────────────────────────────────────────────────────

function ConditionRow({
  condition, eventTypes, statuses, users, rootCauses, onChange, onRemove,
}: {
  condition: WorkflowCondition;
  eventTypes: EventTypeDto[];
  statuses: WorkflowStatusDto[];
  users: ClientUserDto[];
  rootCauses: RootCauseTaxonomyItemDto[];
  onChange: (patch: Partial<WorkflowCondition>) => void;
  onRemove: () => void;
}) {
  const fieldDef = CONDITION_FIELDS.find(f => f.value === condition.field);
  const isSelect = fieldDef?.type === "select";
  const operators = isSelect ? SELECT_OPERATORS : TEXT_OPERATORS;
  const needsValue = !["is_null", "is_not_null"].includes(condition.operator);

  function getOptions(): { value: string; label: string }[] {
    switch (condition.field) {
      case "event_type_id": return eventTypes.map(t => ({ value: String(t.id), label: t.name }));
      case "workflow_status_id": return statuses.map(s => ({ value: String(s.id), label: s.name }));
      case "owner_user_id": return users.map(u => ({ value: String(u.id), label: u.displayName }));
      case "root_cause_id": return rootCauses.map(r => ({ value: String(r.id), label: r.name }));
      default: return [];
    }
  }

  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
      <select className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" value={condition.field}
        onChange={e => onChange({ field: e.target.value, value: "" })}>
        {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" value={condition.operator}
        onChange={e => onChange({ operator: e.target.value })}>
        {operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {needsValue && (
        isSelect ? (
          <select className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" value={condition.value ?? ""}
            onChange={e => onChange({ value: e.target.value })}>
            <option value="">— Select —</option>
            {getOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" value={condition.value ?? ""}
            onChange={e => onChange({ value: e.target.value })} placeholder="Value" />
        )
      )}

      <button onClick={onRemove} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
    </div>
  );
}

// ── Action Row ───────────────────────────────────────────────────────────────

function ActionRow({
  action, statuses, users, rootCauses, onChange, onConfigChange, onRemove,
}: {
  action: WorkflowAction;
  statuses: WorkflowStatusDto[];
  users: ClientUserDto[];
  rootCauses: RootCauseTaxonomyItemDto[];
  onChange: (patch: Partial<WorkflowAction>) => void;
  onConfigChange: (patch: Partial<WorkflowActionConfig>) => void;
  onRemove: () => void;
}) {
  const c = action.config;

  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
      <div className="flex items-center gap-2">
        <select className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium" value={action.type}
          onChange={e => onChange({ type: e.target.value, config: {} })}>
          {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.icon} {a.label}</option>)}
        </select>

        <div className="flex-1" />
        <button onClick={onRemove} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
      </div>

      {/* Config fields based on type */}
      {action.type === "assign_owner" && (
        <select className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" value={c.userId ?? ""}
          onChange={e => onConfigChange({ userId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">— Select user —</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
        </select>
      )}

      {action.type === "change_status" && (
        <select className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" value={c.workflowStatusId ?? ""}
          onChange={e => onConfigChange({ workflowStatusId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">— Select status —</option>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {action.type === "create_task" && (
        <div className="space-y-2">
          <input className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            placeholder="Task title *" value={c.taskTitle ?? ""} onChange={e => onConfigChange({ taskTitle: e.target.value })} />
          <input className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            placeholder="Task description (optional)" value={c.taskDescription ?? ""} onChange={e => onConfigChange({ taskDescription: e.target.value })} />
          <div className="flex gap-2">
            <select className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" value={c.taskAssignedToUserId ?? ""}
              onChange={e => onConfigChange({ taskAssignedToUserId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">— Assign to (optional) —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
            <input className="w-24 px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" type="number" min={0}
              placeholder="Due in days" value={c.taskDueDaysFromNow ?? ""} onChange={e => onConfigChange({ taskDueDaysFromNow: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>
      )}

      {action.type === "send_notification" && (
        <div className="space-y-2">
          <input className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            placeholder="Notification message" value={c.notificationMessage ?? ""} onChange={e => onConfigChange({ notificationMessage: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            {["Manager", "Admin", "Investigator"].map(role => (
              <label key={role} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded"
                  checked={c.notifyRoles?.includes(role) ?? false}
                  onChange={e => {
                    const current = c.notifyRoles ?? [];
                    onConfigChange({ notifyRoles: e.target.checked ? [...current, role] : current.filter(r => r !== role) });
                  }} />
                {role}s
              </label>
            ))}
          </div>
        </div>
      )}

      {action.type === "add_comment" && (
        <textarea className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white resize-none" rows={2}
          placeholder="Comment body" value={c.commentBody ?? ""} onChange={e => onConfigChange({ commentBody: e.target.value })} />
      )}

      {action.type === "set_root_cause" && (
        <select className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" value={c.rootCauseId ?? ""}
          onChange={e => onConfigChange({ rootCauseId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">— Select root cause —</option>
          {rootCauses.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      )}
    </div>
  );
}
