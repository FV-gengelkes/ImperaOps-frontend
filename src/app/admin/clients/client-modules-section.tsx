"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, ToggleLeft, ToggleRight } from "lucide-react";
import { adminGetModules, adminGetClientModules, adminUpdateClientModules } from "@/lib/api";
import { useToast } from "@/components/toast-context";
import type { ModuleDefinitionDto } from "@/lib/types";

const ICON_MAP: Record<string, string> = {
  MapPin: "📍",
  Users: "👥",
  CreditCard: "💳",
};

export function ClientModulesSection({ clientId }: { clientId: number }) {
  const toast = useToast();
  const [modules, setModules] = useState<ModuleDefinitionDto[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([adminGetModules(), adminGetClientModules(clientId)])
      .then(([mods, client]) => {
        setModules(mods);
        setEnabled(client.enabledModuleIds ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleToggle(moduleId: string) {
    setToggling(moduleId);
    try {
      const newIds = enabled.includes(moduleId)
        ? enabled.filter((id) => id !== moduleId)
        : [...enabled, moduleId];
      const res = await adminUpdateClientModules(clientId, newIds);
      setEnabled(res.enabledModuleIds ?? []);
      const mod = modules.find((m) => m.id === moduleId);
      toast.success(
        newIds.includes(moduleId)
          ? `${mod?.name ?? moduleId} enabled`
          : `${mod?.name ?? moduleId} disabled`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update modules");
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={18} className="animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
        <Package size={15} className="text-slate-500" />
        <div>
          <h2 className="text-sm font-semibold text-white">Modules</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enable or disable add-on modules for this client. Modules unlock additional features and pages.
          </p>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          No modules available.
        </div>
      ) : (
        <div className="p-4 grid gap-3 sm:grid-cols-2">
          {modules.map((mod) => {
            const isEnabled = enabled.includes(mod.id);
            const isToggling = toggling === mod.id;
            return (
              <div
                key={mod.id}
                className={`rounded-xl border px-4 py-3.5 transition-colors ${
                  isEnabled
                    ? "border-brand/30 bg-brand/5"
                    : "border-slate-700/60 bg-slate-800/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{ICON_MAP[mod.icon] ?? "📦"}</span>
                      <p className="text-sm font-medium text-slate-200">{mod.name}</p>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                    <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/40">
                      {mod.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggle(mod.id)}
                    disabled={isToggling}
                    className="shrink-0 mt-0.5 transition-colors disabled:opacity-60"
                    title={isEnabled ? "Disable module" : "Enable module"}
                  >
                    {isToggling ? (
                      <Loader2 size={24} className="animate-spin text-slate-500" />
                    ) : isEnabled ? (
                      <ToggleRight size={28} className="text-brand" />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
