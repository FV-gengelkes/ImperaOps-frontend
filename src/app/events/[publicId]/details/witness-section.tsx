"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, User } from "lucide-react";
import { addWitness, deleteWitness, getWitnesses } from "@/lib/api";
import { useToast } from "@/components/toast-context";
import type { WitnessDto } from "@/lib/types";

export function WitnessSection({
  publicId,
  witnesses,
  setWitnesses,
  isManager,
}: {
  publicId: string;
  witnesses: WitnessDto[];
  setWitnesses: React.Dispatch<React.SetStateAction<WitnessDto[]>>;
  isManager: boolean;
}) {
  const toast = useToast();
  const [witnessesOpen, setWitnessesOpen] = useState(true);
  const [showAddWitness, setShowAddWitness] = useState(false);
  const [wName, setWName] = useState("");
  const [wContact, setWContact] = useState("");
  const [wStatement, setWStatement] = useState("");

  async function handleAddWitness() {
    if (!wName.trim() || !wStatement.trim()) return;
    try {
      await addWitness(publicId, { witnessName: wName.trim(), witnessContact: wContact.trim() || null, statement: wStatement });
      setWName(""); setWContact(""); setWStatement("");
      setShowAddWitness(false);
      const w = await getWitnesses(publicId);
      setWitnesses(w);
      toast.success("Witness added");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add witness");
    }
  }

  async function handleDeleteWitness(id: number) {
    try {
      await deleteWitness(publicId, id);
      setWitnesses(prev => prev.filter(w => w.id !== id));
      toast.success("Witness removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete witness");
    }
  }

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5">
      <div onClick={() => setWitnessesOpen(v => !v)} className="flex items-center gap-2 w-full text-left mb-3 cursor-pointer" role="button">
        {witnessesOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
        <h3 className="font-semibold text-slate-800 dark:text-steel-white">Witness Statements</h3>
        <span className="text-xs text-slate-400 ml-1">{witnesses.length}</span>
        <div className="flex-1" />
        <button
          onClick={e => { e.stopPropagation(); setShowAddWitness(true); }}
          className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {witnessesOpen && (
        <div className="space-y-3">
          {witnesses.map(w => (
            <div key={w.id} className="border border-slate-100 dark:border-slate-line/40 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <User size={13} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-800 dark:text-steel-white">{w.witnessName}</span>
                  {w.witnessContact && <span className="text-xs text-slate-400">{w.witnessContact}</span>}
                </div>
                {isManager && (
                  <button onClick={() => handleDeleteWitness(w.id)} className="p-1 text-slate-400 hover:text-critical rounded transition">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{w.statement}</p>
              {w.statementDate && <p className="text-xs text-slate-400 mt-1">{new Date(w.statementDate).toLocaleDateString()}</p>}
            </div>
          ))}
          {witnesses.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No witnesses recorded yet.</p>}
        </div>
      )}

      {showAddWitness && (
        <div className="mt-3 border border-slate-200 dark:border-slate-line rounded-xl p-4 space-y-3">
          <input value={wName} onChange={e => setWName(e.target.value)} placeholder="Witness name" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand" />
          <input value={wContact} onChange={e => setWContact(e.target.value)} placeholder="Contact (optional)" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand" />
          <textarea value={wStatement} onChange={e => setWStatement(e.target.value)} placeholder="Statement..." rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand resize-y" />
          <div className="flex gap-2">
            <button onClick={handleAddWitness} disabled={!wName.trim() || !wStatement.trim()} className="px-4 py-1.5 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition">Save</button>
            <button onClick={() => setShowAddWitness(false)} className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
