"use client";

import { Shield, BarChart3, Users, Zap } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className="pt-4">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield size={28} className="text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-steel-white">
          Welcome to ImperaOps
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          Let&apos;s get your workspace set up. This takes about 2 minutes and you can always change things later.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 dark:bg-midnight/50">
          <BarChart3 size={20} className="text-brand mb-2" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Track Events</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Log and manage safety events, incidents, and operational issues
          </span>
        </div>
        <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 dark:bg-midnight/50">
          <Users size={20} className="text-brand mb-2" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Collaborate</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assign events, investigate root causes, and track corrective actions
          </span>
        </div>
        <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 dark:bg-midnight/50">
          <Zap size={20} className="text-brand mb-2" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Automate</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Set SLA rules, workflow automations, and get intelligent insights
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Skip setup
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
