"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { getClientUsers, getLookups } from "@/lib/api";
import type { ClientUserDto, IncidentLookupDto } from "@/lib/types";

function nowIsoFromLocalInput(v: string) {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

const inputBase =
  "w-full px-3.5 py-2.5 text-sm text-slate-800 rounded-xl bg-slate-50 " +
  "focus:bg-white focus:outline-none focus:ring-2 transition-all " +
  "placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed";

const inputCls = inputBase +
  " border border-slate-200 focus:ring-indigo-500/40 focus:border-indigo-400";

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
  id: string;
  loading: boolean;
  fetching: boolean;
  type: number;
  status: number;
  occurredAt: string;
  location: string;
  description: string;
  ownerUserId: string | null;
  reportedByUserId: string;
  reportedByDisplayName: string | null;
  createdAt?: string;
  updatedAt?: string;

  setType: (v: number) => void;
  setStatus: (v: number) => void;
  setOccurredAt: (v: string) => void;
  setLocation: (v: string) => void;
  setDescription: (v: string) => void;
  setOwnerUserId: (v: string | null) => void;

  submitted: boolean;
  onSave: () => Promise<void> | void;
  saveError: string;
  success: string;
};

// ── Form ──────────────────────────────────────────────────────────

export function IncidentDetailsForm(props: Props) {
  const {
    mode, id, loading, fetching,
    type, status, occurredAt, location, description, ownerUserId,
    reportedByUserId, reportedByDisplayName, createdAt, updatedAt,
    setType, setStatus, setOccurredAt, setLocation, setDescription, setOwnerUserId,
    submitted, onSave, saveError, success,
  } = props;

  const { clientId } = useClientId();
  const isNew = mode === "create";

  const [typeOptions, setTypeOptions] = useState<IncidentLookupDto[]>([]);
  const [statusOptions, setStatusOptions] = useState<IncidentLookupDto[]>([]);
  const [userOptions, setUserOptions] = useState<ClientUserDto[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLookupsLoading(true);
    Promise.all([
      getLookups(clientId, "incident_type"),
      getLookups(clientId, "status"),
      getClientUsers(clientId),
    ]).then(([types, statuses, users]) => {
      setTypeOptions(types);
      setStatusOptions(statuses);
      setUserOptions(users);
    }).catch(() => {
      // Fall through — selects stay empty
    }).finally(() => {
      setLookupsLoading(false);
    });
  }, [clientId]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

      {/* ── Metadata strip (edit mode, loaded) ─────────────────── */}
      {!isNew && !fetching && (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mb-6">
          <MetaItem
            label="Reported By"
            value={reportedByDisplayName ?? "—"}
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
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
            <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        </div>

      ) : (

        /* ── Form ───────────────────────────────────────────────── */
        <form
          onSubmit={(e) => { e.preventDefault(); void onSave(); }}
          className="space-y-5"
        >
          {/* Row 1: Type + Occurred At */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Incident Type">
              <select
                className={inputCls}
                value={type}
                onChange={(e) => setType(Number(e.target.value))}
                disabled={lookupsLoading}
              >
                {lookupsLoading ? (
                  <option>Loading…</option>
                ) : (
                  typeOptions.map(l => (
                    <option key={l.id} value={l.value}>{l.label}</option>
                  ))
                )}
              </select>
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
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value))}
                  disabled={lookupsLoading}
                >
                  {lookupsLoading ? (
                    <option>Loading…</option>
                  ) : (
                    statusOptions.map(l => (
                      <option key={l.id} value={l.value}>{l.label}</option>
                    ))
                  )}
                </select>
              </Field>

              <Field label="Owner (optional)">
                <select
                  className={inputCls}
                  value={ownerUserId ?? ""}
                  onChange={(e) => setOwnerUserId(e.target.value || null)}
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

          {/* Save error */}
          {saveError && (
            <div className="flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {/* Actions — only shown in create mode; edit mode uses the sticky bar */}
          {isNew && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? "Saving…" : "Create Incident"}
              </button>
              <p className="text-xs text-slate-400 hidden sm:block">POST /api/v1/incidents</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
