"use client";

import { useState } from "react";
import { Camera, ChevronDown, ChevronRight, FileText, Monitor, MoreHorizontal, Package, Plus, Trash2, Video } from "lucide-react";
import { addEvidence, deleteEvidence, getEvidence } from "@/lib/api";
import { useToast } from "@/components/toast-context";
import type { EvidenceDto } from "@/lib/types";

const EVIDENCE_TYPES = ["document", "photo", "video", "physical", "digital", "other"];

const EVIDENCE_ICONS: Record<string, React.ElementType> = {
  document: FileText,
  photo: Camera,
  video: Video,
  physical: Package,
  digital: Monitor,
  other: MoreHorizontal,
};

export function EvidenceSection({
  publicId,
  clientId,
  evidence,
  setEvidence,
  isManager,
}: {
  publicId: string;
  clientId?: number;
  evidence: EvidenceDto[];
  setEvidence: React.Dispatch<React.SetStateAction<EvidenceDto[]>>;
  isManager: boolean;
}) {
  const toast = useToast();
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eType, setEType] = useState("document");

  async function handleAddEvidence() {
    if (!eName.trim()) return;
    try {
      await addEvidence(publicId, { title: eName.trim(), description: eDesc.trim() || null, evidenceType: eType }, clientId);
      setEName(""); setEDesc(""); setEType("document");
      setShowAddEvidence(false);
      const e = await getEvidence(publicId, clientId);
      setEvidence(e);
      toast.success("Evidence added");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add evidence");
    }
  }

  async function handleDeleteEvidence(id: number) {
    try {
      await deleteEvidence(publicId, id, clientId);
      setEvidence(prev => prev.filter(e => e.id !== id));
      toast.success("Evidence removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete evidence");
    }
  }

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5">
      <div onClick={() => setEvidenceOpen(v => !v)} className="flex items-center gap-2 w-full text-left mb-3 cursor-pointer" role="button">
        {evidenceOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
        <h3 className="font-semibold text-slate-800 dark:text-steel-white">Evidence</h3>
        <span className="text-xs text-slate-400 ml-1">{evidence.length}</span>
        <div className="flex-1" />
        <button
          onClick={e => { e.stopPropagation(); setShowAddEvidence(true); }}
          className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {evidenceOpen && (
        <div className="space-y-2">
          {evidence.map(ev => {
            const Icon = EVIDENCE_ICONS[ev.evidenceType] ?? MoreHorizontal;
            return (
              <div key={ev.id} className="flex items-center gap-3 border border-slate-100 dark:border-slate-line/40 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-midnight flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-steel-white truncate">{ev.title}</p>
                  {ev.description && <p className="text-xs text-slate-400 truncate">{ev.description}</p>}
                </div>
                <span className="text-xs text-slate-400 capitalize shrink-0">{ev.evidenceType}</span>
                {isManager && (
                  <button onClick={() => handleDeleteEvidence(ev.id)} className="p-1 text-slate-400 hover:text-critical rounded transition">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
          {evidence.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No evidence collected yet.</p>}
        </div>
      )}

      {showAddEvidence && (
        <div className="mt-3 border border-slate-200 dark:border-slate-line rounded-xl p-4 space-y-3">
          <input value={eName} onChange={e => setEName(e.target.value)} placeholder="Evidence title" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand" />
          <input value={eDesc} onChange={e => setEDesc(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand" />
          <select value={eType} onChange={e => setEType(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand">
            {EVIDENCE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={handleAddEvidence} disabled={!eName.trim()} className="px-4 py-1.5 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition">Save</button>
            <button onClick={() => setShowAddEvidence(false)} className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
