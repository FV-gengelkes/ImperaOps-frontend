"use client";

import { useCallback, useEffect, useState } from "react";
import { Webhook, Plus, Trash2, RefreshCw, Pencil, X, Check } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook } from "@/lib/api";
import type { ClientWebhookDto, UpsertWebhookRequest } from "@/lib/types";
import { useToast } from "@/components/toast-context";

const ALL_EVENT_TYPES = [
  "event.created",
  "event.updated",
  "event.closed",
  "event.assigned",
  "event.deleted",
] as const;

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";

// ── Webhook Form ───────────────────────────────────────────────────────────────

type FormMode = "create" | "edit";

function WebhookForm({
  initial,
  mode,
  onSave,
  onCancel,
}: {
  initial?: ClientWebhookDto;
  mode: FormMode;
  onSave: (req: UpsertWebhookRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [name,       setName]       = useState(initial?.name ?? "");
  const [url,        setUrl]        = useState(initial?.url ?? "");
  const [secret,     setSecret]     = useState(initial?.secret ?? "");
  const [eventTypes, setEventTypes] = useState<Set<string>>(new Set(initial?.eventTypes ?? ALL_EVENT_TYPES));
  const [isActive,   setIsActive]   = useState(initial?.isActive ?? true);
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState("");

  function toggleType(type: string) {
    setEventTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (!url.trim())  { setError("URL is required."); return; }
    if (eventTypes.size === 0) { setError("Select at least one event type."); return; }

    setBusy(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        url: url.trim(),
        secret: secret.trim() || null,
        eventTypes: Array.from(eventTypes),
        isActive,
      });
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to save webhook.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
          Name <span className="text-red-400">*</span>
        </label>
        <input className={inputCls} placeholder="My Zapier webhook" value={name} onChange={e => setName(e.target.value)} required autoFocus />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
          URL <span className="text-red-400">*</span>
        </label>
        <input className={inputCls} type="url" placeholder="https://hooks.zapier.com/…" value={url} onChange={e => setUrl(e.target.value)} required />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
          Secret <span className="text-slate-400 font-normal normal-case">(optional — used for HMAC signature)</span>
        </label>
        <input className={inputCls} type="password" placeholder="Leave blank for no signature" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="new-password" />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
          Event Types <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_EVENT_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                eventTypes.has(type)
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-500 border-slate-200 hover:border-brand hover:text-brand"
              }`}
            >
              {eventTypes.has(type) && <Check size={10} className="inline mr-1" />}
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-brand focus:ring-brand"
          />
          <span className="text-sm text-slate-700">Active</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors"
        >
          {busy ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          {busy ? "Saving…" : mode === "create" ? "Create Webhook" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const { clientId } = useClientId();
  const { clients, isSuperAdmin } = useAuth();
  const toast = useToast();

  const role    = clients.find(c => c.id === clientId)?.role;
  const isAdmin = isSuperAdmin || role === "Admin";

  const [webhooks, setWebhooks] = useState<ClientWebhookDto[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<ClientWebhookDto | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");
    try {
      setWebhooks(await getWebhooks(clientId));
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load webhooks.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  if (!isAdmin) {
    return (
      <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
        <p className="text-sm text-slate-500">Admin access required to manage webhooks.</p>
      </div>
    );
  }

  async function handleCreate(req: UpsertWebhookRequest) {
    if (!clientId) return;
    const created = await createWebhook(clientId, req);
    setWebhooks(prev => [...prev, created]);
    setCreating(false);
    toast.success("Webhook created");
  }

  async function handleUpdate(req: UpsertWebhookRequest) {
    if (!clientId || !editing) return;
    const updated = await updateWebhook(clientId, editing.id, req);
    setWebhooks(prev => prev.map(w => w.id === updated.id ? updated : w));
    setEditing(null);
    toast.success("Webhook updated");
  }

  async function handleDelete(id: number) {
    if (!clientId) return;
    if (!confirm("Delete this webhook? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteWebhook(clientId, id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
      toast.success("Webhook deleted");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to delete webhook.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand">
          <Webhook className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Webhooks</h1>
      </div>
      <p className="text-slate-500 mb-8">
        Send event lifecycle notifications to external URLs (Zapier, Slack, etc.).
        Payloads include an <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">X-ImperaOps-Signature</code> header when a secret is set.
      </p>

      {!clientId ? (
        <p className="text-sm text-slate-400">Set a client to manage webhooks.</p>
      ) : (
        <div className="space-y-4">
          {/* Webhook list */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Configured Webhooks
                {!loading && <span className="ml-2 text-sm font-normal text-slate-400">({webhooks.length})</span>}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void load()}
                  title="Refresh"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <RefreshCw size={14} />
                </button>
                {!creating && (
                  <button
                    onClick={() => { setCreating(true); setEditing(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
                  >
                    <Plus size={14} />
                    Add Webhook
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="px-5 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</p>
            )}

            {/* Create form */}
            {creating && (
              <div className="border-b border-slate-100 bg-slate-50/60">
                <p className="px-5 pt-4 text-sm font-semibold text-slate-700">New Webhook</p>
                <WebhookForm
                  mode="create"
                  onSave={handleCreate}
                  onCancel={() => setCreating(false)}
                />
              </div>
            )}

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
            ) : webhooks.length === 0 && !creating ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                No webhooks configured yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {webhooks.map(wh => (
                  <li key={wh.id}>
                    {editing?.id === wh.id ? (
                      <div className="bg-slate-50/60">
                        <p className="px-5 pt-4 text-sm font-semibold text-slate-700">Edit Webhook</p>
                        <WebhookForm
                          mode="edit"
                          initial={wh}
                          onSave={handleUpdate}
                          onCancel={() => setEditing(null)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-start gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800">{wh.name}</p>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              wh.isActive ? "bg-success/10 text-success" : "bg-slate-100 text-slate-500"
                            }`}>
                              {wh.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono truncate mb-1.5">{wh.url}</p>
                          <div className="flex flex-wrap gap-1">
                            {wh.eventTypes.map(t => (
                              <span key={t} className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                          {wh.secret && (
                            <p className="text-xs text-slate-400 mt-1">HMAC secret configured</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditing(wh); setCreating(false); }}
                            className="p-1.5 text-slate-300 hover:text-brand transition-colors"
                            title="Edit webhook"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => void handleDelete(wh.id)}
                            disabled={deleting === wh.id}
                            className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors"
                            title="Delete webhook"
                          >
                            {deleting === wh.id
                              ? <RefreshCw size={14} className="animate-spin" />
                              : <Trash2 size={14} />
                            }
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Payload reference */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Payload Reference</h3>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto text-slate-700">{`{
  "event": "event.created",
  "timestamp": "2026-03-05T15:30:45Z",
  "clientId": 1,
  "data": {
    "publicId": "EVT-0042",
    "title": "Forklift incident",
    "eventType": "Safety",
    "status": "Open",
    "statusIsClosed": false,
    "location": "Warehouse B",
    "occurredAt": "2026-03-05T14:00:00Z",
    "ownerDisplayName": null,
    "createdAt": "2026-03-05T15:30:44Z"
  }
}`}</pre>
            <p className="text-xs text-slate-500 mt-2">
              When a secret is configured, an <code className="bg-slate-100 px-1 rounded">X-ImperaOps-Signature: sha256=&lt;hmac&gt;</code> header is included.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
