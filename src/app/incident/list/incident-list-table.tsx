"use client";

import Link from "next/link";
import type { IncidentListItemDto } from "@/lib/types";
import { ArrowRight, MapPin, User } from "lucide-react";

function typeLabel(t: number) {
  switch (t) {
    case 1: return "Accident";
    case 2: return "Injury";
    case 3: return "Near Miss";
    case 4: return "Property Damage";
    case 5: return "Safety Violation";
    default: return `Type ${t}`;
  }
}

type StatusConfig = { label: string; dot: string; pill: string };
function statusConfig(s: number): StatusConfig {
  switch (s) {
    case 1: return { label: "Open",        dot: "bg-blue-500",    pill: "bg-blue-50 text-blue-700 border-blue-200" };
    case 2: return { label: "In Progress", dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 border-amber-200" };
    case 3: return { label: "Blocked",     dot: "bg-red-500",     pill: "bg-red-50 text-red-700 border-red-200" };
    case 4: return { label: "Closed",      dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    default: return { label: `Status ${s}`, dot: "bg-slate-400",  pill: "bg-slate-50 text-slate-600 border-slate-200" };
  }
}

function refId(n: number) {
  return `INC-${String(n).padStart(4, "0")}`;
}

function SkeletonRow() {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-4">
        <div className="h-3.5 w-4 bg-slate-100 rounded animate-pulse" />
      </td>
      {[40, 75, 55, 60, 80, 55, 30].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className="h-3.5 bg-slate-100 rounded-full animate-pulse"
            style={{ width: `${w}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

export function IncidentListTable({
  items,
  loading,
  selectedIds,
  onToggle,
  onToggleAll,
  allSelected,
}: {
  items: IncidentListItemDto[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                aria-label="Select all"
              />
            </th>
            {["Ref #", "Occurred", "Type", "Status", "Location", "Owner", ""].map((h, i) => (
              <th
                key={i}
                className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Skeleton rows while loading with no data yet */}
          {loading && items.length === 0 && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </>
          )}

          {/* Data rows */}
          {items.map((item) => {
            const st = statusConfig(item.status);
            const date = new Date(item.occurredAt);
            const isSelected = selectedIds.has(item.id);
            return (
              <tr
                key={item.id}
                className={`border-t border-slate-100 transition-colors duration-100 group ${
                  isSelected
                    ? "bg-indigo-50/60"
                    : "hover:bg-indigo-50/40"
                }`}
              >
                {/* Checkbox */}
                <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(item.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    aria-label={`Select INC-${String(item.referenceNumber).padStart(4, "0")}`}
                  />
                </td>

                {/* Ref # */}
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <Link
                    href={`/incident/${String(item.referenceNumber).padStart(4, "0")}/details`}
                    className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-100 transition-colors"
                  >
                    {refId(item.referenceNumber)}
                  </Link>
                </td>

                {/* Occurred */}
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <div className="font-medium text-slate-800">
                    {date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </td>

                {/* Type */}
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {typeLabel(item.type)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${st.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0`} />
                    {st.label}
                  </span>
                </td>

                {/* Location */}
                <td className="px-5 py-3.5 max-w-[220px]">
                  <div className="flex items-center gap-1.5 text-slate-700 truncate">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </div>
                </td>

                {/* Owner */}
                <td className="px-5 py-3.5">
                  {item.ownerDisplayName ? (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span className="text-xs truncate max-w-[120px]">{item.ownerDisplayName}</span>
                    </div>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>

                {/* Action */}
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/incident/${String(item.referenceNumber).padStart(4, "0")}/details`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors"
                  >
                    View
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            );
          })}

          {/* Empty state */}
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">
                No incidents found for this client.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
