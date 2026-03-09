"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2, ClipboardCopy, ExternalLink, Loader2, Mail, QrCode, RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getClientInboundEmail, updateClientInboundEmail } from "@/lib/api";
import { useToast } from "@/components/toast-context";
import type { AdminClientDto, ClientInboundEmailDto } from "@/lib/types";

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

// ── Public Reporting Card ────────────────────────────────────────────────────

function PublicReportingCard({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}/report/${slug}` : `/report/${slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL.");
    }
  }

  return (
    <div className="p-5 flex flex-col sm:flex-row items-start gap-6">
      {/* QR Code */}
      {origin && (
        <div className="shrink-0 bg-white rounded-xl p-3 shadow-sm">
          <QRCodeSVG value={url} size={120} />
        </div>
      )}

      {/* URL + actions */}
      <div className="flex-1 min-w-0 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Public URL</p>
          <p className="text-xs text-slate-300 font-mono break-all bg-slate-800 rounded-lg px-3 py-2">{url}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-medium transition"
          >
            {copied ? <CheckCircle2 size={13} className="text-green-400" /> : <ClipboardCopy size={13} />}
            {copied ? "Copied!" : "Copy URL"}
          </button>
          {origin && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-medium transition"
            >
              <ExternalLink size={13} />
              Open
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inbound Email Card ────────────────────────────────────────────────────────

function InboundEmailCard({
  clientId,
  config,
  saving,
  onSave,
}: {
  clientId: number;
  config: ClientInboundEmailDto;
  saving: boolean;
  onSave: (slug: string | null, eventTypeId: number | null, statusId: number | null) => void;
}) {
  const [slug, setSlug]             = useState(config.inboundEmailSlug ?? "");
  const [eventTypeId, setEventTypeId] = useState<string>(String(config.defaultInboundEventTypeId ?? ""));
  const [statusId, setStatusId]     = useState<string>(String(config.defaultInboundWorkflowStatusId ?? ""));

  // Reset form when config changes (different client selected)
  useEffect(() => {
    setSlug(config.inboundEmailSlug ?? "");
    setEventTypeId(String(config.defaultInboundEventTypeId ?? ""));
    setStatusId(String(config.defaultInboundWorkflowStatusId ?? ""));
  }, [clientId, config]);

  return (
    <div className="p-5 space-y-4">
      {/* Inbound address */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">
          Inbound Slug
        </label>
        <input
          className={inputCls}
          value={slug}
          onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder={`e.g. acme`}
        />
        {config.inboundAddress && (
          <p className="text-xs text-slate-500 mt-1.5 font-mono">{config.inboundAddress}</p>
        )}
        <p className="text-xs text-slate-600 mt-1">
          Lowercase letters, numbers, hyphens only. Leave blank to disable inbound email.
        </p>
      </div>

      {/* Default event type */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">
          Default Event Type
        </label>
        <select
          className={inputCls}
          value={eventTypeId}
          onChange={e => setEventTypeId(e.target.value)}
        >
          <option value="">— Use first active type —</option>
          {config.eventTypes.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Default workflow status */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">
          Default Status
        </label>
        <select
          className={inputCls}
          value={statusId}
          onChange={e => setStatusId(e.target.value)}
        >
          <option value="">— Use first open status —</option>
          {config.workflowStatuses.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={() => onSave(
            slug.trim() || null,
            eventTypeId ? Number(eventTypeId) : null,
            statusId ? Number(statusId) : null,
          )}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition"
        >
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────

export function ClientInboundEmailSection({
  client,
}: {
  client: AdminClientDto;
}) {
  const toast = useToast();
  const [inboundEmail, setInboundEmail]         = useState<ClientInboundEmailDto | null>(null);
  const [inboundEmailLoading, setInboundEmailLoading] = useState(false);
  const [inboundEmailSaving, setInboundEmailSaving]   = useState(false);

  useEffect(() => {
    setInboundEmailLoading(true);
    getClientInboundEmail(client.id)
      .then(setInboundEmail)
      .catch(() => setInboundEmail(null))
      .finally(() => setInboundEmailLoading(false));
  }, [client.id]);

  async function handleSaveInboundEmail(
    slug: string | null,
    eventTypeId: number | null,
    statusId: number | null,
  ) {
    setInboundEmailSaving(true);
    try {
      await updateClientInboundEmail(client.id, {
        inboundEmailSlug: slug,
        defaultInboundEventTypeId: eventTypeId,
        defaultInboundWorkflowStatusId: statusId,
      });
      const updated = await getClientInboundEmail(client.id);
      setInboundEmail(updated);
      toast.success("Inbound email settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save inbound email settings.");
    } finally {
      setInboundEmailSaving(false);
    }
  }

  return (
    <>
      {/* Public Reporting */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
          <QrCode size={15} className="text-slate-500" />
          <div>
            <h2 className="text-sm font-semibold text-white">Public Reporting</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Share this link or QR code to accept incident reports without a login.
            </p>
          </div>
        </div>
        <PublicReportingCard slug={client.slug} />
      </div>

      {/* Inbound Email */}
      <div className="mt-6 bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
          <Mail size={15} className="text-slate-500" />
          <div>
            <h2 className="text-sm font-semibold text-white">Inbound Email</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Emails sent to the inbound address automatically create events.
            </p>
          </div>
        </div>
        {inboundEmailLoading ? (
          <div className="p-5 flex justify-center">
            <Loader2 size={18} className="animate-spin text-slate-500" />
          </div>
        ) : inboundEmail ? (
          <InboundEmailCard
            clientId={client.id}
            config={inboundEmail}
            saving={inboundEmailSaving}
            onSave={handleSaveInboundEmail}
          />
        ) : null}
      </div>
    </>
  );
}
