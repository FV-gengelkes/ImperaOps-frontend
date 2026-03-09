"use client";

import { useEffect, useState } from "react";
import { FileText, Link2, X, Download, Loader2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { isInvestigatorOrAbove, isManagerOrAbove } from "@/lib/role-helpers";
import {
  getEventDocuments,
  getClientDocuments,
  linkDocumentToEvent,
  unlinkDocumentFromEvent,
  getDocumentDownloadUrl,
} from "@/lib/api";
import type { DocumentReferenceDto, ClientDocumentDto } from "@/lib/types";

export function EventDocumentsCard({ publicId }: { publicId: string }) {
  const { clientId } = useClientId();
  const { clients, isSuperAdmin } = useAuth();
  const toast = useToast();
  const role = clients.find(c => c.id === clientId)?.role;
  const isInvestigator = isInvestigatorOrAbove(isSuperAdmin, role);
  const isManager = isManagerOrAbove(isSuperAdmin, role);

  const [refs, setRefs] = useState<DocumentReferenceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [allDocs, setAllDocs] = useState<ClientDocumentDto[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  async function load() {
    setLoading(true);
    try { setRefs(await getEventDocuments(publicId)); } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [publicId]);

  async function openPicker() {
    if (!clientId) return;
    setShowPicker(true);
    setPickerLoading(true);
    try { setAllDocs(await getClientDocuments(clientId)); } catch { /* ignore */ }
    setPickerLoading(false);
  }

  async function handleLink(docId: number) {
    setLinking(true);
    try {
      const ref = await linkDocumentToEvent(publicId, docId);
      setRefs(prev => [...prev, ref]);
      setShowPicker(false);
      toast.success("Document linked");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to link document");
    }
    setLinking(false);
  }

  async function handleUnlink(refId: number) {
    try {
      await unlinkDocumentFromEvent(publicId, refId);
      setRefs(prev => prev.filter(r => r.id !== refId));
      toast.success("Document unlinked");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to unlink document");
    }
  }

  async function handleDownload(docId: number) {
    if (!clientId) return;
    try {
      const { url } = await getDocumentDownloadUrl(clientId, docId);
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error(err?.message ?? "Download failed");
    }
  }

  const linkedDocIds = new Set(refs.map(r => r.documentId));
  const availableDocs = allDocs.filter(d => !linkedDocIds.has(d.id));

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-slate-400" />
          <h3 className="font-semibold text-slate-800 dark:text-steel-white">Documents</h3>
          <span className="text-xs text-slate-400">{refs.length}</span>
        </div>
        {isInvestigator && (
          <button
            onClick={openPicker}
            className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1"
          >
            <Link2 size={12} /> Link Document
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin text-slate-400" />
        </div>
      ) : refs.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">No documents linked to this event.</p>
      ) : (
        <div className="space-y-2">
          {refs.map(ref => (
            <div key={ref.id} className="flex items-center gap-3 border border-slate-100 dark:border-slate-line/40 rounded-xl p-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-midnight flex items-center justify-center shrink-0">
                <FileText size={15} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-steel-white truncate">{ref.documentTitle}</p>
                <p className="text-xs text-slate-400 capitalize">{ref.documentCategory} · {ref.documentFileName}</p>
              </div>
              <button onClick={() => handleDownload(ref.documentId)} className="p-1 text-slate-400 hover:text-brand rounded transition" title="Download">
                <Download size={13} />
              </button>
              {isManager && (
                <button onClick={() => handleUnlink(ref.id)} className="p-1 text-slate-400 hover:text-critical rounded transition" title="Unlink">
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Picker modal */}
      <Modal open={showPicker} onClose={() => setShowPicker(false)} title="Link a Document">
        <div className="overflow-y-auto max-h-[55vh]">
          {pickerLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : availableDocs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No documents available to link.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-line">
              {availableDocs.map(doc => (
                <li key={doc.id}>
                  <button
                    onClick={() => handleLink(doc.id)}
                    disabled={linking}
                    className="w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-midnight transition disabled:opacity-50"
                  >
                    <p className="text-sm font-medium text-slate-800 dark:text-steel-white">{doc.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{doc.category} · {doc.fileName}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
