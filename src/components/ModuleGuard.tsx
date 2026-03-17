"use client";

import { useModules } from "./modules-context";
import { ShieldAlert } from "lucide-react";

export function ModuleGuard({
  moduleId,
  moduleName,
  children,
}: {
  moduleId: string;
  moduleName: string;
  children: React.ReactNode;
}) {
  const { hasModule } = useModules();

  if (hasModule(moduleId)) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
        <ShieldAlert size={28} className="text-slate-600" />
      </div>
      <h2 className="text-lg font-semibold text-slate-300 mb-2">Module Not Enabled</h2>
      <p className="text-sm text-slate-500 max-w-md">
        The <strong className="text-slate-400">{moduleName}</strong> module is not enabled for your organization.
        Contact your administrator to enable this feature.
      </p>
    </div>
  );
}
