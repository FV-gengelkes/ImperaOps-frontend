"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Loader2, Sparkles, CheckCircle2, FlaskConical } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useClientId } from "@/components/client-id-context";
import { useToast } from "@/components/toast-context";
import { isManagerOrAbove } from "@/lib/role-helpers";
import {
  getInvestigation,
  startInvestigation,
  updateInvestigation,
  getWitnesses,
  getEvidence,
  aiInvestigate,
} from "@/lib/api";
import type { InvestigationDto, WitnessDto, EvidenceDto } from "@/lib/types";
import { WitnessSection } from "./witness-section";
import { EvidenceSection } from "./evidence-section";

const STATUS_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Completed" },
];

function StatusStepper({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
  return (
    <div className="bg-white dark:bg-graphite border border-slate-200 dark:border-slate-line rounded-xl px-4 py-3 mb-5 flex items-center gap-4">
      <div className="flex items-center gap-1.5 shrink-0">
        <FlaskConical size={14} className="text-purple-600" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Investigation</span>
      </div>

      <div className="flex-1 flex items-center gap-0">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const isLast = i === STATUS_STEPS.length - 1;
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
                    : "bg-white dark:bg-midnight text-slate-400 border-slate-300 dark:border-slate-line"
                }`}>
                  {done && !isCurrent ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${
                  isCurrent ? "text-slate-800 dark:text-steel-white" : done ? "text-slate-600 dark:text-slate-300" : "text-slate-400"
                }`}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 mx-1.5">
                  <div className={`h-0.5 rounded-full ${i < currentIdx ? "bg-purple-600" : "bg-slate-200 dark:bg-slate-line"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InvestigationCard({ publicId, onDirtyChange }: { publicId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const { clientId } = useClientId();
  const { clients, isSuperAdmin, user } = useAuth();
  const toast = useToast();
  const role = clients.find(c => c.id === clientId)?.role;
  const isManager = isManagerOrAbove(isSuperAdmin, role);

  const [inv, setInv] = useState<InvestigationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const [summary, setSummary] = useState("");
  const [rca, setRca] = useState("");
  const [corrective, setCorrective] = useState("");
  const [savedSummary, setSavedSummary] = useState("");
  const [savedRca, setSavedRca] = useState("");
  const [savedCorrective, setSavedCorrective] = useState("");
  const [saving, setSaving] = useState(false);

  const [witnesses, setWitnesses] = useState<WitnessDto[]>([]);
  const [evidence, setEvidenceList] = useState<EvidenceDto[]>([]);

  const [aiSuggesting, setAiSuggesting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getInvestigation(publicId);
      setInv(data);
      if (data) {
        setSummary(data.summary ?? "");
        setRca(data.rootCauseAnalysis ?? "");
        setCorrective(data.correctiveActions ?? "");
        setSavedSummary(data.summary ?? "");
        setSavedRca(data.rootCauseAnalysis ?? "");
        setSavedCorrective(data.correctiveActions ?? "");
        const [w, e] = await Promise.all([getWitnesses(publicId), getEvidence(publicId)]);
        setWitnesses(w);
        setEvidenceList(e);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [publicId]);

  const isInvDirty = inv !== null && (
    summary.trim() !== savedSummary.trim() ||
    rca.trim() !== savedRca.trim() ||
    corrective.trim() !== savedCorrective.trim()
  );

  useEffect(() => {
    onDirtyChange?.(isInvDirty);
  }, [isInvDirty]);

  async function handleStart() {
    setStarting(true);
    try {
      await startInvestigation(publicId, Number(user?.id) || null);
      toast.success("Investigation started");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start investigation");
    }
    setStarting(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateInvestigation(publicId, { summary, rootCauseAnalysis: rca, correctiveActions: corrective });
      setSavedSummary(summary);
      setSavedRca(rca);
      setSavedCorrective(corrective);
      toast.success("Investigation saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
    setSaving(false);
  }

  async function handleTransition(newStatus: string) {
    try {
      await updateInvestigation(publicId, { status: newStatus, summary, rootCauseAnalysis: rca, correctiveActions: corrective });
      toast.success(`Status changed to ${newStatus.replace("_", " ")}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Transition failed");
    }
  }

  async function handleAiSuggestRca() {
    setAiSuggesting(true);
    try {
      const result = await aiInvestigate(publicId);
      if (result.suggestedRootCause) setRca(result.suggestedRootCause);
      if (result.suggestedCorrectiveActions) setCorrective(result.suggestedCorrectiveActions);
      toast.success("AI suggestions applied -- review and edit before saving.");
    } catch (err: any) {
      toast.error(err?.message ?? "AI suggestion failed");
    }
    setAiSuggesting(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-slate-400" />
    </div>
  );

  if (!inv) return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-8 text-center">
      <ClipboardCheck size={32} className="mx-auto text-slate-300 mb-3" />
      <p className="text-sm text-slate-500 mb-4">No investigation has been started for this event.</p>
      {isManager && (
        <button
          onClick={handleStart}
          disabled={starting}
          className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition"
        >
          {starting ? "Starting…" : "Start Investigation"}
        </button>
      )}
    </div>
  );

  const nextTransitions: { label: string; status: string }[] = [];
  if (inv.status === "draft") nextTransitions.push({ label: "Begin Investigation", status: "in_progress" });
  if (inv.status === "in_progress") nextTransitions.push({ label: "Submit for Review", status: "review" });
  if (inv.status === "review") {
    nextTransitions.push({ label: "Mark Complete", status: "completed" });
    nextTransitions.push({ label: "Return to In Progress", status: "in_progress" });
  }
  if (inv.status === "completed") nextTransitions.push({ label: "Reopen", status: "in_progress" });

  return (
    <div className="space-y-5">
      <StatusStepper status={inv.status} />

      {/* Summary */}
      <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 dark:text-steel-white mb-3">Incident Summary</h3>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="Describe what happened…"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand resize-y"
        />
      </div>

      {/* Witnesses */}
      <WitnessSection
        publicId={publicId}
        witnesses={witnesses}
        setWitnesses={setWitnesses}
        isManager={isManager}
      />

      {/* Evidence */}
      <EvidenceSection
        publicId={publicId}
        evidence={evidence}
        setEvidence={setEvidenceList}
        isManager={isManager}
      />

      {/* Root Cause Analysis */}
      <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 dark:text-steel-white">Root Cause Analysis</h3>
          <button
            onClick={handleAiSuggestRca}
            disabled={aiSuggesting}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition"
          >
            {aiSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI Suggest RCA
          </button>
        </div>
        <textarea
          value={rca}
          onChange={e => setRca(e.target.value)}
          placeholder="What was the root cause?"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand resize-y"
        />
      </div>

      {/* Corrective Actions */}
      <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 dark:text-steel-white mb-3">Corrective Actions</h3>
        <textarea
          value={corrective}
          onChange={e => setCorrective(e.target.value)}
          placeholder="What actions are being taken to prevent recurrence?"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save Investigation"}
        </button>
        {nextTransitions.map(t => (
          <button
            key={t.status}
            onClick={() => handleTransition(t.status)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              t.status === "completed"
                ? "bg-success text-white hover:bg-success/90"
                : t.status === "in_progress" && inv.status === "review"
                  ? "bg-slate-200 dark:bg-midnight text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                  : "bg-slate-100 dark:bg-midnight text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
