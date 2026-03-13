"use client";

import { useState } from "react";
import { WelcomeStep } from "./WelcomeStep";
import { TemplateStep } from "./TemplateStep";
import { InviteStep } from "./InviteStep";
import { DoneStep } from "./DoneStep";

type Step = "welcome" | "template" | "invite" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "welcome", label: "Welcome" },
  { key: "template", label: "Template" },
  { key: "invite", label: "Team" },
  { key: "done", label: "Done" },
];

interface OnboardingWizardProps {
  clientId: number;
  onDismiss: () => void;
  onComplete: () => void;
}

export function OnboardingWizard({ clientId, onDismiss, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>("welcome");

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-graphite rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-line overflow-hidden">
        {/* Progress bar */}
        <div className="px-8 pt-6 pb-2">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i < stepIdx
                        ? "bg-brand text-white"
                        : i === stepIdx
                          ? "bg-brand/10 text-brand ring-2 ring-brand"
                          : "bg-slate-100 dark:bg-midnight text-slate-400"
                    }`}
                  >
                    {i < stepIdx ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold mt-1.5 ${
                      i <= stepIdx ? "text-brand" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-colors ${
                      i < stepIdx ? "bg-brand" : "bg-slate-200 dark:bg-slate-line"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 pb-8">
          {step === "welcome" && (
            <WelcomeStep
              onNext={() => setStep("template")}
              onSkip={onDismiss}
            />
          )}
          {step === "template" && (
            <TemplateStep
              clientId={clientId}
              onNext={() => setStep("invite")}
              onBack={() => setStep("welcome")}
              onSkip={() => setStep("invite")}
            />
          )}
          {step === "invite" && (
            <InviteStep
              clientId={clientId}
              onNext={() => setStep("done")}
              onBack={() => setStep("template")}
              onSkip={() => setStep("done")}
            />
          )}
          {step === "done" && (
            <DoneStep onComplete={onComplete} onBack={() => setStep("invite")} />
          )}
        </div>
      </div>
    </div>
  );
}
