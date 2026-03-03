"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertTriangle, CircleDot } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { createIncident, getIncidentByRef, updateIncident } from "@/lib/api";
import type { CreateIncidentCommand, IncidentDetailDto, UpdateIncidentRequest } from "@/lib/types";
import { IncidentDetailsForm } from "./incident-details-form";
import { CustomFieldsCard, type CustomFieldsCardHandle } from "./custom-fields-card";
import { AttachmentsCard } from "./attachments-card";
import { IncidentTimeline } from "./incident-timeline";
import { useClientGuard } from "@/hooks/use-client-guard";

function nowIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

// ── Dirty tracking ────────────────────────────────────────────────────────────

type FormSnapshot = {
  type: number;
  status: number;
  occurredAt: string;
  location: string;
  description: string;
  ownerUserId: string | null;
};

function snapshotEquals(a: FormSnapshot, b: FormSnapshot) {
  return (
    a.type === b.type &&
    a.status === b.status &&
    a.occurredAt.slice(0, 16) === b.occurredAt.slice(0, 16) &&
    a.location.trim() === b.location.trim() &&
    a.description.trim() === b.description.trim() &&
    a.ownerUserId === b.ownerUserId
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

type Tab = "details" | "attachments" | "activity";

const TABS: { key: Tab; label: string }[] = [
  { key: "details",     label: "Details"     },
  { key: "attachments", label: "Attachments" },
  { key: "activity",    label: "Activity"    },
];

function TabBar({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {TABS.map(t => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            t.key === tab
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IncidentDetailsPage() {
  const { clientId } = useClientId();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "0";
  const isNew = id === "0";

  const customFieldsRef = useRef<CustomFieldsCardHandle>(null);
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab | null) ?? "details";

  function navigateTab(t: Tab, replace = false) {
    const url = t === "details" ? `/incident/${id}/details` : `/incident/${id}/details?tab=${t}`;
    replace ? router.replace(url, { scroll: false }) : router.push(url, { scroll: false });
  }

  const [incidentClientId, setIncidentClientId] = useState<string>("");
  useClientGuard(isNew ? null : incidentClientId || null, "/incident/list");

  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(!isNew);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess]     = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [type, setType]               = useState<number>(1);
  const [status, setStatus]           = useState<number>(1);
  const [occurredAt, setOccurredAt]   = useState<string>(nowIso());
  const [location, setLocation]       = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [reportedByUserId, setReportedByUserId] = useState<string>("");
  const [createdAt, setCreatedAt]             = useState<string | undefined>(undefined);
  const [updatedAt, setUpdatedAt]             = useState<string | undefined>(undefined);
  const [referenceNumber, setReferenceNumber]           = useState<number>(0);
  const [incidentUuid, setIncidentUuid]                 = useState<string>("");
  const [reportedByDisplayName, setReportedByDisplayName] = useState<string | null>(null);

  const [savedForm, setSavedForm]               = useState<FormSnapshot | null>(null);
  const [isCustomFieldsDirty, setIsCustomFieldsDirty] = useState(false);

  const currentForm: FormSnapshot = { type, status, occurredAt, location, description, ownerUserId };
  const isFormDirty = savedForm !== null && !snapshotEquals(currentForm, savedForm);
  const isDirty     = !isNew && (isFormDirty || isCustomFieldsDirty);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    setLoadError(""); setSaveError(""); setSuccess("");
    if (isNew) {
      setReportedByUserId(crypto.randomUUID());
      setOwnerUserId(null); setStatus(1); setType(1);
      setOccurredAt(nowIso()); setLocation(""); setDescription("");
      setSavedForm(null);
    }
  }, [isNew]);

  async function loadExisting() {
    if (isNew || !clientId) return;
    setFetching(true);
    setLoadError("");
    try {
      const detail: IncidentDetailDto = await getIncidentByRef(parseInt(id, 10), clientId);
      setIncidentUuid(detail.id);
      setIncidentClientId(detail.clientId);
      setType(detail.type);
      setStatus(detail.status);
      setOccurredAt(detail.occurredAt);
      setLocation(detail.location);
      setDescription(detail.description);
      setOwnerUserId(detail.ownerUserId);
      setReportedByUserId(detail.reportedByUserId);
      setCreatedAt(detail.createdAt);
      setUpdatedAt(detail.updatedAt);
      setReferenceNumber(detail.referenceNumber);
      setReportedByDisplayName(detail.reportedByDisplayName ?? null);
      setSavedForm({
        type: detail.type, status: detail.status, occurredAt: detail.occurredAt,
        location: detail.location, description: detail.description, ownerUserId: detail.ownerUserId,
      });
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load incident.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => { void loadExisting(); /* eslint-disable-next-line */ }, [id, clientId]);

  async function onSave() {
    setSaveError(""); setSuccess(""); setSubmitted(true);

    if (!clientId.trim() && isNew) {
      setSaveError("Client ID is required — set it in the bar above.");
      return;
    }
    if (!location.trim() || !description.trim()) {
      setSaveError("Please fill in all required fields.");
      navigateTab("details", true); // ensure user sees form errors
      return;
    }

    setLoading(true);
    try {
      if (isNew) {
        const payload: CreateIncidentCommand = {
          clientId: clientId.trim(), type, occurredAt,
          location: location.trim(), description: description.trim(),
          reportedByUserId: reportedByUserId || crypto.randomUUID(),
        };
        const res = await createIncident(payload);
        router.push(`/incident/${String(res.referenceNumber).padStart(4, "0")}/details`);
        return;
      }

      const upd: UpdateIncidentRequest = {
        type, status, occurredAt,
        location: location.trim(), description: description.trim(), ownerUserId,
      };
      await updateIncident(incidentUuid, upd);
      await customFieldsRef.current?.save();
      setSubmitted(false);
      setSuccess("Changes saved.");
      await loadExisting();
    } catch (e: any) {
      setSaveError(e?.message ?? "Save failed.");
      navigateTab("details", true); // surface errors in the form
    } finally {
      setLoading(false);
    }
  }

  async function onDiscard() {
    setSaveError(""); setSuccess(""); setSubmitted(false);
    customFieldsRef.current?.reset();
    await loadExisting();
  }

  return (
    <div className={isNew ? "" : "pb-20"}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/incident/list"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to incidents
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            {isNew ? "New Incident" : "Edit Incident"}
          </h1>
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <CircleDot size={11} />
              Unsaved changes
            </span>
          )}
        </div>
        {!isNew && referenceNumber > 0 && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-sm font-semibold text-indigo-600">
              {`INC-${String(referenceNumber).padStart(4, "0")}`}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-xs text-slate-400">{incidentUuid}</span>
          </div>
        )}
      </div>

      {/* Load error */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex gap-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Failed to load incident</p>
            <p className="text-sm text-red-600 mt-0.5">{loadError}</p>
          </div>
        </div>
      )}

      {/* Tab switcher — edit mode only */}
      {!isNew && <TabBar tab={tab} onTabChange={navigateTab} />}

      {/* Details tab: form + custom fields */}
      {(isNew || tab === "details") && (
        <>
          <IncidentDetailsForm
            mode={isNew ? "create" : "edit"}
            id={incidentUuid}
            loading={loading}
            fetching={fetching}
            type={type}
            status={status}
            occurredAt={occurredAt}
            location={location}
            description={description}
            ownerUserId={ownerUserId}
            reportedByUserId={reportedByUserId}
            reportedByDisplayName={reportedByDisplayName}
            createdAt={createdAt}
            updatedAt={updatedAt}
            setType={setType}
            setStatus={setStatus}
            setOccurredAt={setOccurredAt}
            setLocation={setLocation}
            setDescription={setDescription}
            setOwnerUserId={setOwnerUserId}
            submitted={submitted}
            onSave={onSave}
            saveError={saveError}
            success={success}
          />
          {!isNew && clientId && (
            <CustomFieldsCard
              ref={customFieldsRef}
              incidentId={incidentUuid}
              clientId={clientId}
              onDirtyChange={setIsCustomFieldsDirty}
            />
          )}
        </>
      )}

      {/* Attachments tab */}
      {!isNew && tab === "attachments" && (
        <AttachmentsCard incidentId={incidentUuid} />
      )}

      {/* Activity tab: timeline */}
      {!isNew && tab === "activity" && (
        <IncidentTimeline incidentId={incidentUuid} />
      )}

      {/* Sticky action bar — edit mode only */}
      {!isNew && (
        <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-20 bg-slate-900 border-t border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onSave}
                disabled={loading}
                className="px-4 py-1.5 text-sm font-semibold bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={onDiscard}
                disabled={loading || !isDirty}
                className="text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Discard
              </button>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              {isDirty ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="text-slate-300">You have unsaved changes</span>
                </>
              ) : (
                <span className="text-slate-500">All changes saved</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
