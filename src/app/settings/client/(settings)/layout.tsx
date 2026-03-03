"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { settingsSections } from "../settings-nav";

export default function SettingsSubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-screen">
      {/* Left sub-nav */}
      <aside className="w-52 shrink-0 bg-white border-r border-slate-200 flex flex-col pt-6 pb-8">
        <div className="px-3 mb-6">
          <Link
            href="/settings/client"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            All Settings
          </Link>
        </div>

        <nav className="flex-1 space-y-6 px-3">
          {settingsSections.map((section) => (
            <div key={section.section}>
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {section.section}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 font-medium"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Right content */}
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
