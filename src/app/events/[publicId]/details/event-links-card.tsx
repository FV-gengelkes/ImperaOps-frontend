"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Link2, ChevronDown, ChevronRight, Plus, X, Loader2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { useClientId } from "@/components/client-id-context";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { isManagerOrAbove } from "@/lib/role-helpers";
import {
  getEventLinkGroupsByEvent,
  getEventLinkGroupDetail,
  getEventLinkGroups,
  createEventLinkGroup,
  addEventToLinkGroup,
  removeEventFromLinkGroup,
} from "@/lib/api";
import type { EventLinkGroupDto, EventLinkGroupDetailDto } from "@/lib/types";

export function EventLinksCard({ publicId, eventId }: { publicId: string; eventId: number }) {
  const { clientId } = useClientId();
  const { clients, isSuperAdmin } = useAuth();
  const toast = useToast();
  const role = clients.find(c => c.id === clientId)?.role;
  const isManager = isManagerOrAbove(isSuperAdmin, role);

  const [groups, setGroups] = useState<EventLinkGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EventLinkGroupDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [allGroups, setAllGroups] = useState<EventLinkGroupDto[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setGroups(await getEventLinkGroupsByEvent(publicId));
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [publicId]);

  async function expand(groupId: number) {
    if (expandedId === groupId) { setExpandedId(null); return; }
    setExpandedId(groupId);
    setDetailLoading(true);
    try {
      setDetail(await getEventLinkGroupDetail(groupId));
    } catch { /* ignore */ }
    setDetailLoading(false);
  }

  async function openAddModal() {
    setShowAdd(true);
    try {
      setAllGroups(await getEventLinkGroups(clientId));
    } catch { /* ignore */ }
  }

  async function handleAddToExisting(groupId: number) {
    try {
      await addEventToLinkGroup(groupId, eventId);
      toast.success("Event linked to group");
      setShowAdd(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to link event");
    }
  }

  async function handleCreateNew() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createEventLinkGroup(clientId, newTitle.trim(), null, [eventId]);
      toast.success("Link group created");
      setNewTitle("");
      setShowAdd(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create group");
    }
    setCreating(false);
  }

  async function handleUnlink(groupId: number) {
    try {
      await removeEventFromLinkGroup(groupId, eventId);
      toast.success("Event unlinked");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to unlink");
    }
  }

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-brand" />
          <h3 className="font-semibold text-slate-800 dark:text-steel-white">Linked Events</h3>
          {groups.length > 0 && (
            <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-semibold">{groups.length}</span>
          )}
        </div>
        {isManager && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5 rounded-lg transition"
          >
            <Plus size={13} /> Link to Group
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No linked event groups yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.id} className="border border-slate-200 dark:border-slate-line rounded-xl overflow-hidden">
              <button
                onClick={() => expand(g.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-midnight transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {expandedId === g.id ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                  <span className="text-sm font-medium text-slate-800 dark:text-steel-white truncate">{g.title}</span>
                  <span className="text-xs text-slate-400 shrink-0">{g.eventCount} events</span>
                </div>
                {isManager && (
                  <button
                    onClick={e => { e.stopPropagation(); handleUnlink(g.id); }}
                    className="p-1 text-slate-400 hover:text-critical rounded transition"
                    title="Unlink this event from group"
                  >
                    <X size={13} />
                  </button>
                )}
              </button>

              {expandedId === g.id && (
                <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-line/40">
                  {detailLoading ? (
                    <div className="py-3 flex justify-center"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
                  ) : detail?.events.map(ev => (
                    <Link
                      key={ev.publicId}
                      href={`/events/${ev.publicId}/details`}
                      className="flex items-center gap-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-midnight rounded px-2 -mx-2 transition"
                    >
                      <span className="font-mono text-xs font-semibold text-brand">{ev.publicId}</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate flex-1">{ev.title}</span>
                      <span className="text-xs text-slate-400">{ev.eventTypeName}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add to group modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Link to Group">
        <div className="p-5 space-y-4">
          {/* Create new */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Create New Group</label>
            <div className="flex gap-2">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Group title…"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-line rounded-lg bg-white dark:bg-midnight text-slate-800 dark:text-steel-white focus:outline-none focus:ring-2 focus:ring-brand"
                onKeyDown={e => e.key === "Enter" && handleCreateNew()}
              />
              <button
                onClick={handleCreateNew}
                disabled={creating || !newTitle.trim()}
                className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 transition"
              >
                {creating ? "…" : "Create"}
              </button>
            </div>
          </div>

          {/* Existing groups */}
          {allGroups.filter(g => !groups.some(eg => eg.id === g.id)).length > 0 && (
            <>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Or Add to Existing</label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allGroups.filter(g => !groups.some(eg => eg.id === g.id)).map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleAddToExisting(g.id)}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-midnight transition flex items-center justify-between"
                  >
                    <span className="text-slate-800 dark:text-steel-white">{g.title}</span>
                    <span className="text-xs text-slate-400">{g.eventCount} events</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
