"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, MessageSquare, UserCheck } from "lucide-react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import type { NotificationDto, PagedResult } from "@/lib/types";

const PAGE_SIZE = 25;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30)   return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function NotifIcon({ type }: { type: NotificationDto["notificationType"] }) {
  switch (type) {
    case "event_assigned":  return <UserCheck    size={16} className="text-brand shrink-0 mt-0.5" />;
    case "task_assigned":   return <CheckCircle2  size={16} className="text-teal-500 shrink-0 mt-0.5" />;
    case "comment_added":   return <MessageSquare size={16} className="text-slate-400 shrink-0 mt-0.5" />;
    case "status_changed":  return <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [result,   setResult]   = useState<PagedResult<NotificationDto> | null>(null);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);

  async function load(p: number) {
    setLoading(true);
    try {
      const data = await getNotifications(p, PAGE_SIZE);
      setResult(data);
      setPage(p);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(1); }, []);

  const hasUnread = result?.items.some(n => !n.isRead) ?? false;

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setResult(prev => prev ? { ...prev, items: prev.items.map(n => ({ ...n, isRead: true })) } : prev);
  }

  async function handleClick(n: NotificationDto) {
    if (!n.isRead) {
      markNotificationRead(n.id).catch(() => {});
      setResult(prev => prev
        ? { ...prev, items: prev.items.map(x => x.id === n.id ? { ...x, isRead: true } : x) }
        : prev
      );
    }
    if (n.entityPublicId) router.push(`/events/${n.entityPublicId}/details`);
  }

  const totalPages = result ? Math.ceil(result.totalCount / PAGE_SIZE) : 1;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Bell size={20} className="text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-steel-white">Notifications</h1>
          {result && result.totalCount > 0 && (
            <span className="text-sm text-slate-400">({result.totalCount})</span>
          )}
        </div>
        {hasUnread && (
          <button
            onClick={handleMarkAll}
            className="text-sm text-brand hover:text-brand-hover transition"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
        ) : !result || result.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No notifications yet</div>
        ) : (
          <>
            {result.items.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-4 px-6 py-4 text-left border-b border-slate-100 dark:border-slate-line/40 last:border-0 transition ${
                  !n.isRead
                    ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30"
                    : "hover:bg-slate-50 dark:hover:bg-midnight"
                }`}
              >
                <NotifIcon type={n.notificationType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-steel-white">{n.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{relativeTime(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <div className="w-2.5 h-2.5 rounded-full bg-brand shrink-0 mt-1.5" />
                )}
              </button>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-line/40">
                <button
                  onClick={() => load(page - 1)}
                  disabled={page <= 1}
                  className="text-sm text-brand hover:text-brand-hover disabled:text-slate-300 disabled:cursor-not-allowed transition"
                >
                  ← Previous
                </button>
                <span className="text-xs text-slate-400 dark:text-slate-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => load(page + 1)}
                  disabled={page >= totalPages}
                  className="text-sm text-brand hover:text-brand-hover disabled:text-slate-300 disabled:cursor-not-allowed transition"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
