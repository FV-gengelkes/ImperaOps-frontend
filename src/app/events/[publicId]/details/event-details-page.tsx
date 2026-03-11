"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, AlertTriangle, CircleDot, Copy, Clock, CheckCircle2, XCircle, Trash2,
  FileText, CheckSquare, Paperclip, Link2, Search, FileBox, MessageSquare, ClipboardList,
  FlaskConical,
} from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { isAdmin as checkAdmin, isManagerOrAbove as checkManager } from "@/lib/role-helpers";
import { createEvent, getEventDetail, updateEvent, cloneEvent, deleteEvent, ApiError } from "@/lib/api";
import type { CreateEventRequest, EventDetailDto, SlaStatusDto, UpdateEventRequest } from "@/lib/types";
import { EventDetailsForm } from "./event-details-form";
import { CustomFieldsCard, type CustomFieldsCardHandle } from "./custom-fields-card";
import { AttachmentsCard } from "./attachments-card";
import { EventAuditLog } from "./event-audit-log";
import { TasksCard } from "./tasks-card";
import { EventLinksCard } from "./event-links-card";
import { InvestigationCard } from "./investigation-card";
import { EventDocumentsCard } from "./event-documents-card";
import { useClientGuard } from "@/hooks/use-client-guard";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { ConfirmDialog } from "@/components/confirm-dialog";

function nowIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

// ── Dirty tracking ────────────────────────────────────────────────────────────

type FormSnapshot = {
  title: string;
  eventTypeId: number;
  workflowStatusId: number;
  occurredAt: string;
  location: string;
  description: string;
  ownerUserId: number | null;
  rootCauseId: number | null;
  correctiveAction: string | null;
};

function snapshotEquals(a: FormSnapshot, b: FormSnapshot) {
  return (
    a.title.trim() === b.title.trim() &&
    a.eventTypeId === b.eventTypeId &&
    a.workflowStatusId === b.workflowStatusId &&
    a.occurredAt.slice(0, 16) === b.occurredAt.slice(0, 16) &&
    a.location.trim() === b.location.trim() &&
    a.description.trim() === b.description.trim() &&
    a.ownerUserId === b.ownerUserId &&
    a.rootCauseId === b.rootCauseId &&
    (a.correctiveAction ?? "").trim() === (b.correctiveAction ?? "").trim()
  );
}

// ── SLA Status Bar ────────────────────────────────────────────────────────────

