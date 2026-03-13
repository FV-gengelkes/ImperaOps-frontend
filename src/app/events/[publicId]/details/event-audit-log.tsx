"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity, MessageSquare, Send, Trash2,
  Plus, ArrowRight, Tag, User, Paperclip, CheckSquare, CheckCircle2, XSquare,
  Search, UserPlus, Camera, FileText,
  type LucideIcon,
} from "lucide-react";
import { createComment, deleteAuditEvent, getAuditLog, getClientUsers } from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import { useClientId } from "@/components/client-id-context";
import { useToast } from "@/components/toast-context";
import type { AuditEventDto, ClientUserDto } from "@/lib/types";

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

/** Replace @[Name](userId) tokens with styled spans. */
function renderBody(body: string) {
  const parts: React.ReactNode[] = [];
  const re = /@\[([^\]]+)\]\(\d+\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    parts.push(
      <span key={m.index} className="text-brand-link font-semibold">@{m[1]}</span>
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts;
}

const ACTIVITY_TYPES = new Set([
  "created", "type_changed", "status_changed", "owner_changed",
  "attachment_added", "attachment_removed", "task_added", "task_completed", "task_removed",
  "investigation_started", "investigation_updated", "investigation_completed",
  "witness_added", "evidence_added",
]);

// ── Timeline config ───────────────────────────────────────────────────────────

type TimelineConfig = { icon: LucideIcon; dotColor: string; iconColor: string };

const TIMELINE_MAP: Record<string, TimelineConfig> = {
  created:           { icon: Plus,          dotColor: "bg-success/10 border-success/30",   iconColor: "text-success"   },
  status_changed:    { icon: ArrowRight,     dotColor: "bg-brand/10 border-brand/30",       iconColor: "text-brand"     },
  type_changed:      { icon: Tag,            dotColor: "bg-purple-100 border-purple-300",   iconColor: "text-purple-600"},
  owner_changed:     { icon: User,           dotColor: "bg-orange-100 border-orange-300",   iconColor: "text-orange-500"},
  attachment_added:  { icon: Paperclip,      dotColor: "bg-teal/10 border-teal/30",         iconColor: "text-teal"      },
  attachment_removed:{ icon: Trash2,         dotColor: "bg-critical/10 border-critical/30", iconColor: "text-critical"  },
  task_added:        { icon: CheckSquare,    dotColor: "bg-brand/10 border-brand/30",       iconColor: "text-brand"     },
  task_completed:    { icon: CheckCircle2,   dotColor: "bg-success/10 border-success/30",   iconColor: "text-success"   },
  task_removed:      { icon: XSquare,        dotColor: "bg-slate-100 border-slate-300",     iconColor: "text-slate-400" },
  investigation_started:   { icon: Search,       dotColor: "bg-purple-100 border-purple-300",   iconColor: "text-purple-600" },
  investigation_updated:   { icon: ArrowRight,   dotColor: "bg-purple-100 border-purple-300",   iconColor: "text-purple-600" },
  investigation_completed: { icon: CheckCircle2, dotColor: "bg-success/10 border-success/30",   iconColor: "text-success"    },
  witness_added:           { icon: UserPlus,     dotColor: "bg-orange-100 border-orange-300",   iconColor: "text-orange-500" },
  evidence_added:          { icon: Camera,       dotColor: "bg-teal/10 border-teal/30",         iconColor: "text-teal"       },
};

const DEFAULT_TIMELINE: TimelineConfig = { icon: Activity, dotColor: "bg-slate-100 border-slate-300", iconColor: "text-slate-400" };

// ── Sub-components ────────────────────────────────────────────────────────────

function TimelineRow({ event, isLast }: { event: AuditEventDto; isLast: boolean }) {
  const cfg = TIMELINE_MAP[event.eventType] ?? DEFAULT_TIMELINE;
  const Icon = cfg.icon;

  return (
    <div className="flex items-start gap-3 relative">
      {/* Connecting line */}
      {!isLast && (
        <div className="absolute left-[11px] top-7 bottom-0 w-px bg-slate-100 dark:bg-slate-700" />
      )}
      {/* Dot */}
      <div className={`relative z-10 h-6 w-6 rounded-full border flex items-center justify-center shrink-0 mt-1.5 ${cfg.dotColor}`}>
        <Icon size={11} className={cfg.iconColor} />
      </div>
      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-medium text-slate-800 dark:text-steel-white">{event.userDisplayName}</span>
          <span className="text-slate-400 mx-1.5">·</span>
          {event.body}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(event.createdAt)}</p>
      </div>
    </div>
  );
}

function CommentRow({
  event, canDelete, onDelete,
}: {
  event: AuditEventDto;
  canDelete: boolean;
  onDelete: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    setDeleting(true);
    onDelete(event.id);
  }

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0 text-xs font-bold text-brand select-none">
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
        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
          {renderBody(event.body)}
        </p>
      </div>
    </div>
  );
}

// ── Mention dropdown ──────────────────────────────────────────────────────────

