"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import isEmail from "validator/lib/isEmail";
import isMobilePhone from "validator/lib/isMobilePhone";
import { getPublicReportConfig, submitPublicReport, ApiError } from "@/lib/api";
import type { PublicReportConfigDto } from "@/lib/types";

function nowLocalInput() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function isValidContact(v: string): boolean {
  const trimmed = v.trim();
  return isEmail(trimmed) || isMobilePhone(trimmed, "any", { strictMode: false });
}

const inputBase =
  "w-full px-3.5 py-2.5 text-sm text-slate-800 rounded-xl bg-slate-50 " +
  "border focus:bg-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400";
const inputNormal = inputBase + " border-slate-200 focus:ring-brand/40 focus:border-brand";
const inputError  = inputBase + " border-red-400 focus:ring-red-400/30 focus:border-red-400";

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function PublicReportPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [config, setConfig] = useState<PublicReportConfigDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [eventTypeId, setEventTypeId] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [occurredAt, setOccurredAt] = useState(nowLocalInput());
  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");

  const [contactTouched, setContactTouched] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getPublicReportConfig(slug)
      .then(cfg => {
        setConfig(cfg);
        if (cfg.eventTypes.length > 0) setEventTypeId(cfg.eventTypes[0].id);
      })
      .catch(e => {
        setLoadError(e instanceof ApiError && e.status === 404
          ? "Reporting unavailable for this link."
          : "Failed to load the reporting form. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Apply brand colors as CSS vars
  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;
    if (config.primaryColor) root.style.setProperty("--color-brand", config.primaryColor);
    if (config.linkColor)    root.style.setProperty("--color-brand-link", config.linkColor);
    return () => {
      root.style.removeProperty("--color-brand");
      root.style.removeProperty("--color-brand-link");
    };
  }, [config]);

  // ── Field-level errors (derived, not stored) ────────────────────────────────
  const nameError = submitted && !reporterName.trim() ? "Your name is required." : undefined;

  // Show format error as soon as the field has been touched and has content;
  // show "required" error only on submit.
  const contactError = submitted && !reporterContact.trim() ? "Email or phone is required."
                     : contactTouched && reporterContact.trim() && !isValidContact(reporterContact) ? "Enter a valid email address or phone number."
                     : submitted && !isValidContact(reporterContact) ? "Enter a valid email address or phone number."
                     : undefined;

  function hasErrors() {
    return (
      !title.trim() ||
      !description.trim() ||
      !reporterName.trim() ||
      !reporterContact.trim() ||
      !isValidContact(reporterContact.trim())
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!config || hasErrors()) {
      setSubmitError("Please fix the errors above before submitting.");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await submitPublicReport(slug, {
        clientId:         config.clientId,
        eventTypeId,
        workflowStatusId: config.defaultStatusId,
        title:            title.trim(),
        description:      description.trim(),
        location:         location.trim() || null,
        occurredAt:       occurredAt ? new Date(occurredAt).toISOString() : null,
        reporterName:     reporterName.trim(),
        reporterContact:  reporterContact.trim(),
      });
      setSuccessId(res.publicId);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (loadError || !config) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700 mb-1">Unavailable</h2>
          <p className="text-sm text-slate-500">{loadError ?? "Reporting unavailable for this link."}</p>
        </div>
      </div>
    );
  }

  const systemName = config.systemName ?? config.clientName;

  // ── Success ─────────────────────────────────────────────────────────────────
  if (successId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Report Submitted</h2>
          <p className="text-sm text-slate-500 mb-4">
            Your report has been received. Keep this reference number for your records.
          </p>
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Reference</span>
            <span className="font-mono text-lg font-bold text-brand">{successId}</span>
          </div>
          <p className="text-xs text-slate-400 mt-6">You may close this page.</p>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {config.logoUrl && (
            <img src={config.logoUrl} alt="" className="h-10 w-auto" />
          )}
          <span className="font-semibold text-slate-800 text-lg">{systemName}</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Report an Incident</h1>
          <p className="text-sm text-slate-500 mt-1">
            Fields marked <span className="text-red-400">*</span> are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

          {/* Event Type */}
          <Field label="Incident Type" required>
            <select
              className={inputNormal}
              value={eventTypeId}
              onChange={e => setEventTypeId(Number(e.target.value))}
            >
              {config.eventTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>

          {/* Title */}
          <Field
            label="Title"
            required
            error={submitted && !title.trim() ? "Title is required." : undefined}
          >
            <input
              className={submitted && !title.trim() ? inputError : inputNormal}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief summary of what happened"
            />
          </Field>

          {/* Description */}
          <Field
            label="Description"
            required
            error={submitted && !description.trim() ? "Description is required." : undefined}
          >
            <textarea
              className={`${submitted && !description.trim() ? inputError : inputNormal} resize-none`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe what happened, where, and any immediate actions taken."
            />
          </Field>

          {/* Location */}
          <Field label="Location (optional)">
            <input
              className={inputNormal}
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. I-80 MM 225, Warehouse B"
            />
          </Field>

          {/* Date/Time */}
          <Field label="Date & Time of Incident (optional)">
            <input
              className={inputNormal}
              type="datetime-local"
              value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)}
            />
          </Field>

          {/* Reporter info — now required */}
          <div className="border-t border-slate-100 pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Your Information
            </p>
            <div className="space-y-5">
              <Field label="Your Name" required error={nameError}>
                <input
                  className={nameError ? inputError : inputNormal}
                  value={reporterName}
                  onChange={e => setReporterName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </Field>
              <Field label="Email or Phone" required error={contactError}>
                <input
                  className={contactError ? inputError : inputNormal}
                  value={reporterContact}
                  onChange={e => { setReporterContact(e.target.value); setContactTouched(true); }}
                  onBlur={() => setContactTouched(true)}
                  placeholder="email@example.com or +1 555-000-0000"
                  autoComplete="email"
                  inputMode="email"
                />
              </Field>
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-sm font-semibold bg-brand text-brand-text rounded-xl hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submitting ? "Submitting…" : "Submit Report"}
          </button>
        </form>
      </main>
    </div>
  );
}
