"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, MessageSquare, Send, Trash2 } from "lucide-react";
import { createIncidentComment, deleteIncidentEvent, getIncidentEvents } from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import type { IncidentEventDto } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
}

const ACTIVITY_TYPES = new Set([
  "incident_created", "type_changed", "status_changed", "owner_changed",
  "attachment_added", "attachment_removed",
]);

// ── Sub-components ────────────────────────────────────────────────────────────

function ActivityRow({ event }: { event: IncidentEventDto }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Activity size={11} className="text-slate-400" />
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">
        <span className="font-medium text-slate-600">{event.userDisplayName}</span>
        {" · "}
        {event.body}
        {" · "}
        <span className="text-slate-400">{timeAgo(event.createdAt)}</span>
      </p>
    </div>
  );
}

function CommentRow({
  event, canDelete, onDelete,
}: {
  event: IncidentEventDto;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    setDeleting(true);
    onDelete(event.id);
  }

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-600 select-none">
        {initials(event.userDisplayName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-800">{event.userDisplayName}</span>
          <span className="text-xs text-slate-400">{timeAgo(event.createdAt)}</span>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
              title="Delete comment"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{event.body}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function IncidentTimeline({ incidentId }: { incidentId: string }) {
  const { user, isSuperAdmin } = useAuth();
  const [events, setEvents]     = useState<IncidentEventDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [comment, setComment]   = useState("");
  const [posting, setPosting]   = useState(false);
  const [postError, setPostError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    setLoading(true);
    getIncidentEvents(incidentId)
      .then(setEvents)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [incidentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePost() {
    if (!comment.trim()) return;
    setPosting(true);
    setPostError("");
    try {
      const ev = await createIncidentComment(incidentId, comment.trim());
      setEvents(prev => [...prev, ev]);
      setComment("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      setPostError(e?.message ?? "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(eventId: string) {
    try {
      await deleteIncidentEvent(incidentId, eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete comment.");
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Activity & Comments</h2>
      </div>

      {/* Event list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3 py-2">
              <div className="h-6 w-6 rounded-full bg-slate-100 animate-pulse shrink-0" />
              <div className="flex-1 h-4 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">No activity yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {events.map(ev =>
            ACTIVITY_TYPES.has(ev.eventType) ? (
              <ActivityRow key={ev.id} event={ev} />
            ) : (
              <CommentRow
                key={ev.id}
                event={ev}
                canDelete={isSuperAdmin || (!!user?.id && ev.userId === user.id)}
                onDelete={handleDelete}
              />
            )
          )}
        </div>
      )}

      <div ref={bottomRef} />

      {/* Comment input */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <textarea
          className="w-full px-3.5 py-2.5 text-sm text-slate-800 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all resize-none placeholder:text-slate-400"
          rows={3}
          placeholder="Add a comment…"
          value={comment}
          onChange={e => { setComment(e.target.value); setPostError(""); }}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handlePost();
            }
          }}
        />
        {postError && <p className="text-xs text-red-500 mt-1">{postError}</p>}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-400 hidden sm:block">⌘ Enter to post</p>
          <button
            onClick={handlePost}
            disabled={posting || !comment.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={13} />
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
