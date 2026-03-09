"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FlaskConical, Sparkles, Loader2 } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useToast } from "@/components/toast-context";
import { getClientUsers, getEventTypes, getWorkflowStatuses, getRootCauseTaxonomy, aiCategorize } from "@/lib/api";
import type { ClientUserDto, EventTypeDto, WorkflowStatusDto, RootCauseTaxonomyItemDto } from "@/lib/types";

function nowIsoFromLocalInput(v: string) {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

const inputBase =
  "w-full px-3.5 py-2.5 text-sm text-slate-800 rounded-xl bg-slate-50 " +
  "focus:bg-white focus:outline-none focus:ring-2 transition-all " +
  "placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed";

const inputCls = inputBase +
  " border border-slate-200 focus:ring-brand/40 focus:border-brand";

const inputErrCls = inputBase +
  " border border-red-400 focus:ring-red-400/30 focus:border-red-400";

// ── Small helpers ─────────────────────────────────────────────────

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="text-xs text-slate-700">{value}</div>
    </div>
  );
}

function SkeletonField() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
      <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  mode: "create" | "edit";
  loading: boolean;
  fetching: boolean;
  title: string;
  eventTypeId: number;
  workflowStatusId: number;
  occurredAt: string;
  location: string;
  description: string;
  ownerUserId: number | null;
  reportedByDisplayName: string | null;
  externalReporterName?: string | null;
  externalReporterContact?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rootCauseId: number | null;
  correctiveAction: string | null;

  setTitle: (v: string) => void;
  setEventTypeId: (v: number) => void;
  setWorkflowStatusId: (v: number) => void;
  setOccurredAt: (v: string) => void;
  setLocation: (v: string) => void;
  setDescription: (v: string) => void;
  setOwnerUserId: (v: number | null) => void;
  setRootCauseId: (v: number | null) => void;
  setCorrectiveAction: (v: string | null) => void;

  submitted: boolean;
  onSave: () => Promise<void> | void;
  saveError: string;
  readOnly?: boolean;
};

// ── Form ──────────────────────────────────────────────────────────

