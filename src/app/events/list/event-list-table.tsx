"use client";

import Link from "next/link";
import type { EventListItemDto } from "@/lib/types";
import { ArrowRight, Link2, MapPin, User } from "lucide-react";

function SkeletonRow() {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-4 w-10">
        <div className="h-3.5 w-4 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-3 py-4">
        <div className="h-3.5 bg-slate-100 rounded-full animate-pulse" style={{ width: "70%" }} />
      </td>
      <td className="px-3 py-4">
        <div className="h-3.5 bg-slate-100 rounded-full animate-pulse" style={{ width: "60%" }} />
      </td>
      <td className="px-3 py-4">
        <div className="h-3.5 bg-slate-100 rounded-full animate-pulse" style={{ width: "80%" }} />
      </td>
      <td className="px-3 py-4">
        <div className="h-3.5 bg-slate-100 rounded-full animate-pulse" style={{ width: "55%" }} />
      </td>
      <td className="px-3 py-4">
        <div className="h-3.5 bg-slate-100 rounded-full animate-pulse" style={{ width: "60%" }} />
      </td>
      <td className="px-3 py-4">
        <div className="h-3.5 bg-slate-100 rounded-full animate-pulse" style={{ width: "50%" }} />
      </td>
      <td className="px-3 py-4 w-16">
        <div className="h-3.5 bg-slate-100 rounded-full animate-pulse" style={{ width: "80%" }} />
      </td>
    </tr>
  );
}

function StatusPill({ name, color, isClosed }: { name: string; color: string | null; isClosed: boolean }) {
  const dotColor = color ?? (isClosed ? "#16A34A" : "#2F80ED");
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
      {name}
    </span>
  );
}

export function EventListTable({
  items,
  loading,
  selectedIds,
  onToggle,
  onToggleAll,
  allSelected,
}: {
  items: EventListItemDto[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggle: (publicId: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
}) {
  return (
    <table className="w-full border-collapse text-sm table-fixed">
      <colgroup>
        <col className="w-10" />
        <col className="w-[88px]" />
        <col className="w-[110px]" />
        <col />
        <col className="w-[110px]" />
        <col className="w-[120px]" />
        <col className="w-[120px]" />
        <col className="w-14" />
      </colgroup>
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50">
          <th className="px-3 py-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
              aria-label="Select all"
            />
          </th>
          <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ID</th>
          <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Occurred</th>
          <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Title</th>
          <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
          <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
          <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
          <th className="px-3 py-3" />
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
          const date = new Date(item.occurredAt);
          const isSelected = selectedIds.has(item.publicId);
          return (
            <tr
              key={item.id}
              className={`border-t border-slate-100 transition-colors duration-100 group ${
                isSelected
                  ? "bg-brand/5"
                  : "hover:bg-brand/[0.03]"
              }`}
            >
              {/* Checkbox */}
              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(item.publicId)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                  aria-label={`Select ${item.publicId}`}
                />
              </td>

              {/* Public ID */}
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/events/${item.publicId}/details`}
                    className="font-mono text-xs font-semibold text-brand-link bg-brand/10 border border-brand/20 rounded px-1.5 py-0.5 hover:bg-brand/20 transition-colors whitespace-nowrap"
                  >
                    {item.publicId}
                  </Link>
                  {item.linkGroupCount > 0 && (
                    <span title={`Linked to ${item.linkGroupCount} group(s)`} className="text-brand/60">
                      <Link2 size={11} />
                    </span>
                  )}
                </div>
              </td>

              {/* Occurred */}
              <td className="px-3 py-3">
                <div className="text-xs font-medium text-slate-800 whitespace-nowrap">
                  {date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </div>
              </td>

              {/* Title */}
              <td className="px-3 py-3">
                <span className="text-slate-800 text-sm truncate block">{item.title}</span>
              </td>

              {/* Type */}
              <td className="px-3 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-full">
                  {item.eventTypeName}
                </span>
              </td>

              {/* Status */}
              <td className="px-3 py-3">
                <StatusPill
                  name={item.workflowStatusName}
                  color={item.workflowStatusColor}
                  isClosed={item.workflowStatusIsClosed}
                />
              </td>

              {/* Owner */}
              <td className="px-3 py-3">
                {item.ownerDisplayName ? (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User size={12} className="text-slate-400 shrink-0" />
                    <span className="text-xs truncate">{item.ownerDisplayName}</span>
                  </div>
                ) : (
                  <span className="text-slate-300 text-xs">&mdash;</span>
                )}
              </td>

              {/* Action */}
              <td className="px-3 py-3 text-right">
                <Link
                  href={`/events/${item.publicId}/details`}
                  className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-400 group-hover:text-brand transition-colors"
                >
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
              No events found for this client.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
