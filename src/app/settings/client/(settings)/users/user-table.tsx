"use client";

import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { ClientUserDto } from "@/lib/types";
import { ActiveBadge, ROLES } from "./users-shared";

export function UserTable({
  users,
  loading,
  error,
  removing,
  updatingRole,
  onRefresh,
  onRoleChange,
  onEdit,
  onRemove,
}: {
  users: ClientUserDto[];
  loading: boolean;
  error: string;
  removing: number | null;
  updatingRole: number | null;
  onRefresh: () => void;
  onRoleChange: (userId: number, role: string) => void;
  onEdit: (user: ClientUserDto) => void;
  onRemove: (user: ClientUserDto) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">
          Users with Access
          {!loading && (
            <span className="ml-2 text-sm font-normal text-slate-400">({users.length})</span>
          )}
        </h2>
        <button
          onClick={onRefresh}
          title="Refresh"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <p className="px-5 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</p>
      )}

      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">Loading...</div>
      ) : users.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          No users have access to this client yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {users.map(user => (
            <li key={user.id} className="flex items-center gap-4 px-5 py-3.5">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {user.displayName[0]?.toUpperCase() ?? "?"}
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{user.displayName}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>

              {/* Active status */}
              <ActiveBadge active={user.isActive} />

              {/* Role selector */}
              <div className="shrink-0">
                {updatingRole === user.id ? (
                  <RefreshCw size={14} className="animate-spin text-slate-400" />
                ) : (
                  <select
                    className="text-xs rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                    value={user.role}
                    onChange={e => onRoleChange(user.id, e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
              </div>

              {/* Edit */}
              <button
                onClick={() => onEdit(user)}
                className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors shrink-0"
                title="Edit user"
              >
                <Pencil size={14} />
              </button>

              {/* Remove */}
              <button
                onClick={() => onRemove(user)}
                disabled={removing === user.id}
                className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors shrink-0"
                title="Remove access"
              >
                {removing === user.id
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Trash2 size={14} />
                }
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