function SlaStatusBar({ sla }: { sla: SlaStatusDto }) {
  function timeLabel(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function pillClasses(breached: boolean, deadline: string | null): string {
    if (breached) return "bg-critical/10 text-critical border-critical/30";
    if (!deadline) return "bg-slate-100 text-slate-500 border-slate-200";
    const pct = (Date.now() - (new Date(deadline).getTime() - 1e9)) / 1e9; // rough time remaining
    const remaining = new Date(deadline).getTime() - Date.now();
    const totalMs = new Date(deadline).getTime() - (new Date(deadline).getTime() - 1e9); // not ideal
    // Simpler: deadline within 20% of now
    const withinThreshold = remaining > 0 && remaining < (new Date(deadline).getTime() * 0.2);
    return "bg-success/10 text-success border-success/30";
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Clock size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{sla.ruleName}</span>
      </div>

      {sla.investigationDeadline !== null && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${sla.investigationBreached ? "bg-critical/10 text-critical border-critical/30" : "bg-success/10 text-success border-success/30"}`}>
          {sla.investigationBreached ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
          Investigation: {sla.investigationBreached ? "Breached" : `by ${timeLabel(sla.investigationDeadline)}`}
        </div>
      )}

      {sla.closureDeadline !== null && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${sla.closureBreached ? "bg-critical/10 text-critical border-critical/30" : "bg-success/10 text-success border-success/30"}`}>
          {sla.closureBreached ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
          Closure: {sla.closureBreached ? "Breached" : `by ${timeLabel(sla.closureDeadline)}`}
        </div>
      )}
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

type Tab = "details" | "tasks" | "attachments" | "comments" | "audit" | "links" | "investigation" | "documents";

const TAB_GROUPS: { group: string; tabs: { key: Tab; label: string; icon: React.ElementType }[] }[] = [
  {
    group: "Core",
    tabs: [
      { key: "details",     label: "Details",     icon: FileText },
      { key: "tasks",       label: "Tasks",       icon: CheckSquare },
      { key: "attachments", label: "Attachments", icon: Paperclip },
      { key: "documents",   label: "Documents",   icon: FileBox },
    ],
  },
  {
    group: "Investigation",
    tabs: [
      { key: "links",         label: "Links",         icon: Link2 },
      { key: "investigation", label: "Investigation", icon: Search },
    ],
  },
  {
    group: "Activity",
    tabs: [
      { key: "comments", label: "Comments",  icon: MessageSquare },
      { key: "audit",    label: "Audit Log", icon: ClipboardList },
    ],
  },
];

function TabBar({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
  return (
    <div className="border-b border-slate-200 mb-5">
      <div className="flex items-end gap-0 -mb-px">
        {TAB_GROUPS.map((g, gi) => (
          <div key={g.group} className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-0.5">
              {g.group}
            </span>
            <div className="flex items-center">
              {gi > 0 && <div className="w-px h-6 bg-slate-200 mx-0.5 self-center mb-1" />}
              {g.tabs.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => onTabChange(t.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      t.key === tab
                        ? "border-brand text-brand"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Investigation Progress Bar ────────────────────────────────────────────────

const INV_STEPS = [
  { key: "draft",       label: "Draft" },
  { key: "in_progress", label: "In Progress" },
  { key: "review",      label: "Review" },
  { key: "completed",   label: "Completed" },
] as const;

function InvestigationProgressBar({ status, onNavigate }: { status: string; onNavigate: () => void }) {
  const currentIdx = INV_STEPS.findIndex(s => s.key === status);

  return (
    <button
      onClick={onNavigate}
      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-4 hover:border-brand/40 transition-colors cursor-pointer text-left group"
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <FlaskConical size={14} className="text-purple-600" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Investigation</span>
      </div>

      <div className="flex-1 flex items-center gap-0">
        {INV_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const isLast = i === INV_STEPS.length - 1;
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-0.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isCurrent && status === "completed"
                    ? "bg-success text-white border-success"
                    : isCurrent
                    ? "bg-purple-600 text-white border-purple-600"
                    : done
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-slate-400 border-slate-300"
                }`}>
                  {done && !isCurrent ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${
                  isCurrent ? "text-slate-800" : done ? "text-slate-600" : "text-slate-400"
                }`}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 mx-1.5">
                  <div className={`h-0.5 rounded-full ${i < currentIdx ? "bg-purple-600" : "bg-slate-200"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <span className="text-xs text-brand font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        View →
      </span>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventDetailsPage() {
  const { clientId } = useClientId();
  const { user, clients, isSuperAdmin } = useAuth();
  const toast = useToast();
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const publicId = params?.publicId ?? "";
  const isNew = publicId === "";

  const customFieldsRef = useRef<CustomFieldsCardHandle>(null);
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab | null) ?? "details";

  function navigateTab(t: Tab, replace = false) {
    const url = t === "details"
      ? `/events/${publicId}/details`
      : `/events/${publicId}/details?tab=${t}`;
    replace ? router.replace(url, { scroll: false }) : router.push(url, { scroll: false });
  }

  const [eventClientId, setEventClientId] = useState<number>(0);
  const [eventId, setEventId]             = useState<number>(0);
  useClientGuard(isNew ? null : eventClientId || null, "/events/list");

  const role             = clients.find(c => c.id === eventClientId)?.role;
  const isAdmin          = checkAdmin(isSuperAdmin, role);
  const isManagerOrAbove = checkManager(isSuperAdmin, role);

  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(!isNew);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [cloning, setCloning]     = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle]               = useState<string>("");
  const [eventTypeId, setEventTypeId]   = useState<number>(0);
  const [workflowStatusId, setWorkflowStatusId] = useState<number>(0);
  const [occurredAt, setOccurredAt]     = useState<string>(nowIso());
  const [location, setLocation]         = useState<string>("");
  const [description, setDescription]   = useState<string>("");
  const [ownerUserId, setOwnerUserId]   = useState<number | null>(null);
  const [reportedByDisplayName, setReportedByDisplayName]     = useState<string | null>(null);
  const [externalReporterName, setExternalReporterName]       = useState<string | null>(null);
  const [externalReporterContact, setExternalReporterContact] = useState<string | null>(null);
  const [createdAt, setCreatedAt]       = useState<string | undefined>(undefined);
  const [updatedAt, setUpdatedAt]       = useState<string | undefined>(undefined);
  const [rootCauseId, setRootCauseId]   = useState<number | null>(null);
  const [correctiveAction, setCorrectiveAction] = useState<string | null>(null);
  const [sla, setSla]                   = useState<SlaStatusDto | null>(null);
  const [hasInvestigation, setHasInvestigation] = useState(false);
  const [investigationStatus, setInvestigationStatus] = useState<string | null>(null);

  const [savedForm, setSavedForm]                   = useState<FormSnapshot | null>(null);
  const [isCustomFieldsDirty, setIsCustomFieldsDirty] = useState(false);
  const [isInvestigationDirty, setIsInvestigationDirty] = useState(false);
  const [invResetKey, setInvResetKey] = useState(0);

  const canEdit = isNew
    ? isManagerOrAbove
    : isManagerOrAbove
      ? true
      : ["Investigator", "Member"].includes(role ?? "")
        ? ownerUserId === Number(user?.id)
        : false;

  const currentForm: FormSnapshot = { title, eventTypeId, workflowStatusId, occurredAt, location, description, ownerUserId, rootCauseId, correctiveAction };
  const isFormDirty = savedForm !== null && !snapshotEquals(currentForm, savedForm);
  const isDirty     = !isNew && (isFormDirty || isCustomFieldsDirty || isInvestigationDirty);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    setLoadError(""); setSaveError("");
    if (isNew) {
      setTitle(""); setEventTypeId(0); setWorkflowStatusId(0);
      setOccurredAt(nowIso()); setLocation(""); setDescription("");
      setOwnerUserId(null); setSavedForm(null);
    }
  }, [isNew]);

  async function loadExisting() {
    if (isNew || !publicId) return;
    setFetching(true);
    setLoadError("");
    try {
      const detail: EventDetailDto = await getEventDetail(publicId, clientId || undefined);
      setEventId(detail.id);
      setEventClientId(detail.clientId);
      setTitle(detail.title);
      setEventTypeId(detail.eventTypeId);
      setWorkflowStatusId(detail.workflowStatusId);
      setOccurredAt(detail.occurredAt);
      setLocation(detail.location);
      setDescription(detail.description);
      setOwnerUserId(detail.ownerUserId);
      setReportedByDisplayName(detail.reportedByDisplayName ?? null);
      setExternalReporterName(detail.externalReporterName ?? null);
      setExternalReporterContact(detail.externalReporterContact ?? null);
      setCreatedAt(detail.createdAt);
      setUpdatedAt(detail.updatedAt);
      setRootCauseId(detail.rootCauseId ?? null);
      setCorrectiveAction(detail.correctiveAction ?? null);
      setSla(detail.sla ?? null);
      setHasInvestigation(detail.hasInvestigation);
      setInvestigationStatus(detail.investigationStatus ?? null);
      setSavedForm({
        title: detail.title,
        eventTypeId: detail.eventTypeId,
        workflowStatusId: detail.workflowStatusId,
        occurredAt: detail.occurredAt,
        location: detail.location,
        description: detail.description,
        ownerUserId: detail.ownerUserId,
        rootCauseId: detail.rootCauseId ?? null,
        correctiveAction: detail.correctiveAction ?? null,
      });
    } catch (e: unknown) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
        router.replace(`/access-denied?from=/events/list`);
        return;
      }
      setLoadError(e instanceof Error ? e.message : "Failed to load event.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => { void loadExisting(); /* eslint-disable-next-line */ }, [publicId]);

  async function onSave() {
    setSaveError(""); setSubmitted(true);

    if (!clientId && isNew) {
      setSaveError("No client selected — choose a client above.");
      return;
    }
    if (!title.trim() || !location.trim() || !description.trim()) {
      setSaveError("Please fill in all required fields.");
      navigateTab("details", true);
      return;
    }

    setLoading(true);
    try {
      if (isNew) {
        const payload: CreateEventRequest = {
          clientId,
          title: title.trim(),
          eventTypeId,
          workflowStatusId,
          occurredAt,
          location: location.trim(),
          description: description.trim(),
          reportedByUserId: Number(user?.id) || 0,
        };
        const res = await createEvent(payload);
        router.push(`/events/${res.publicId}/details`);
        return;
      }

      const upd: UpdateEventRequest = {
        title: title.trim(),
        eventTypeId,
        workflowStatusId,
        occurredAt,
        location: location.trim(),
        description: description.trim(),
        ownerUserId,
        rootCauseId,
        correctiveAction,
      };
      await updateEvent(publicId, upd, eventClientId || clientId);
      await customFieldsRef.current?.save();
      setSubmitted(false);
      toast.success("Event saved");
      await loadExisting();
    } catch (e: any) {
      setSaveError(e?.message ?? "Save failed.");
      navigateTab("details", true);
    } finally {
      setLoading(false);
    }
  }

  async function onDiscard() {
    setSaveError(""); setSubmitted(false);
    customFieldsRef.current?.reset();
    setInvResetKey(k => k + 1);
    await loadExisting();
  }

  async function handleClone() {
    setCloning(true);
    try {
      const res = await cloneEvent(publicId, eventClientId || clientId);
      toast.success("Event duplicated");
      router.push(`/events/${res.publicId}/details`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to duplicate event.");
    } finally {
      setCloning(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEvent(publicId, eventClientId || clientId);
      router.push("/events/list");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete event.");
      setDeleting(false);
    }
  }

  return (
    <div className={`max-w-7xl mx-auto ${isNew ? "" : "pb-24 sm:pb-20"}`}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/events/list"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to events
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            {isNew ? "New Event" : "Edit Event"}
          </h1>
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <CircleDot size={11} />
              Unsaved changes
            </span>
          )}
        </div>
        {!isNew && publicId && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-sm font-semibold text-brand-link">
              {publicId}
            </span>
            {isManagerOrAbove && (
              <button
                onClick={handleClone}
                disabled={cloning || fetching}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40"
                title="Duplicate this event"
              >
                <Copy size={12} />
                {cloning ? "Duplicating…" : "Duplicate"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Load error */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex gap-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Failed to load event</p>
            <p className="text-sm text-red-600 mt-0.5">{loadError}</p>
          </div>
        </div>
      )}

      {/* SLA status bar — edit mode only, when a rule applies */}
      {!isNew && sla && <SlaStatusBar sla={sla} />}

      {/* Tab switcher — edit mode only */}
      {!isNew && <TabBar tab={tab} onTabChange={navigateTab} />}

      {/* Investigation progress bar */}
      {!isNew && hasInvestigation && investigationStatus && tab !== "investigation" && (
        <InvestigationProgressBar status={investigationStatus} onNavigate={() => navigateTab("investigation")} />
      )}

      {/* Details tab: form + custom fields */}
      {(isNew || tab === "details") && (
        <>
          <EventDetailsForm
            mode={isNew ? "create" : "edit"}
            loading={loading}
            fetching={fetching}
            title={title}
            eventTypeId={eventTypeId}
            workflowStatusId={workflowStatusId}
            occurredAt={occurredAt}
            location={location}
            description={description}
            ownerUserId={ownerUserId}
            reportedByDisplayName={reportedByDisplayName}
            externalReporterName={externalReporterName}
            externalReporterContact={externalReporterContact}
            createdAt={createdAt}
            updatedAt={updatedAt}
            setTitle={setTitle}
            setEventTypeId={setEventTypeId}
            setWorkflowStatusId={setWorkflowStatusId}
            setOccurredAt={setOccurredAt}
            setLocation={setLocation}
            setDescription={setDescription}
            setOwnerUserId={setOwnerUserId}
            rootCauseId={rootCauseId}
            correctiveAction={correctiveAction}
            setRootCauseId={setRootCauseId}
            setCorrectiveAction={setCorrectiveAction}
            submitted={submitted}
            onSave={onSave}
            saveError={saveError}
            readOnly={!isNew && !canEdit}
          />
          {!isNew && eventId > 0 && clientId > 0 && (
            <CustomFieldsCard
              ref={customFieldsRef}
              entityId={eventId}
              clientId={clientId}
              onDirtyChange={setIsCustomFieldsDirty}
            />
          )}
        </>
      )}

      {/* Tasks tab */}
      {!isNew && tab === "tasks" && (
        <TasksCard publicId={publicId} />
      )}

      {/* Attachments tab */}
      {!isNew && tab === "attachments" && (
        <AttachmentsCard publicId={publicId} />
      )}

      {/* Links tab */}
      {!isNew && tab === "links" && eventId > 0 && (
        <EventLinksCard publicId={publicId} eventId={eventId} />
      )}

      {/* Investigation tab */}
      {!isNew && tab === "investigation" && (
        <InvestigationCard key={invResetKey} publicId={publicId} onDirtyChange={setIsInvestigationDirty} />
      )}

      {/* Documents tab */}
      {!isNew && tab === "documents" && (
        <EventDocumentsCard publicId={publicId} />
      )}

      {/* Comments tab */}
      {!isNew && tab === "comments" && (
        <EventAuditLog publicId={publicId} view="comments" />
      )}

      {/* Audit tab */}
      {!isNew && tab === "audit" && (
        <EventAuditLog publicId={publicId} view="audit" />
      )}

      {/* Sticky action bar — edit mode only */}
      {!isNew && (
        <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-20 bg-slate-900 border-t border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              {canEdit && (
                <>
                  <button
                    onClick={onSave}
                    disabled={loading}
                    className="px-4 py-1.5 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    onClick={onDiscard}
                    disabled={loading || !isDirty}
                    className="px-4 py-1.5 text-sm font-medium text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300 disabled:opacity-0 disabled:cursor-not-allowed transition-all"
                  >
                    Cancel
                  </button>
                </>
              )}
              {!canEdit && !isNew && (
                <span className="text-xs text-slate-500 italic">Read-only — you are not the assigned owner</span>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting || loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={14} />
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
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

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        description="Permanently delete this event? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
