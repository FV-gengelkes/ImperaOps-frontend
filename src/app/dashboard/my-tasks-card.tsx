"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckSquare, ClipboardList, Loader2 } from "lucide-react";
import { getMyTasks } from "@/lib/api";
import type { MyTaskDto } from "@/lib/types";

const WINDOW_OPTIONS = [
  { label: "7d",  days: 7  },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
];

const STORAGE_KEY = "imperaops.my-tasks-window";

function loadWindow(): number {
  try {
    const v = parseInt(localStorage.getItem(STORAGE_KEY) ?? "", 10);
    return WINDOW_OPTIONS.some(o => o.days === v) ? v : 14;
  } catch { return 14; }
}

function formatDue(iso: string): { label: string; overdue: boolean } {
  const d = new Date(iso);
  const dDay = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((dDay.getTime() - today.getTime()) / 86400000);

  if (diff < 0)  return { label: diff === -1 ? "Yesterday" : `${Math.abs(diff)}d ago`, overdue: true };
  if (diff === 0) return { label: "Today", overdue: false };
  if (diff === 1) return { label: "Tomorrow", overdue: false };
  return { label: `In ${diff}d`, overdue: false };
}

interface TaskRowProps {
  task: MyTaskDto;
  onClick: () => void;
}

function TaskRow({ task, onClick }: TaskRowProps) {
  const { label, overdue } = formatDue(task.dueAt);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-graphite transition border-b border-slate-50 dark:border-slate-line/20 last:border-0 group cursor-pointer"
    >
      <CheckSquare size={15} className={`shrink-0 mt-0.5 ${overdue ? "text-critical" : "text-slate-300"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-steel-white truncate group-hover:text-brand transition">{task.title}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{task.eventPublicId} · {task.eventTitle}</p>
      </div>
      <span className={`text-xs font-semibold shrink-0 mt-0.5 ${overdue ? "text-critical" : "text-slate-400"}`}>
        {label}
      </span>
    </button>
  );
}

interface MyTasksCardProps {
  clientId: number;
}

export function MyTasksCard({ clientId }: MyTasksCardProps) {
  const router = useRouter();
  const [daysAhead, setDaysAhead] = useState(loadWindow);
  const [tasks, setTasks]         = useState<MyTaskDto[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (clientId <= 0) return;
    setLoading(true);
    setError("");
    getMyTasks(clientId, daysAhead)
      .then(setTasks)
      .catch(() => setError("Failed to load tasks."))
      .finally(() => setLoading(false));
  }, [clientId, daysAhead]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue  = tasks.filter(t => new Date(new Date(t.dueAt).getUTCFullYear(), new Date(t.dueAt).getUTCMonth(), new Date(t.dueAt).getUTCDate()) < today);
  const upcoming = tasks.filter(t => new Date(new Date(t.dueAt).getUTCFullYear(), new Date(t.dueAt).getUTCMonth(), new Date(t.dueAt).getUTCDate()) >= today);

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-line/40">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-brand shrink-0" />
          <span className="font-semibold text-slate-800 dark:text-steel-white text-sm">My Tasks</span>
          {!loading && tasks.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand text-brand-text text-[10px] font-bold">
              {tasks.length}
            </span>
          )}
        </div>
        {/* Window selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-midnight rounded-lg p-0.5">
          {WINDOW_OPTIONS.map(o => (
            <button
              key={o.days}
              onClick={() => { setDaysAhead(o.days); localStorage.setItem(STORAGE_KEY, String(o.days)); }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                daysAhead === o.days
                  ? "bg-white dark:bg-graphite text-brand shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-72">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="text-slate-300 animate-spin" />
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-center text-sm text-red-500">{error}</div>
        ) : tasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            No tasks due in the next {daysAhead} days
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                  <AlertCircle size={12} className="text-critical shrink-0" />
                  <span className="text-[10px] font-bold text-critical uppercase tracking-wider">
                    Overdue · {overdue.length}
                  </span>
                </div>
                {overdue.map(t => (
                  <TaskRow
                    key={t.taskPublicId}
                    task={t}
                    onClick={() => router.push(`/events/${t.eventPublicId}/details?tab=tasks`)}
                  />
                ))}
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Upcoming · {upcoming.length}
                  </span>
                </div>
                {upcoming.map(t => (
                  <TaskRow
                    key={t.taskPublicId}
                    task={t}
                    onClick={() => router.push(`/events/${t.eventPublicId}/details?tab=tasks`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
