"use client";

import { useCallback, useEffect, useState } from "react";
import { Key, Plus, Trash2, RefreshCw, Pencil, X, Copy, Check, ShieldOff, Eye, EyeOff, Clock } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { isAdmin as checkAdmin } from "@/lib/role-helpers";
import {
  getApiCredentials,
  createApiCredential,
  updateApiCredential,
  revokeApiCredential,
  deleteApiCredential,
  getApiCredentialAudit,
} from "@/lib/api";
import type {
  ApiCredentialDto,
  ApiCredentialCreatedDto,
  CreateApiCredentialRequest,
  UpdateApiCredentialRequest,
  ApiCredentialAuditLogDto,
} from "@/lib/types";
import { useToast } from "@/components/toast-context";

const ALL_SCOPES = [
  "events:create",
  "events:read",
  "events:update",
] as const;

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ── Secret Display (shown once after create) ─────────────────────────────────

function SecretDisplay({
  created,
  onDismiss,
}: {
  created: ApiCredentialCreatedDto;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState<"header" | "secret" | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  function copyToClipboard(text: string, label: "header" | "secret") {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="border border-warning/40 bg-warning/5 rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20 shrink-0">
          <Key className="h-4 w-4 text-warning" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">API Key Created — Save Your Secret</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            This secret will <strong>not</strong> be shown again. Copy it now and store it securely.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            Name
          </label>
          <p className="text-sm text-slate-800 font-medium">{created.name}</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            Key ID
          </label>
          <p className="text-sm text-slate-800 font-mono">{created.keyId}</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            Secret
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 break-all">
              {showSecret ? created.secret : "••••••••••••••••••••••••••••••••"}
            </code>
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="p-2 text-slate-400 hover:text-slate-600 transition"
              title={showSecret ? "Hide secret" : "Show secret"}
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={() => copyToClipboard(created.secret, "secret")}
              className="p-2 text-slate-400 hover:text-brand transition"
              title="Copy secret"
            >
              {copied === "secret" ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            Authorization Header
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 break-all">
              {created.authorizationHeader}
            </code>
            <button
              onClick={() => copyToClipboard(created.authorizationHeader, "header")}
              className="p-2 text-slate-400 hover:text-brand transition"
              title="Copy header"
            >
              {copied === "header" ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
      >
        <Check size={14} />
        I&apos;ve saved my secret
      </button>
    </div>
  );
}

// ── Create Form ──────────────────────────────────────────────────────────────

function CreateForm({
  onSave,
  onCancel,
}: {
  onSave: (req: CreateApiCredentialRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<string>>(new Set(ALL_SCOPES));
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleScope(scope: string) {
    setScopes(prev => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (scopes.size === 0) { setError("Select at least one scope."); return; }
    setBusy(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        scopes: Array.from(scopes),
        expiresAt: expiresAt || null,
      });
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to create credential.");
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
        <input
          className={inputCls}
          placeholder="e.g. PagerDuty Integration"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
          Scopes <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_SCOPES.map(scope => (
            <button
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                scopes.has(scope)
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-500 border-slate-200 hover:border-brand hover:text-brand"
              }`}
            >
              {scopes.has(scope) && <Check size={10} className="inline mr-1" />}
              {scope}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
          Expires At <span className="text-slate-400 font-normal normal-case">(optional)</span>
        </label>
        <input
          className={inputCls}
          type="date"
          value={expiresAt}
          onChange={e => setExpiresAt(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
        />
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
          {busy ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
          {busy ? "Creating…" : "Create API Key"}
        </button>
      </div>
    </form>
  );
}

// ── Edit Form ────────────────────────────────────────────────────────────────

function EditForm({
  credential,
  onSave,
  onCancel,
}: {
  credential: ApiCredentialDto;
  onSave: (req: UpdateApiCredentialRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(credential.name);
  const [scopes, setScopes] = useState<Set<string>>(new Set(credential.scopes));
  const [isActive, setIsActive] = useState(credential.status === "active");
  const [expiresAt, setExpiresAt] = useState(credential.expiresAt?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleScope(scope: string) {
    setScopes(prev => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (scopes.size === 0) { setError("Select at least one scope."); return; }
    setBusy(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        scopes: Array.from(scopes),
        isActive,
        expiresAt: expiresAt || null,
      });
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to update credential.");
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
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required autoFocus />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
          Scopes <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_SCOPES.map(scope => (
            <button
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                scopes.has(scope)
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-500 border-slate-200 hover:border-brand hover:text-brand"
              }`}
            >
              {scopes.has(scope) && <Check size={10} className="inline mr-1" />}
              {scope}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
          Expires At <span className="text-slate-400 font-normal normal-case">(optional)</span>
        </label>
        <input
          className={inputCls}
          type="date"
          value={expiresAt}
          onChange={e => setExpiresAt(e.target.value)}
        />
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
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Audit Log Modal ──────────────────────────────────────────────────────────

function AuditLogPanel({
  clientId,
  credentialId,
  credentialName,
  onClose,
}: {
  clientId: number;
  credentialId: number;
  credentialName: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<ApiCredentialAuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLogs(await getApiCredentialAudit(clientId, credentialId));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, credentialId]);

  return (
    <div className="border-b border-slate-100 bg-slate-50/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">
          Audit Log — {credentialName}
        </h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition">
          <X size={16} />
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate-400">No audit events.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <span className="text-slate-400 shrink-0 w-32">{formatDateTime(log.createdAt)}</span>
              <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${
                log.action === "created" ? "bg-success/10 text-success" :
                log.action === "revoked" ? "bg-critical/10 text-critical" :
                log.action === "deleted" ? "bg-critical/10 text-critical" :
                "bg-slate-100 text-slate-600"
              }`}>
                {log.action}
              </span>
              {log.detailsJson && (
                <span className="text-slate-500 truncate">{log.detailsJson}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, expiresAt }: { status: string; expiresAt: string | null }) {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  if (isExpired) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">
        Expired
      </span>
    );
  }

  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
          Active
        </span>
      );
    case "revoked":
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-critical/10 text-critical">
          Revoked
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
          {status}
        </span>
      );
  }
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const { clientId } = useClientId();
  const { clients, isSuperAdmin } = useAuth();
  const toast = useToast();

  const role = clients.find(c => c.id === clientId)?.role;
  const isAdmin = checkAdmin(isSuperAdmin, role);

  const [credentials, setCredentials] = useState<ApiCredentialDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ApiCredentialDto | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [justCreated, setJustCreated] = useState<ApiCredentialCreatedDto | null>(null);
  const [auditFor, setAuditFor] = useState<ApiCredentialDto | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");
    try {
      setCredentials(await getApiCredentials(clientId));
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load API credentials.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  if (!isAdmin) {
    return (
      <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
        <p className="text-sm text-slate-500">Admin access required to manage API keys.</p>
      </div>
    );
  }

  async function handleCreate(req: CreateApiCredentialRequest) {
    if (!clientId) return;
    const created = await createApiCredential(clientId, req);
    setJustCreated(created);
    setCreating(false);
    await load();
    toast.success("API key created");
  }

  async function handleUpdate(req: UpdateApiCredentialRequest) {
    if (!clientId || !editing) return;
    const updated = await updateApiCredential(clientId, editing.id, req);
    setCredentials(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditing(null);
    toast.success("API key updated");
  }

  async function handleRevoke(id: number) {
    if (!clientId) return;
    if (!confirm("Revoke this API key? It will immediately stop working.")) return;
    setRevoking(id);
    try {
      await revokeApiCredential(clientId, id);
      await load();
      toast.success("API key revoked");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to revoke.");
    } finally {
      setRevoking(null);
    }
  }

  async function handleDelete(id: number) {
    if (!clientId) return;
    if (!confirm("Delete this API key permanently? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteApiCredential(clientId, id);
      setCredentials(prev => prev.filter(c => c.id !== id));
      toast.success("API key deleted");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to delete.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand">
          <Key className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">API Keys</h1>
      </div>
      <p className="text-slate-500 mb-8">
        Create machine-to-machine API credentials for external integrations.
        Each key has scoped permissions and can be revoked at any time.
      </p>

      {!clientId ? (
        <p className="text-sm text-slate-400">Set a client to manage API keys.</p>
      ) : (
        <div className="space-y-4">
          {/* Secret banner (shown once after creation) */}
          {justCreated && (
            <SecretDisplay
              created={justCreated}
              onDismiss={() => setJustCreated(null)}
            />
          )}

          {/* Credential list */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                API Credentials
                {!loading && <span className="ml-2 text-sm font-normal text-slate-400">({credentials.length})</span>}
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
                    onClick={() => { setCreating(true); setEditing(null); setAuditFor(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
                  >
                    <Plus size={14} />
                    Create Key
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
                <p className="px-5 pt-4 text-sm font-semibold text-slate-700">New API Key</p>
                <CreateForm
                  onSave={handleCreate}
                  onCancel={() => setCreating(false)}
                />
              </div>
            )}

            {/* Audit log panel */}
            {auditFor && (
              <AuditLogPanel
                clientId={clientId}
                credentialId={auditFor.id}
                credentialName={auditFor.name}
                onClose={() => setAuditFor(null)}
              />
            )}

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading...</div>
            ) : credentials.length === 0 && !creating ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                No API keys created yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {credentials.map(cred => (
                  <li key={cred.id}>
                    {editing?.id === cred.id ? (
                      <div className="bg-slate-50/60">
                        <p className="px-5 pt-4 text-sm font-semibold text-slate-700">Edit API Key</p>
                        <EditForm
                          credential={cred}
                          onSave={handleUpdate}
                          onCancel={() => setEditing(null)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-start gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800">{cred.name}</p>
                            <StatusBadge status={cred.status} expiresAt={cred.expiresAt} />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mb-1.5">
                            <span className="font-mono">Key: {cred.keyId}</span>
                            <span>Secret: ••••{cred.secretLast4}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {cred.scopes.map(s => (
                              <span key={s} className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>Created {formatDate(cred.createdAt)}</span>
                            {cred.lastUsedAt && (
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                Last used {formatDateTime(cred.lastUsedAt)}
                                {cred.lastUsedIp && <span>from {cred.lastUsedIp}</span>}
                              </span>
                            )}
                            {cred.expiresAt && (
                              <span>Expires {formatDate(cred.expiresAt)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setAuditFor(auditFor?.id === cred.id ? null : cred); setEditing(null); setCreating(false); }}
                            className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
                            title="View audit log"
                          >
                            <Clock size={14} />
                          </button>
                          {cred.status === "active" && (
                            <>
                              <button
                                onClick={() => { setEditing(cred); setCreating(false); setAuditFor(null); }}
                                className="p-1.5 text-slate-300 hover:text-brand transition-colors"
                                title="Edit key"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => void handleRevoke(cred.id)}
                                disabled={revoking === cred.id}
                                className="p-1.5 text-slate-300 hover:text-warning disabled:opacity-50 transition-colors"
                                title="Revoke key"
                              >
                                {revoking === cred.id
                                  ? <RefreshCw size={14} className="animate-spin" />
                                  : <ShieldOff size={14} />
                                }
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => void handleDelete(cred.id)}
                            disabled={deleting === cred.id}
                            className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors"
                            title="Delete key"
                          >
                            {deleting === cred.id
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

          {/* Usage reference */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Usage</h3>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto text-slate-700">{`# Create an event via the Public API
curl -X POST https://api.imperaops.com/public/v1/events \\
  -H "Authorization: Bearer {clientSid}.{keyId}.{secret}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Server CPU spike",
    "type": "Infrastructure",
    "severity": "high",
    "source": "monitoring",
    "externalId": "alert-12345"
  }'`}</pre>
            <p className="text-xs text-slate-500 mt-2">
              The authorization header is shown once when you create a key. Use the format{" "}
              <code className="bg-slate-100 px-1 rounded">Bearer &#123;clientSid&#125;.&#123;keyId&#125;.&#123;secret&#125;</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
