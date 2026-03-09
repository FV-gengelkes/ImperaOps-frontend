"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Plus, Trash2, RefreshCw, Pencil, Download, Upload, X } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { isAdmin as checkAdmin, isManagerOrAbove as checkManager } from "@/lib/role-helpers";
import {
  getClientDocuments,
  uploadDocument,
  updateDocumentMetadata,
  replaceDocumentFile,
  getDocumentDownloadUrl,
  deleteDocument,
} from "@/lib/api";
import type { ClientDocumentDto } from "@/lib/types";

const CATEGORIES = ["policy", "procedure", "checklist", "form", "manual", "other"] as const;

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { clientId } = useClientId();
  const { clients, isSuperAdmin } = useAuth();
  const toast = useToast();

  const role = clients.find(c => c.id === clientId)?.role;
  const isManager = checkManager(isSuperAdmin, role);
  const isAdmin = checkAdmin(isSuperAdmin, role);

  const [docs, setDocs] = useState<ClientDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ClientDocumentDto | null>(null);

  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("policy");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      setDocs(await getClientDocuments(clientId, filter ?? undefined));
    } catch { /* ignore */ }
    setLoading(false);
  }, [clientId, filter]);

  useEffect(() => { void load(); }, [load]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      const doc = await uploadDocument(clientId, uploadFile, uploadTitle.trim(), uploadDesc.trim() || null, uploadCategory);
      setDocs(prev => [doc, ...prev]);
      setShowUpload(false);
      setUploadFile(null); setUploadTitle(""); setUploadDesc(""); setUploadCategory("policy");
      toast.success("Document uploaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    }
    setUploading(false);
  }

  async function handleEditSave() {
    if (!clientId || !editingDoc) return;
    setSaving(true);
    try {
      await updateDocumentMetadata(clientId, editingDoc.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        category: editCategory,
      });
      setDocs(prev => prev.map(d => d.id === editingDoc.id ? { ...d, title: editTitle.trim(), description: editDesc.trim() || null, category: editCategory } : d));
      setEditingDoc(null);
      toast.success("Document updated");
    } catch (err: any) {
      toast.error(err?.message ?? "Update failed");
    }
    setSaving(false);
  }

  async function handleReplace(doc: ClientDocumentDto) {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !clientId) return;
      try {
        const updated = await replaceDocumentFile(clientId, doc.id, file);
        setDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
        toast.success("File replaced");
      } catch (err: any) {
        toast.error(err?.message ?? "Replace failed");
      }
    };
    input.click();
  }

  async function handleDownload(doc: ClientDocumentDto) {
    if (!clientId) return;
    try {
      const { url } = await getDocumentDownloadUrl(clientId, doc.id);
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error(err?.message ?? "Download failed");
    }
  }

  async function handleDelete(id: number) {
    if (!clientId) return;
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteDocument(clientId, id);
      setDocs(prev => prev.filter(d => d.id !== id));
      toast.success("Document deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed");
    }
    setDeleting(null);
  }

  function startEdit(doc: ClientDocumentDto) {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditDesc(doc.description ?? "");
    setEditCategory(doc.category);
    setShowUpload(false);
  }

  return (
    <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Document Library</h1>
      </div>
      <p className="text-slate-500 mb-8">
        Upload and manage organizational policies, procedures, checklists, and other documents.
        Documents can be linked to events for compliance reference.
      </p>

      {!clientId ? (
        <p className="text-sm text-slate-400">Set a client to manage documents.</p>
      ) : (
        <div className="space-y-4">
          {/* Filter + Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setFilter(null); if (showUpload) setUploadCategory(CATEGORIES[0]); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!filter ? "bg-brand text-white" : "bg-slate-100 text-slate-500 hover:text-slate-700"}`}
            >All</button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setFilter(cat); if (showUpload) setUploadCategory(cat); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${filter === cat ? "bg-brand text-white" : "bg-slate-100 text-slate-500 hover:text-slate-700"}`}
              >{cat}</button>
            ))}
            <div className="flex-1" />
            <button onClick={() => void load()} title="Refresh" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
              <RefreshCw size={14} />
            </button>
            {isManager && !showUpload && (
              <button
                onClick={() => { setShowUpload(true); setEditingDoc(null); setUploadCategory(filter ?? CATEGORIES[0]); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
              >
                <Plus size={14} /> Upload Document
              </button>
            )}
          </div>

          {/* Upload form */}
          {showUpload && (
            <form onSubmit={handleUpload} className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
              <p className="text-sm font-semibold text-slate-700">Upload New Document</p>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">File <span className="text-red-400">*</span></label>
                <input ref={fileInputRef} type="file" className="text-sm" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Title <span className="text-red-400">*</span></label>
                <input className={inputCls} value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Document title" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Description</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="Optional description" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Category <span className="text-red-400">*</span></label>
                <select className={inputCls} value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">Cancel</button>
                <button type="submit" disabled={uploading || !uploadFile || !uploadTitle.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
                  {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          )}

          {/* Document list */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Documents {!loading && <span className="ml-2 text-sm font-normal text-slate-400">({docs.length})</span>}
              </h2>
            </div>

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
            ) : docs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No documents uploaded yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {docs.map(doc => (
                  <li key={doc.id}>
                    {editingDoc?.id === doc.id ? (
                      <div className="bg-slate-50/60 p-5 space-y-3">
                        <p className="text-sm font-semibold text-slate-700">Edit Document</p>
                        <input className={inputCls} value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" />
                        <textarea className={`${inputCls} resize-none`} rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" />
                        <select className={inputCls} value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingDoc(null)} className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition">Cancel</button>
                          <button onClick={handleEditSave} disabled={saving || !editTitle.trim()} className="px-4 py-1.5 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
                            {saving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4 px-5 py-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText size={15} className="text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                            <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium capitalize">{doc.category}</span>
                            {doc.version > 1 && <span className="text-xs text-slate-400">v{doc.version}</span>}
                          </div>
                          <p className="text-xs text-slate-500 mb-1">{doc.fileName} · {formatSize(doc.fileSizeBytes)}</p>
                          {doc.description && <p className="text-xs text-slate-400">{doc.description}</p>}
                          <p className="text-xs text-slate-400 mt-1">
                            Uploaded by {doc.uploadedByDisplayName} · {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleDownload(doc)} className="p-1.5 text-slate-300 hover:text-brand transition-colors" title="Download">
                            <Download size={14} />
                          </button>
                          {isManager && (
                            <>
                              <button onClick={() => startEdit(doc)} className="p-1.5 text-slate-300 hover:text-brand transition-colors" title="Edit">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleReplace(doc)} className="p-1.5 text-slate-300 hover:text-brand transition-colors" title="Replace file">
                                <Upload size={14} />
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => void handleDelete(doc.id)}
                              disabled={deleting === doc.id}
                              className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors"
                              title="Delete"
                            >
                              {deleting === doc.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
