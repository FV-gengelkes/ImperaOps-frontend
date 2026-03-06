"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, CheckCircle2, ClipboardCopy, Clock, Edit2, ExternalLink, ImageIcon, LayoutTemplate,
  Loader2, Mail, Palette, Plus, Power, QrCode, RefreshCw, Search, Shield, SwitchCamera, Trash2,
  Users, X, XCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  adminApplyTemplate, adminCreateClient, adminCreateUser, adminDeleteClientLogo,
  adminGetClientBranding, adminGetClientUsers,
  adminGetClients, adminGetTemplates, adminGetUsers, adminGrantClientAccess,
  adminRevokeClientAccess, adminToggleClientActive, adminToggleUserActive,
  adminUpdateClient, adminUpdateClientBranding, adminUpdateClientUserRole, adminUpdateUser,
  adminUploadClientLogo,
  getClientInboundEmail, updateClientInboundEmail,
  adminGetSlaRules, adminCreateSlaRule, adminUpdateSlaRule, adminDeleteSlaRule,
  getEventTypes,
} from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import { useBranding } from "@/components/branding-context";
import { useToast } from "@/components/toast-context";
import type { AdminClientDto, AdminClientUserDto, AdminUserDto, ClientBrandingDto, ClientInboundEmailDto, EventTemplateDto, SlaRuleDto, EventTypeDto } from "@/lib/types";

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

// ── Client create / edit modal ─────────────────────────────────────────────────

type ClientModalState = { mode: "create" } | { mode: "edit"; client: AdminClientDto };

