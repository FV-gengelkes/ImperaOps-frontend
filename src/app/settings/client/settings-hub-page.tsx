"use client";

import Link from "next/link";
import { Settings, ChevronRight } from "lucide-react";
import { settingsSections } from "./settings-nav";
import type { MinRole } from "./settings-nav";
import { useAuth } from "@/components/auth-context";
import { useClientId } from "@/components/client-id-context";
import { isAdmin, isManagerOrAbove } from "@/lib/role-helpers";

function meetsMinRole(isSuperAdmin: boolean, role: string | undefined, minRole: MinRole): boolean {
  if (minRole === "Admin") return isAdmin(isSuperAdmin, role);
  return isManagerOrAbove(isSuperAdmin, role);
}

export default function SettingsHubPage() {
  const { clients, isSuperAdmin } = useAuth();
  const { clientId } = useClientId();
  const role = clients.find(c => c.id === clientId)?.role;

  const visibleSections = settingsSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => meetsMinRole(isSuperAdmin, role, item.minRole)),
    }))
    .filter(section => section.items.length > 0);

  return (
    <div className="pt-8 sm:pt-10 px-4 sm:px-8 pb-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Client Settings</h1>
      </div>
      <p className="text-slate-500 mb-8 ml-13">
        Manage your client configuration and preferences.
      </p>

      {/* Sections */}
      <div className="space-y-8">
        {visibleSections.map((section) => (
          <div key={section.section}>
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                {section.section}
              </h2>
              {section.description && (
                <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 group-hover:bg-indigo-700 transition-colors">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {item.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
