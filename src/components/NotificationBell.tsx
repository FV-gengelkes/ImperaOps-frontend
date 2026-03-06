"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, MessageSquare, UserCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getUnreadNotificationCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getStoredToken,
} from "@/lib/api";
import type { NotificationDto } from "@/lib/types";

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
  const cls = "shrink-0 mt-0.5";
  switch (type) {
    case "event_assigned":  return <UserCheck   size={14} className={`${cls} text-brand`} />;
    case "task_assigned":   return <CheckCircle2 size={14} className={`${cls} text-teal-500`} />;
    case "comment_added":   return <MessageSquare size={14} className={`${cls} text-slate-400`} />;
    case "status_changed":  return <AlertTriangle size={14} className={`${cls} text-warning`} />;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const ref    = useRef<HTMLDivElement>(null);

  const [unreadCount,   setUnreadCount]   = useState(0);
  const [taskCount,     setTaskCount]     = useState(0);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading,       setLoading]       = useState(false);

  // Real-time updates via SSE + fallback on tab visibility change
  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const { count, taskCount } = await getUnreadNotificationCount();
        if (!cancelled) { setUnreadCount(count); setTaskCount(taskCount); }
      } catch { /* ignore */ }
    }

    // Initial load
    fetchCount();

    // SSE stream — browser auto-reconnects on disconnect
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const token   = getStoredToken();
    const es = new EventSource(`${apiBase}/api/v1/notifications/stream?token=${token}`);

    es.addEventListener("notification", () => {
      fetchCount();
    });

    // Catch-up on tab refocus (handles gaps during SSE reconnect)
    function onVisibility() {
      if (document.visibilityState === "visible") fetchCount();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("notif:refresh", fetchCount);

    return () => {
      cancelled = true;
      es.close();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("notif:refresh", fetchCount);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  async function openDropdown() {
    if (dropdownOpen) { setDropdownOpen(false); return; }
    setDropdownOpen(true);
    setLoading(true);
    try {
      const [{ count, taskCount }, result] = await Promise.all([
        getUnreadNotificationCount(),
        getNotifications(1, 10),
      ]);
      setUnreadCount(count);
      setTaskCount(taskCount);
      setNotifications(result.items);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function handleClickNotif(n: NotificationDto) {
    setDropdownOpen(false);
    if (!n.isRead) {
      markNotificationRead(n.id).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (n.entityPublicId) {
      router.push(`/events/${n.entityPublicId}/details`);
    }
  }

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openDropdown}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-graphite transition"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-critical text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : taskCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-teal text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {taskCount > 9 ? "9+" : taskCount}
          </span>
        ) : null}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand hover:text-brand-hover transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotif(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition border-b border-slate-50 last:border-0 ${
                    !n.isRead ? "bg-blue-50 hover:bg-blue-100/60" : ""
                  }`}
                >
                  <NotifIcon type={n.notificationType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{relativeTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <button
              onClick={() => { setDropdownOpen(false); router.push("/notifications"); }}
              className="text-xs text-brand hover:text-brand-hover transition w-full text-center"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