function ClientModal({
  state, clients, onClose, onSaved,
}: {
  state: ClientModalState;
  clients: AdminClientDto[];
  onClose: () => void;
  onSaved: (refreshId?: number) => void;
}) {
  const isEdit = state.mode === "edit";
  const [name, setName]         = useState(isEdit ? state.client.name : "");
  const [parentId, setParentId] = useState(isEdit ? String(state.client.parentClientId ?? "") : "");
  const [isActive, setIsActive] = useState(isEdit ? state.client.isActive : true);
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates]   = useState<EventTemplateDto[]>([]);
  const [saving, setSaving]     = useState(false);
  const [nameError, setNameError] = useState("");
  const [apiError, setApiError]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (!isEdit) adminGetTemplates().then(setTemplates).catch(() => {});
  }, [isEdit]);

  const parentOptions = clients.filter(c =>
    !isEdit || (c.id !== state.client.id && c.parentClientId !== state.client.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError("Client name is required."); return; }
    setSaving(true); setNameError(""); setApiError("");
    try {
      if (isEdit) {
        await adminUpdateClient(state.client.id, {
          name: name.trim(),
          parentClientId: parentId ? Number(parentId) : null,
          isActive,
        });
        onSaved(state.client.id);
      } else {
        await adminCreateClient(
          name.trim(),
          parentId ? Number(parentId) : undefined,
          templateId || undefined,
        );
        onSaved();
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">{isEdit ? "Edit Client" : "New Client"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{apiError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Client Name <span className="text-red-400">*</span>
            </label>
            <input ref={inputRef} value={name}
              onChange={e => { setName(e.target.value); setNameError(""); }}
              placeholder="e.g. Acme Freight Co."
              className={nameError ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
            {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Parent Client (optional)</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)}
              className={inputCls + " cursor-pointer"}>
              <option value="">— None (top-level) —</option>
              {parentOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-300">Active</p>
                <p className="text-xs text-slate-500">Inactive clients are hidden from users.</p>
              </div>
              <button type="button" onClick={() => setIsActive(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-brand" : "bg-slate-700"}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}
          {!isEdit && templates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Pre-built Configuration <span className="text-slate-600">(optional)</span>
              </label>
              <div className="space-y-2">
                {/* Blank option */}
                <button type="button" onClick={() => setTemplateId("")}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${
                    templateId === ""
                      ? "border-brand bg-brand/10"
                      : "border-slate-700 hover:border-slate-600 bg-slate-800/40"
                  }`}>
                  <p className="text-sm font-medium text-white">Start blank</p>
                  <p className="text-xs text-slate-500 mt-0.5">Configure event types and workflows manually</p>
                </button>
                {templates.map(t => (
                  <button key={t.id} type="button" onClick={() => setTemplateId(t.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${
                      templateId === t.id
                        ? "border-brand bg-brand/10"
                        : "border-slate-700 hover:border-slate-600 bg-slate-800/40"
                    }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                        {t.industry}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.eventTypeCount} event types · {t.statusCount} statuses · {t.customFieldCount} custom fields
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit user modal ────────────────────────────────────────────────────────────

function EditUserModal({
  user, clientId, onClose, onSaved,
}: {
  user: AdminClientUserDto;
  clientId: number;
  onClose: () => void;
  onSaved: (updated: Pick<AdminClientUserDto, "userId" | "displayName" | "email">) => void;
}) {
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail]             = useState(user.email);
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [apiError, setApiError]       = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!displayName.trim()) errs.displayName = "Display name is required.";
    if (!email.trim())       errs.email = "Email is required.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true); setErrors({}); setApiError("");
    try {
      await adminUpdateUser(user.userId, {
        email: email.trim(),
        displayName: displayName.trim(),
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        auditClientId: clientId,
      });
      toast.success("User updated");
      onSaved({ userId: user.userId, displayName: displayName.trim(), email: email.trim() });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Edit User</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{apiError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Name <span className="text-red-400">*</span></label>
            <input ref={firstRef} value={displayName}
              onChange={e => { setDisplayName(e.target.value); setErrors(p => ({ ...p, displayName: "" })); }}
              placeholder="Jane Smith"
              className={errors.displayName
                ? inputCls.replace("border-slate-700", "border-red-500")
                : inputCls} />
            {errors.displayName && <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email <span className="text-red-400">*</span></label>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
              placeholder="jane@company.com"
              className={errors.email
                ? inputCls.replace("border-slate-700", "border-red-500")
                : inputCls} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Invite new user modal ──────────────────────────────────────────────────────

function InviteUserModal({
  clientId, onClose, onInvited,
}: {
  clientId: number;
  onClose: () => void;
  onInvited: (user: AdminClientUserDto) => void;
}) {
  const toast = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [role, setRole]               = useState("Member");
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [apiError, setApiError]       = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!displayName.trim()) errs.displayName = "Display name is required.";
    if (!email.trim())        errs.email = "Email is required.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true); setErrors({}); setApiError("");
    try {
      const result = await adminCreateUser({
        email: email.trim(), displayName: displayName.trim(),
        isSuperAdmin: false, clientId, role, auditClientId: clientId,
      });
      if (!result.emailSent) {
        try { await navigator.clipboard.writeText(result.inviteUrl); } catch {}
        toast.warning("Email delivery failed — invite link copied to clipboard.");
      } else {
        toast.success("Invite sent");
      }
      onInvited({
        userId: result.user.id, displayName: result.user.displayName,
        email: result.user.email, role, isActive: true, isSuperAdmin: false,
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Invite User</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{apiError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Name <span className="text-red-400">*</span></label>
            <input ref={firstRef} value={displayName}
              onChange={e => { setDisplayName(e.target.value); setErrors(p => ({ ...p, displayName: "" })); }}
              placeholder="Jane Smith"
              className={errors.displayName ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
            {errors.displayName && <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email <span className="text-red-400">*</span></label>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
              placeholder="jane@company.com"
              className={errors.email ? inputCls.replace("border-slate-700", "border-red-500") : inputCls} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className={inputCls + " cursor-pointer"}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            An invitation email will be sent with a link to set their password.
          </p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition">
              {saving ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add existing user modal ────────────────────────────────────────────────────

function AddExistingModal({
  clientId, currentUserIds, onClose, onAdded,
}: {
  clientId: number;
  currentUserIds: Set<number>;
  onClose: () => void;
  onAdded: (user: AdminClientUserDto) => void;
}) {
  const toast = useToast();
  const [allUsers, setAllUsers]       = useState<AdminUserDto[]>([]);
  const [query, setQuery]             = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [role, setRole]               = useState("Member");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminGetUsers()
      .then(u => setAllUsers(u.filter(u => !currentUserIds.has(u.id) && !u.isSuperAdmin)))
      .catch(() => {});
    searchRef.current?.focus();
  }, [currentUserIds]);

  const results = query.trim()
    ? allUsers.filter(u =>
        u.displayName.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  async function handleAdd() {
    if (!selectedUser) return;
    setSaving(true); setError("");
    try {
      await adminGrantClientAccess(selectedUser.id, clientId, role);
      toast.success(`${selectedUser.displayName} added`);
      onAdded({
        userId: selectedUser.id, displayName: selectedUser.displayName,
        email: selectedUser.email, role, isActive: selectedUser.isActive, isSuperAdmin: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Add Existing User</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-sm text-red-300">{error}</div>
          )}

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Search by name or email</label>
            {selectedUser ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-brand/10 border border-brand/30">
                <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-xs shrink-0">
                  {selectedUser.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{selectedUser.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{selectedUser.email}</p>
                </div>
                <button onClick={() => { setSelectedUser(null); setQuery(""); setTimeout(() => searchRef.current?.focus(), 0); }}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 transition">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Type a name or email…"
                    className={inputCls.replace("w-full", "") + " w-full pl-9"} />
                </div>
                {query.length >= 1 && (
                  <div className="mt-1.5 rounded-lg border border-slate-700 bg-slate-800/80 overflow-hidden max-h-48 overflow-y-auto">
                    {results.length > 0 ? results.map(u => (
                      <button key={u.id} onClick={() => { setSelectedUser(u); setQuery(""); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                          {u.displayName[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 truncate">{u.displayName}</p>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                      </button>
                    )) : (
                      <p className="px-4 py-3 text-sm text-slate-500">No users found for "{query}".</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className={inputCls + " cursor-pointer"}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={!selectedUser || saving}
              className="flex-1 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition">
              {saving ? "Adding…" : "Add to Client"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type AddUserMode = "invite" | "existing" | null;

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

// ── SLA Rules Panel ───────────────────────────────────────────────────────────

type SlaRuleForm = { name: string; eventTypeId: string; investigationHours: string; closureHours: string };

function emptySlaForm(): SlaRuleForm {
  return { name: "", eventTypeId: "", investigationHours: "", closureHours: "" };
}

function SlaRulesPanel({ clientId }: { clientId: number }) {
  const [rules, setRules]         = useState<SlaRuleDto[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [form, setForm]           = useState<SlaRuleForm | null>(null);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [editForm, setEditForm]   = useState<SlaRuleForm>(emptySlaForm());

  const inputCls =
    "rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
    "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

  async function load() {
    setLoading(true); setError("");
    try {
      const [r, et] = await Promise.all([adminGetSlaRules(clientId), getEventTypes(clientId)]);
      setRules(r); setEventTypes(et);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    if (!form?.name.trim()) return;
    setSaving(true); setError("");
    try {
      await adminCreateSlaRule(clientId, {
        name: form.name.trim(),
        eventTypeId: form.eventTypeId ? Number(form.eventTypeId) : null,
        investigationHours: form.investigationHours ? Number(form.investigationHours) : null,
        closureHours: form.closureHours ? Number(form.closureHours) : null,
      });
      setForm(null);
      await load();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(rule: SlaRuleDto) {
    setSaving(true); setError("");
    try {
      await adminUpdateSlaRule(clientId, rule.id, {
        name: editForm.name.trim() || rule.name,
        eventTypeId: editForm.eventTypeId ? Number(editForm.eventTypeId) : null,
        investigationHours: editForm.investigationHours ? Number(editForm.investigationHours) : null,
        closureHours: editForm.closureHours ? Number(editForm.closureHours) : null,
      });
      setEditId(null);
      await load();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rule: SlaRuleDto) {
    if (!confirm(`Delete "${rule.name}"?`)) return;
    try {
      await adminDeleteSlaRule(clientId, rule.id);
      await load();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Delete failed.");
    }
  }

  function hoursLabel(h: number | null): string {
    if (h === null) return "—";
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    const rem = h % 24;
    return rem ? `${days}d ${rem}h` : `${days}d`;
  }

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-slate-500" />
          <div>
            <h2 className="text-sm font-semibold text-white">SLA Rules</h2>
            <p className="text-xs text-slate-500 mt-0.5">Set investigation and closure time limits per event type.</p>
          </div>
        </div>
        {!form && (
          <button onClick={() => setForm(emptySlaForm())}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover transition-colors">
            <Plus size={14} /> Add Rule
          </button>
        )}
      </div>
      {error && <p className="px-5 py-2 text-sm text-red-400 bg-red-950/40 border-b border-red-800/40">{error}</p>}
      {loading && <div className="px-5 py-8 text-center text-sm text-slate-500">Loading…</div>}
      {!loading && (
        <div className="divide-y divide-slate-700/40">
          {rules.length === 0 && !form && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No SLA rules defined yet.</p>
          )}
          {rules.map(rule => (
            <div key={rule.id} className="px-5 py-3">
              {editId === rule.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Rule Name *</label>
                      <input className={inputCls} value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Event Type</label>
                      <select className={inputCls} value={editForm.eventTypeId}
                        onChange={e => setEditForm(f => ({ ...f, eventTypeId: e.target.value }))}>
                        <option value="">All Types</option>
                        {eventTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Investigation Hours</label>
                      <input type="number" min="1" className={inputCls} placeholder="e.g. 4"
                        value={editForm.investigationHours}
                        onChange={e => setEditForm(f => ({ ...f, investigationHours: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Closure Hours</label>
                      <input type="number" min="1" className={inputCls} placeholder="e.g. 168"
                        value={editForm.closureHours}
                        onChange={e => setEditForm(f => ({ ...f, closureHours: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => void handleEdit(rule)} disabled={saving}
                      className="px-3 py-1.5 text-xs font-medium bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{rule.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rule.eventTypeName ?? "All types"} ·
                      Investigation: {hoursLabel(rule.investigationHours)} ·
                      Closure: {hoursLabel(rule.closureHours)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditId(rule.id);
                      setEditForm({
                        name: rule.name,
                        eventTypeId: rule.eventTypeId ? String(rule.eventTypeId) : "",
                        investigationHours: rule.investigationHours ? String(rule.investigationHours) : "",
                        closureHours: rule.closureHours ? String(rule.closureHours) : "",
                      });
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors" title="Edit">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => void handleDelete(rule)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {form && (
            <div className="px-5 py-4 bg-slate-800/30 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">New Rule</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rule Name *</label>
                  <input className={inputCls} placeholder="e.g. Default SLA" value={form.name}
                    onChange={e => setForm(f => ({ ...f!, name: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Event Type</label>
                  <select className={inputCls} value={form.eventTypeId}
                    onChange={e => setForm(f => ({ ...f!, eventTypeId: e.target.value }))}>
                    <option value="">All Types</option>
                    {eventTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Investigation Hours</label>
                  <input type="number" min="1" className={inputCls} placeholder="e.g. 4"
                    value={form.investigationHours}
                    onChange={e => setForm(f => ({ ...f!, investigationHours: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Closure Hours</label>
                  <input type="number" min="1" className={inputCls} placeholder="e.g. 168"
                    value={form.closureHours}
                    onChange={e => setForm(f => ({ ...f!, closureHours: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void handleAdd()} disabled={saving || !form.name.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
                  {saving ? "Saving…" : "Add Rule"}
                </button>
                <button onClick={() => setForm(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function AdminClientsPage() {
  const { activeClientId, setActiveClientId } = useAuth();
  const { reload: reloadBranding } = useBranding();
  const router = useRouter();
  const toast  = useToast();

  // Clients
  const [clients, setClients]     = useState<AdminClientDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Users for selected client
  const [users, setUsers]               = useState<AdminClientUserDto[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Templates
  const [templates, setTemplates]   = useState<EventTemplateDto[]>([]);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

  // Branding
  const [branding, setBranding]             = useState<ClientBrandingDto | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingSaving, setBrandingSaving]   = useState(false);
  const [brandingSystemName, setBrandingSystemName] = useState("");
  const [brandingColor, setBrandingColor]     = useState("");
  const [brandingLinkColor, setBrandingLinkColor] = useState("");
  const [logoUploading, setLogoUploading]     = useState(false);
  const [logoDeleting, setLogoDeleting]       = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Inbound email
  const [inboundEmail, setInboundEmail]         = useState<ClientInboundEmailDto | null>(null);
  const [inboundEmailLoading, setInboundEmailLoading] = useState(false);
  const [inboundEmailSaving, setInboundEmailSaving]   = useState(false);

  // Action state
  const [togglingClient, setTogglingClient] = useState<number | null>(null);
  const [revoking, setRevoking]             = useState<number | null>(null);
  const [switching, setSwitching]           = useState<number | null>(null);

  // Modals
  const [clientModal, setClientModal] = useState<ClientModalState | null>(null);
  const [addUserMode, setAddUserMode] = useState<AddUserMode>(null);
  const [editingUser, setEditingUser] = useState<AdminClientUserDto | null>(null);

  // Client detail tabs
  type ClientDetailTab = "users" | "branding" | "reporting" | "templates" | "sla";
  const [clientDetailTab, setClientDetailTab] = useState<ClientDetailTab>("users");

  const selectedClient = clients.find(c => c.id === selectedId) ?? null;

  const loadClients = useCallback(async () => {
    setLoading(true);
    try { setClients(await adminGetClients()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadClients();
    adminGetTemplates().then(setTemplates).catch(() => {});
  }, [loadClients]);

  useEffect(() => {
    if (!selectedId) { setUsers([]); return; }
    setUsersLoading(true);
    adminGetClientUsers(selectedId)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) { setBranding(null); setBrandingSystemName(""); setBrandingColor(""); setBrandingLinkColor(""); return; }
    setBrandingLoading(true);
    adminGetClientBranding(selectedId)
      .then(b => {
        setBranding(b);
        setBrandingSystemName(b.systemName ?? "");
        setBrandingColor(b.primaryColor ?? "");
        setBrandingLinkColor(b.linkColor ?? "");
      })
      .catch(() => setBranding(null))
      .finally(() => setBrandingLoading(false));
  }, [selectedId]);

  // Reset detail tab when client selection changes
  useEffect(() => { setClientDetailTab("users"); }, [selectedId]);

  useEffect(() => {
    if (!selectedId) { setInboundEmail(null); return; }
    setInboundEmailLoading(true);
    getClientInboundEmail(selectedId)
      .then(setInboundEmail)
      .catch(() => setInboundEmail(null))
      .finally(() => setInboundEmailLoading(false));
  }, [selectedId]);

  async function handleSaveInboundEmail(
    slug: string | null,
    eventTypeId: number | null,
    statusId: number | null,
  ) {
    if (!selectedId) return;
    setInboundEmailSaving(true);
    try {
      await updateClientInboundEmail(selectedId, {
        inboundEmailSlug: slug,
        defaultInboundEventTypeId: eventTypeId,
        defaultInboundWorkflowStatusId: statusId,
      });
      // Reload to get the computed inboundAddress from the server
      const updated = await getClientInboundEmail(selectedId);
      setInboundEmail(updated);
      toast.success("Inbound email settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save inbound email settings.");
    } finally {
      setInboundEmailSaving(false);
    }
  }

  async function handleSaveBranding() {
    if (!selectedId) return;
    setBrandingSaving(true);
    try {
      await adminUpdateClientBranding(selectedId, {
        systemName: brandingSystemName.trim() || null,
        primaryColor: brandingColor || null,
        linkColor: brandingLinkColor || null,
      });
      setBranding(prev => prev
        ? { ...prev, systemName: brandingSystemName.trim() || null, primaryColor: brandingColor || null, linkColor: brandingLinkColor || null }
        : { systemName: brandingSystemName.trim() || null, primaryColor: brandingColor || null, linkColor: brandingLinkColor || null, logoUrl: null }
      );
      if (selectedId === activeClientId) reloadBranding();
      toast.success("Branding saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save branding.");
    } finally {
      setBrandingSaving(false);
    }
  }

  async function handleRemoveBranding() {
    if (!selectedId) return;
    setBrandingSaving(true);
    try {
      await adminUpdateClientBranding(selectedId, { systemName: null, primaryColor: null, linkColor: null });
      if (branding?.logoUrl) await adminDeleteClientLogo(selectedId);
      setBranding(prev => prev ? { ...prev, systemName: null, primaryColor: null, linkColor: null, logoUrl: null } : null);
      setBrandingSystemName("");
      setBrandingColor("");
      setBrandingLinkColor("");
      if (selectedId === activeClientId) reloadBranding();
      toast.success("Branding cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove branding.");
    } finally {
      setBrandingSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB."); return; }
    setLogoUploading(true);
    try {
      const result = await adminUploadClientLogo(selectedId, file);
      setBranding(prev => prev ? { ...prev, logoUrl: result.logoUrl } : result);
      if (selectedId === activeClientId) reloadBranding();
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleDeleteLogo() {
    if (!selectedId) return;
    setLogoDeleting(true);
    try {
      await adminDeleteClientLogo(selectedId);
      setBranding(prev => prev ? { ...prev, logoUrl: null } : null);
      if (selectedId === activeClientId) reloadBranding();
      toast.success("Logo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove logo.");
    } finally {
      setLogoDeleting(false);
    }
  }

  async function handleToggleClient(id: number) {
    setTogglingClient(id);
    try {
      const res = await adminToggleClientActive(id);
      setClients(prev => prev.map(c => c.id === id ? { ...c, isActive: res.isActive } : c));
    } finally {
      setTogglingClient(null);
    }
  }

  async function handleRoleChange(userId: number, newRole: string) {
    if (!selectedId) return;
    const prev = users.find(u => u.userId === userId);
    if (!prev || prev.role === newRole) return;
    setUsers(u => u.map(u => u.userId === userId ? { ...u, role: newRole } : u));
    try {
      await adminUpdateClientUserRole(selectedId, userId, newRole);
    } catch (err) {
      setUsers(u => u.map(u => u.userId === userId ? { ...u, role: prev.role } : u));
      toast.error(err instanceof Error ? err.message : "Failed to update role.");
    }
  }

  async function handleToggleUser(userId: number) {
    try {
      const res = await adminToggleUserActive(userId, selectedId ?? undefined);
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, isActive: res.isActive } : u));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle user.");
    }
  }

  async function handleRevokeUser(userId: number) {
    if (!selectedId) return;
    setRevoking(userId);
    try {
      await adminRevokeClientAccess(userId, selectedId);
      setUsers(prev => prev.filter(u => u.userId !== userId));
      setClients(prev => prev.map(c =>
        c.id === selectedId ? { ...c, userCount: Math.max(0, c.userCount - 1) } : c
      ));
      toast.success("Access revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke access.");
    } finally {
      setRevoking(null);
    }
  }

  function handleSwitchTo(clientId: number) {
    setSwitching(clientId);
    setActiveClientId(clientId);
    router.refresh();
    setTimeout(() => { setSwitching(null); router.push("/dashboard"); }, 400);
  }

  function handleUserAdded(user: AdminClientUserDto) {
    setUsers(prev => [...prev, user]);
    setClients(prev => prev.map(c =>
      c.id === selectedId ? { ...c, userCount: c.userCount + 1 } : c
    ));
    setAddUserMode(null);
  }

  async function handleApplyTemplate(templateId: string, templateName: string) {
    if (!selectedId) return;
    if (!window.confirm(
      `Apply "${templateName}" to ${selectedClient?.name}?\n\n` +
      `This will add event types, workflow statuses, transitions, and custom fields. ` +
      `Existing configuration will not be removed.`
    )) return;
    setApplyingTemplate(templateId);
    try {
      await adminApplyTemplate(selectedId, templateId);
      toast.success(`Template applied — event types and workflow configured.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply template.");
    } finally {
      setApplyingTemplate(null);
    }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentUserIds = new Set(users.map(u => u.userId));

  return (
    <div className="flex flex-1">

      {/* ── Left: Client list ──────────────────────────────────────────── */}
      <div className="w-64 lg:w-72 flex-shrink-0 border-r border-slate-800 flex flex-col">

        {/* Panel header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Clients</span>
            <button
              onClick={() => setClientModal({ mode: "create" })}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand text-xs font-semibold transition"
            >
              <Plus size={12} /> New
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand/50 transition"
            />
          </div>
        </div>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-slate-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-xs text-slate-600 text-center">
              {search ? "No clients match." : "No clients yet."}
            </p>
          ) : (
            filtered.map(client => {
              const isSelected  = client.id === selectedId;
              const isToggling  = togglingClient === client.id;

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedId(client.id)}
                  className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-r-2 ${
                    isSelected
                      ? "bg-brand/10 border-brand"
                      : "border-transparent hover:bg-slate-800/50"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    isSelected ? "bg-brand/20 text-brand" : "bg-slate-700/60 text-slate-400"
                  }`}>
                    {client.name[0]?.toUpperCase()}
                  </div>

                  {/* Name + users */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate transition-colors ${isSelected ? "text-brand" : "text-slate-200"}`}>
                      {client.name}
                    </p>
                    <p className="text-xs text-slate-500">{client.userCount} {client.userCount === 1 ? "user" : "users"}</p>
                  </div>

                  {/* Active dot + hover actions */}
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full shrink-0 transition-opacity ${client.isActive ? "bg-emerald-500" : "bg-slate-600"} ${isSelected ? "opacity-100" : "group-hover:opacity-0"}`} />
                    <div className="hidden group-hover:flex items-center gap-0.5 absolute right-3">
                      <button
                        onClick={e => { e.stopPropagation(); setClientModal({ mode: "edit", client }); }}
                        title="Edit client"
                        className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleClient(client.id); }}
                        disabled={isToggling}
                        title={client.isActive ? "Deactivate" : "Activate"}
                        className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition"
                      >
                        {isToggling ? <RefreshCw size={11} className="animate-spin" /> : <Power size={11} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Client detail ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selectedClient ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
              <Building2 size={28} className="text-slate-600" />
            </div>
            <h2 className="text-slate-400 font-medium mb-1">Select a client</h2>
            <p className="text-xs text-slate-600 max-w-xs">
              Choose a client from the list to view and manage its users.
            </p>
          </div>
        ) : (
          <div className="p-6 lg:p-8 max-w-4xl">

            {/* Client header */}
            <div className="flex items-start justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-xl font-bold text-brand shrink-0">
                  {selectedClient.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl font-bold text-white">{selectedClient.name}</h1>
                    {selectedClient.parentClientName && (
                      <span className="text-xs text-slate-500 bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 rounded-full">
                        ↳ {selectedClient.parentClientName}
                      </span>
                    )}
                    {selectedClient.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                        <CheckCircle2 size={9} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">
                        <XCircle size={9} /> Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">#{selectedClient.id} · {selectedClient.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-1">
                {activeClientId !== selectedClient.id && (
                  <button
                    onClick={() => handleSwitchTo(selectedClient.id)}
                    disabled={!!switching}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-600 text-slate-300 hover:bg-slate-800 transition disabled:opacity-60"
                  >
                    {switching === selectedClient.id
                      ? <RefreshCw size={12} className="animate-spin" />
                      : <SwitchCamera size={12} />
                    }
                    Switch to
                  </button>
                )}
                <button
                  onClick={() => handleToggleClient(selectedClient.id)}
                  disabled={togglingClient === selectedClient.id}
                  title={selectedClient.isActive ? "Deactivate client" : "Activate client"}
                  className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-60"
                >
                  {togglingClient === selectedClient.id
                    ? <RefreshCw size={15} className="animate-spin" />
                    : <Power size={15} />
                  }
                </button>
                <button
                  onClick={() => setClientModal({ mode: "edit", client: selectedClient })}
                  className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                  title="Edit client"
                >
                  <Edit2 size={15} />
                </button>
              </div>
            </div>

            {/* Detail tabs */}
            <div className="border-b border-slate-700/60 mb-6 flex gap-1">
              {(["users", "branding", "reporting", "templates", "sla"] as const).map(tab => {
                const labels: Record<string, string> = {
                  users: "Users", branding: "Branding", reporting: "Reporting", templates: "Templates", sla: "SLA Rules",
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setClientDetailTab(tab)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                      clientDetailTab === tab
                        ? "bg-slate-800 text-white border border-b-0 border-slate-700/60"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Users section */}
            {clientDetailTab === "users" && (
            <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                <div>
                  <h2 className="text-sm font-semibold text-white">Users</h2>
                  {!usersLoading && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {users.length} {users.length === 1 ? "member" : "members"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddUserMode("existing")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-medium transition"
                  >
                    <Users size={13} /> Add Existing
                  </button>
                  <button
                    onClick={() => setAddUserMode("invite")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-brand-text text-xs font-semibold transition"
                  >
                    <Plus size={13} /> Invite User
                  </button>
                </div>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-slate-600" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <Users size={24} className="text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">No users in this client yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Use "Invite User" to add the first member.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/40">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-32">Role</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-24">Status</th>
                      <th className="px-4 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.userId}
                        className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${i % 2 === 0 ? "" : "bg-slate-800/10"}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                              {user.displayName[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                                {user.displayName}
                                {user.isSuperAdmin && (
                                  <Shield size={10} className="text-amber-500 shrink-0" />
                                )}
                              </p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            onChange={e => handleRoleChange(user.userId, e.target.value)}
                            className="bg-slate-700/60 border border-slate-600/60 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand/50 cursor-pointer"
                          >
                            <option value="Member">Member</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {user.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                              <CheckCircle2 size={9} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">
                              <XCircle size={9} /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingUser(user)}
                              title="Edit user"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700 transition"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleToggleUser(user.userId)}
                              title={user.isActive ? "Deactivate user" : "Activate user"}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700 transition"
                            >
                              <Power size={13} />
                            </button>
                            <button
                              onClick={() => handleRevokeUser(user.userId)}
                              disabled={revoking === user.userId}
                              title="Revoke access"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition disabled:opacity-50"
                            >
                              {revoking === user.userId
                                ? <RefreshCw size={13} className="animate-spin" />
                                : <X size={13} />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            )}

            {/* ── Branding ────────────────────────────────────────────── */}
            {clientDetailTab === "branding" && (
            <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
                <Palette size={15} className="text-slate-500" />
                <div>
                  <h2 className="text-sm font-semibold text-white">Branding</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Custom logo, system name, and accent color for this client.</p>
                </div>
              </div>
              {brandingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-slate-600" />
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  {/* Logo */}
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">Logo</p>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {branding?.logoUrl
                          ? <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                          : <ImageIcon size={24} className="text-slate-600" />
                        }
                      </div>
                      <div className="flex flex-col gap-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        <button
                          onClick={() => logoInputRef.current?.click()}
                          disabled={logoUploading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-medium transition disabled:opacity-60"
                        >
                          {logoUploading
                            ? <><RefreshCw size={12} className="animate-spin" /> Uploading…</>
                            : <><ImageIcon size={12} /> {branding?.logoUrl ? "Replace Logo" : "Upload Logo"}</>
                          }
                        </button>
                        {branding?.logoUrl && (
                          <button
                            onClick={handleDeleteLogo}
                            disabled={logoDeleting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-800/60 hover:bg-red-950/20 text-xs font-medium transition disabled:opacity-60"
                          >
                            {logoDeleting
                              ? <><RefreshCw size={12} className="animate-spin" /> Removing…</>
                              : <><Trash2 size={12} /> Remove Logo</>
                            }
                          </button>
                        )}
                        <p className="text-[11px] text-slate-600">PNG, JPEG, WebP or SVG · max 2 MB</p>
                      </div>
                    </div>
                  </div>

                  {/* System name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">System Name</label>
                    <input
                      value={brandingSystemName}
                      onChange={e => setBrandingSystemName(e.target.value)}
                      placeholder="e.g. Acme Safety Hub"
                      maxLength={100}
                      className={inputCls}
                    />
                    <p className="mt-1 text-[11px] text-slate-600">Replaces &quot;IMPERAOPS&quot; in the navigation sidebar.</p>
                  </div>

                  {/* Primary color */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandingColor || "#2F80ED"}
                        onChange={e => {
                          setBrandingColor(e.target.value);
                          document.documentElement.style.setProperty("--color-brand", e.target.value);
                        }}
                        className="h-9 w-14 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
                      />
                      <input
                        value={brandingColor}
                        onChange={e => {
                          setBrandingColor(e.target.value);
                          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value))
                            document.documentElement.style.setProperty("--color-brand", e.target.value);
                        }}
                        placeholder="#2F80ED"
                        maxLength={7}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition font-mono"
                      />
                      {brandingColor && (
                        <button
                          onClick={() => {
                            setBrandingColor("");
                            document.documentElement.style.removeProperty("--color-brand");
                          }}
                          className="text-xs text-slate-500 hover:text-slate-300 transition"
                          title="Reset to default"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">Used for buttons, active states, and background highlights.</p>
                  </div>

                  {/* Link color */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Link / Text Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandingLinkColor || brandingColor || "#2F80ED"}
                        onChange={e => {
                          setBrandingLinkColor(e.target.value);
                          document.documentElement.style.setProperty("--color-brand-link", e.target.value);
                        }}
                        className="h-9 w-14 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
                      />
                      <input
                        value={brandingLinkColor}
                        onChange={e => {
                          setBrandingLinkColor(e.target.value);
                          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value))
                            document.documentElement.style.setProperty("--color-brand-link", e.target.value);
                        }}
                        placeholder={brandingColor || "#2F80ED"}
                        maxLength={7}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition font-mono"
                      />
                      {brandingLinkColor && (
                        <button
                          onClick={() => {
                            setBrandingLinkColor("");
                            document.documentElement.style.setProperty("--color-brand-link", brandingColor || "#2F80ED");
                          }}
                          className="text-xs text-slate-500 hover:text-slate-300 transition"
                          title="Reset to accent color"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">Used for hyperlinks and text on light backgrounds. Leave blank to match the accent color.</p>
                  </div>

                  {/* Live preview */}
                  <div className="rounded-lg bg-white border border-slate-700 px-4 py-3 flex items-center gap-5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide shrink-0">Preview</span>
                    <span className="text-sm font-medium text-brand-link">Hyperlink text →</span>
                    <span className="text-sm font-medium text-slate-700">Normal text</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold text-brand-text bg-brand">Button</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={handleRemoveBranding}
                      disabled={brandingSaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 text-sm font-semibold transition"
                    >
                      {brandingSaving ? <><RefreshCw size={13} className="animate-spin" /> Clearing…</> : "Remove Branding"}
                    </button>
                    <button
                      onClick={handleSaveBranding}
                      disabled={brandingSaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition"
                    >
                      {brandingSaving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : "Save Branding"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            )}

            {/* ── Reporting (Public Reporting + Inbound Email) ─────────── */}
            {clientDetailTab === "reporting" && (<>
            {selectedClient && (
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
                <PublicReportingCard slug={selectedClient.slug} />
              </div>
            )}

            {/* ── Inbound Email ────────────────────────────────────────── */}
            {selectedClient && (
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
                    clientId={selectedClient.id}
                    config={inboundEmail}
                    saving={inboundEmailSaving}
                    onSave={handleSaveInboundEmail}
                  />
                ) : null}
              </div>
            )}
            </>)}

            {/* ── Apply Template ──────────────────────────────────────── */}
            {/* ── SLA Rules ───────────────────────────────────────────── */}
            {clientDetailTab === "sla" && selectedId && (
              <SlaRulesPanel clientId={selectedId} />
            )}

            {clientDetailTab === "templates" && (
            <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
                  <LayoutTemplate size={15} className="text-slate-500" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">Apply a Template</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adds pre-built event types, workflow, and fields. Won&apos;t remove existing config.
                    </p>
                  </div>
                </div>
                {templates.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">No templates available.</div>
                ) : (
                <div className="p-4 space-y-3">
                  {templates.map(t => {
                    const isApplied = selectedClient?.appliedTemplateIds?.includes(t.id) ?? false;
                    return (
                      <div key={t.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-200">{t.name}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                              {t.industry}
                            </span>
                            {isApplied && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                                Applied
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {t.eventTypeCount} event types · {t.statusCount} statuses · {t.customFieldCount} custom fields
                          </p>
                        </div>
                        <button
                          onClick={() => handleApplyTemplate(t.id, t.name)}
                          disabled={isApplied || applyingTemplate === t.id}
                          title={isApplied ? "Already applied to this client" : undefined}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {applyingTemplate === t.id
                            ? <><RefreshCw size={12} className="animate-spin" /> Applying…</>
                            : isApplied ? "Applied" : "Apply"
                          }
                        </button>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {clientModal && (
        <ClientModal
          state={clientModal}
          clients={clients}
          onClose={() => setClientModal(null)}
          onSaved={(refreshId) => {
            toast.success(clientModal.mode === "create" ? "Client created" : "Client updated");
            setClientModal(null);
            loadClients().then(() => {
              if (refreshId) setSelectedId(refreshId);
            });
          }}
        />
      )}
      {addUserMode === "invite" && selectedId && (
        <InviteUserModal
          clientId={selectedId}
          onClose={() => setAddUserMode(null)}
          onInvited={handleUserAdded}
        />
      )}
      {addUserMode === "existing" && selectedId && (
        <AddExistingModal
          clientId={selectedId}
          currentUserIds={currentUserIds}
          onClose={() => setAddUserMode(null)}
          onAdded={handleUserAdded}
        />
      )}
      {editingUser && selectedId && (
        <EditUserModal
          user={editingUser}
          clientId={selectedId}
          onClose={() => setEditingUser(null)}
          onSaved={({ userId, displayName, email }) => {
            setUsers(prev => prev.map(u =>
              u.userId === userId ? { ...u, displayName, email } : u
            ));
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}
