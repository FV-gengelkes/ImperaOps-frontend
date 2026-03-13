"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, PlusCircle, LayoutDashboard, Settings } from "lucide-react";

interface DoneStepProps {
  onComplete: () => void;
  onBack: () => void;
}

export function DoneStep({ onComplete, onBack }: DoneStepProps) {
  const router = useRouter();

  return (
    <div className="pt-4">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-success" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-steel-white">
          Your workspace is ready!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          You&apos;re all set. Here are some next steps to get started.
        </p>
      </div>

      <div className="flex justify-start mb-4">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
        >
          &larr; Back
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <button
          onClick={() => {
            onComplete();
            router.push("/events/new");
          }}
          className="group flex flex-col items-center text-center p-5 rounded-xl border-2 border-brand/20 hover:border-brand bg-brand/5 dark:bg-brand/10 transition-all"
        >
          <PlusCircle size={22} className="text-brand mb-2" />
          <span className="text-sm font-semibold text-slate-800 dark:text-steel-white">
            Create First Event
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Start tracking right away
          </span>
        </button>

        <button
          onClick={onComplete}
          className="group flex flex-col items-center text-center p-5 rounded-xl border-2 border-slate-200 dark:border-slate-line hover:border-brand/40 bg-white dark:bg-midnight/50 transition-all"
        >
          <LayoutDashboard size={22} className="text-slate-500 group-hover:text-brand mb-2 transition-colors" />
          <span className="text-sm font-semibold text-slate-800 dark:text-steel-white">
            Explore Dashboard
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            See your analytics overview
          </span>
        </button>

        <button
          onClick={() => {
            onComplete();
            router.push("/settings/client");
          }}
          className="group flex flex-col items-center text-center p-5 rounded-xl border-2 border-slate-200 dark:border-slate-line hover:border-brand/40 bg-white dark:bg-midnight/50 transition-all"
        >
          <Settings size={22} className="text-slate-500 group-hover:text-brand mb-2 transition-colors" />
          <span className="text-sm font-semibold text-slate-800 dark:text-steel-white">
            Configure Settings
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customize workflows & SLAs
          </span>
        </button>
      </div>
    </div>
  );
}