export function EventDetailsForm(props: Props) {
  const {
    mode, loading, fetching,
    title, eventTypeId, workflowStatusId, occurredAt, location, description, ownerUserId,
    reportedByDisplayName, externalReporterName, externalReporterContact, createdAt, updatedAt,
    rootCauseId, correctiveAction,
    setTitle, setEventTypeId, setWorkflowStatusId, setOccurredAt, setLocation, setDescription, setOwnerUserId,
    setRootCauseId, setCorrectiveAction,
    submitted, onSave, saveError, readOnly,
  } = props;

  const { clientId } = useClientId();
  const toast = useToast();
  const isNew = mode === "create";
  const [aiSuggesting, setAiSuggesting] = useState(false);

  const [typeOptions, setTypeOptions]     = useState<EventTypeDto[]>([]);
  const [statusOptions, setStatusOptions] = useState<WorkflowStatusDto[]>([]);
  const [userOptions, setUserOptions]     = useState<ClientUserDto[]>([]);
  const [rootCauseOptions, setRootCauseOptions] = useState<RootCauseTaxonomyItemDto[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLookupsLoading(true);
    Promise.all([
      getEventTypes(clientId),
      getWorkflowStatuses(clientId),
      getClientUsers(clientId),
      getRootCauseTaxonomy(clientId).catch(() => []),
    ]).then(([types, statuses, users, rootCauses]) => {
      setTypeOptions(types);
      setStatusOptions(statuses);
      setUserOptions(users.filter(u => u.isActive && !u.isSuperAdmin));
      setRootCauseOptions(rootCauses as RootCauseTaxonomyItemDto[]);
    }).catch(() => {
      // selects stay empty
    }).finally(() => {
      setLookupsLoading(false);
    });
  }, [clientId]);

  async function handleAiSuggest() {
    if (!clientId || !title.trim() || !description.trim()) {
      toast.error("Enter a title and description before using AI Suggest.");
      return;
    }
    setAiSuggesting(true);
    try {
      const result = await aiCategorize(title, description, clientId);
      if (result.suggestedEventTypeId && result.eventTypeConfidence > 0.5) {
        setEventTypeId(result.suggestedEventTypeId);
      }
      if (result.suggestedRootCauseId && result.rootCauseConfidence > 0.5) {
        setRootCauseId(result.suggestedRootCauseId);
      }
      const parts: string[] = [];
      if (result.suggestedEventTypeName)
        parts.push(`Type: ${result.suggestedEventTypeName} (${(result.eventTypeConfidence * 100).toFixed(0)}%)`);
      if (result.suggestedRootCauseName)
        parts.push(`Root Cause: ${result.suggestedRootCauseName} (${(result.rootCauseConfidence * 100).toFixed(0)}%)`);
      toast.success(parts.length > 0 ? `AI suggests: ${parts.join(", ")}` : result.reasoning);
    } catch (err: any) {
      toast.error(err?.message ?? "AI suggestion failed");
    }
    setAiSuggesting(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

      {/* ── Metadata strip (edit mode, loaded) ─────────────────── */}
      {!isNew && !fetching && (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mb-6">
          <MetaItem
            label="Reported By"
            value={
              reportedByDisplayName
                ? reportedByDisplayName
                : externalReporterName
                  ? (
                    <span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 mr-1.5">External</span>
                      {externalReporterName}
                      {externalReporterContact && (
                        <span className="block text-xs text-slate-400 mt-0.5">{externalReporterContact}</span>
                      )}
                    </span>
                  )
                  : <span className="italic text-slate-400">External Submission</span>
            }
          />
          {createdAt && (
            <MetaItem label="Created" value={new Date(createdAt).toLocaleString()} />
          )}
          {updatedAt && (
            <MetaItem label="Last Updated" value={new Date(updatedAt).toLocaleString()} />
          )}
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────────────── */}
      {fetching ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
          </div>
          <SkeletonField />
          <SkeletonField />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
            <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        </div>

      ) : (

        /* ── Form ───────────────────────────────────────────────── */
        <form
          onSubmit={(e) => { e.preventDefault(); if (!readOnly) void onSave(); }}
          className="space-y-5"
        >
          <fieldset disabled={!!readOnly} className="contents">
          {/* Title */}
          <Field
            label="Title"
            required
            error={submitted && !title.trim() ? "Title is required." : undefined}
          >
            <input
              className={submitted && !title.trim() ? inputErrCls : inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the event"
            />
          </Field>

          {/* Row 1: Type + Occurred At */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Event Type">
              <div className="flex gap-2">
              <select
                className={inputCls}
                value={eventTypeId}
                onChange={(e) => setEventTypeId(Number(e.target.value))}
                disabled={lookupsLoading}
              >
                {lookupsLoading ? (
                  <option>Loading…</option>
                ) : (
                  typeOptions.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))
                )}
              </select>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={aiSuggesting || lookupsLoading}
                  className="shrink-0 px-3 py-2 text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-100 disabled:opacity-50 transition flex items-center gap-1.5"
                  title="AI Suggest event type & root cause"
                >
                  {aiSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AI
                </button>
              )}
              </div>
            </Field>

            <Field label="Occurred At">
              <input
                className={inputCls}
                type="datetime-local"
                value={occurredAt.slice(0, 16)}
                onChange={(e) => setOccurredAt(nowIsoFromLocalInput(e.target.value))}
              />
            </Field>
          </div>

          {/* Row 2: Status + Owner (edit only) */}
          {!isNew && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Status">
                <select
                  className={inputCls}
                  value={workflowStatusId}
                  onChange={(e) => setWorkflowStatusId(Number(e.target.value))}
                  disabled={lookupsLoading}
                >
                  {lookupsLoading ? (
                    <option>Loading…</option>
                  ) : (
                    statusOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  )}
                </select>
              </Field>

              <Field label="Owner (optional)">
                <select
                  className={inputCls}
                  value={ownerUserId ?? ""}
                  onChange={(e) => setOwnerUserId(e.target.value ? Number(e.target.value) : null)}
                  disabled={lookupsLoading}
                >
                  <option value="">— Unassigned —</option>
                  {userOptions.map(u => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {/* Location */}
          <Field
            label="Location"
            required
            error={submitted && !location.trim() ? "Location is required." : undefined}
          >
            <input
              className={submitted && !location.trim() ? inputErrCls : inputCls}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. I-80 MM 225, Dallas Distribution Hub"
            />
          </Field>

          {/* Description */}
          <Field
            label="Description"
            required
            error={submitted && !description.trim() ? "Description is required." : undefined}
          >
            <textarea
              className={`${submitted && !description.trim() ? inputErrCls : inputCls} resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe what happened, any contributing factors, and immediate actions taken."
            />
          </Field>

          {/* Investigation card — edit mode only */}
          {!isNew && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <FlaskConical size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Investigation</span>
              </div>

              <Field label="Root Cause">
                {rootCauseOptions.length === 0 ? (
                  <select className={inputCls} disabled>
                    <option>No root causes defined — add them in Settings → Data</option>
                  </select>
                ) : (
                  <select
                    className={inputCls}
                    value={rootCauseId ?? ""}
                    onChange={e => setRootCauseId(e.target.value ? Number(e.target.value) : null)}
                    disabled={lookupsLoading}
                  >
                    <option value="">— Select root cause —</option>
                    {rootCauseOptions.map(rc => (
                      <option key={rc.id} value={rc.id}>{rc.name}</option>
                    ))}
                  </select>
                )}
              </Field>

              <Field label="Corrective Action">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="Describe the corrective action taken…"
                  value={correctiveAction ?? ""}
                  onChange={e => setCorrectiveAction(e.target.value || null)}
                />
              </Field>
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <div className="flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          )}

          {/* Actions — only shown in create mode; edit mode uses the sticky bar */}
          {isNew && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-semibold bg-brand text-brand-text rounded-xl hover:bg-brand-hover active:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? "Creating…" : "Create Event"}
              </button>
            </div>
          )}
          </fieldset>
        </form>
      )}
    </div>
  );
}