function MentionDropdown({
  users,
  query,
  onSelect,
}: {
  users: ClientUserDto[];
  query: string;
  onSelect: (user: ClientUserDto) => void;
}) {
  const filtered = users
    .filter(u => u.displayName.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
      {filtered.map(u => (
        <button
          key={u.id}
          onMouseDown={e => { e.preventDefault(); onSelect(u); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
        >
          <div className="h-6 w-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0 text-xs font-bold text-brand">
            {initials(u.displayName)}
          </div>
          <span className="font-medium text-slate-700">{u.displayName}</span>
          <span className="text-slate-400 text-xs ml-auto">{u.email}</span>
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EventAuditLog({ publicId, view }: { publicId: string; view: "audit" | "comments" }) {
  const { user, isSuperAdmin } = useAuth();
  const { clientId }           = useClientId();
  const toast                  = useToast();

  const [events, setEvents]     = useState<AuditEventDto[]>([]);
  const [users, setUsers]       = useState<ClientUserDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [comment, setComment]   = useState("");
  const [posting, setPosting]   = useState(false);
  const [postError, setPostError] = useState("");

  // @mention state
  const [mentionQuery, setMentionQuery]   = useState<string | null>(null);
  const [mentionStart, setMentionStart]   = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);

  function load() {
    setLoading(true);
    getAuditLog(publicId)
      .then(setEvents)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [publicId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clientId > 0)
      getClientUsers(clientId).then(u => setUsers(u.filter(u => u.isActive && !u.isSuperAdmin))).catch(() => {});
  }, [clientId]);

  // ── Mention detection ──────────────────────────────────────────────────────

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val    = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setComment(val);
    setPostError("");

    // Find last @ before cursor on current "word"
    const textBeforeCursor = val.slice(0, cursor);
    const atIdx = textBeforeCursor.lastIndexOf("@");
    if (atIdx !== -1) {
      const between = textBeforeCursor.slice(atIdx + 1);
      // Only trigger if no spaces after @
      if (!between.includes(" ") && !between.includes("\n")) {
        setMentionStart(atIdx);
        setMentionQuery(between);
        return;
      }
    }
    setMentionQuery(null);
  }

  function handleMentionSelect(user: ClientUserDto) {
    const token = `@[${user.displayName}](${user.id})`;
    const before = comment.slice(0, mentionStart);
    const after  = comment.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const newVal = before + token + " " + after;
    setComment(newVal);
    setMentionQuery(null);
    // Restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = (before + token + " ").length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && e.key === "Escape") {
      setMentionQuery(null);
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handlePost();
    }
  }

  // ── Post comment ──────────────────────────────────────────────────────────

  async function handlePost() {
    if (!comment.trim()) return;
    setPosting(true);
    setPostError("");
    try {
      const ev = await createComment(publicId, comment.trim());
      setEvents(prev => [...prev, ev]);
      setComment("");
      setMentionQuery(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      setPostError(e?.message ?? "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(eventId: number) {
    try {
      await deleteAuditEvent(publicId, eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete comment.");
    }
  }

  const visibleEvents = events.filter(ev =>
    view === "audit" ? ACTIVITY_TYPES.has(ev.eventType) : !ACTIVITY_TYPES.has(ev.eventType)
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {view === "audit"
          ? <Activity size={15} className="text-slate-400" />
          : <MessageSquare size={15} className="text-slate-400" />
        }
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {view === "audit" ? "Audit Log" : "Comments"}
        </h2>
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
      ) : visibleEvents.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">
          {view === "audit" ? "No activity recorded yet." : "No comments yet."}
        </p>
      ) : (
        <div className={view === "audit" ? "pt-2" : "divide-y divide-slate-100"}>
          {view === "audit"
            ? visibleEvents.map((ev, i) => (
                <TimelineRow key={ev.id} event={ev} isLast={i === visibleEvents.length - 1} />
              ))
            : visibleEvents.map(ev => (
                <CommentRow
                  key={ev.id}
                  event={ev}
                  canDelete={isSuperAdmin || (!!user?.id && ev.userId !== null && String(ev.userId) === user.id)}
                  onDelete={handleDelete}
                />
              ))
          }
        </div>
      )}

      <div ref={bottomRef} />

      {/* Comment input — comments view only */}
      {view === "comments" && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="relative">
            {mentionQuery !== null && (
              <MentionDropdown
                users={users}
                query={mentionQuery}
                onSelect={handleMentionSelect}
              />
            )}
            <textarea
              ref={textareaRef}
              className="w-full px-3.5 py-2.5 text-sm text-slate-800 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all resize-none placeholder:text-slate-400"
              rows={3}
              placeholder="Add a comment… (type @ to mention someone)"
              value={comment}
              onChange={handleCommentChange}
              onKeyDown={handleTextareaKeyDown}
              maxLength={10000}
            />
          </div>
          {postError && <p className="text-xs text-red-500 mt-1">{postError}</p>}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400 hidden sm:block">⌘ Enter to post · @ to mention</p>
            <button
              onClick={handlePost}
              disabled={posting || !comment.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={13} />
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
