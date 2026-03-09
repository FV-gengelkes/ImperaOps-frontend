"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useClientId } from "@/components/client-id-context";
import { getClientUsers, removeClientUser, updateClientUserRole } from "@/lib/api";
import type { ClientUserDto } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { AddUserCard } from "./add-user-modal";
import { FamilyUsersCard } from "./family-users-card";
import { EditUserModal } from "./edit-user-modal";
import { UserTable } from "./user-table";

export default function ClientUsersPage() {
  const { clientId } = useClientId();
  const { isSuperAdmin } = useAuth();
  const [users, setUsers]       = useState<ClientUserDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [removing, setRemoving]         = useState<number | null>(null);
  const [updatingRole, setUpdatingRole] = useState<number | null>(null);
  const [editingUser, setEditingUser]   = useState<ClientUserDto | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");
    try {
      setUsers(await getClientUsers(clientId));
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  // Super admins are managed in the admin panel — hide them from the client settings view
  const visibleUsers = users.filter(u => !u.isSuperAdmin);

  function handleAdded(user: ClientUserDto) {
    setUsers(prev =>
      [...prev, user].sort((a, b) => a.displayName.localeCompare(b.displayName))
    );
  }

  async function handleRoleChange(userId: number, role: string) {
    if (!clientId) return;
    setUpdatingRole(userId);
    try {
      await updateClientUserRole(clientId, userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch {
      await load();
    } finally {
      setUpdatingRole(null);
    }
  }

  function handleUserSaved(updated: Partial<ClientUserDto> & { id: number }) {
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
    setEditingUser(null);
  }

  async function handleRemove(user: ClientUserDto) {
    if (!clientId) return;
    if (!confirm(`Remove ${user.displayName}'s access to this client?`)) return;
    setRemoving(user.id);
    try {
      await removeClientUser(clientId, user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to remove user.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
      {editingUser && (
        <EditUserModal
          user={editingUser}
          clientId={clientId!}
          viewerIsSuperAdmin={isSuperAdmin}
          onSaved={handleUserSaved}
          onClose={() => setEditingUser(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
          <Users className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">User Administration</h1>
      </div>
      <p className="text-slate-500 mb-8">
        Manage who has access to this client and their roles.
      </p>

      {!clientId ? (
        <p className="text-sm text-slate-400">Set a client ID above to manage users.</p>
      ) : (
        <div className="space-y-6">

          <AddUserCard clientId={clientId} onAdded={handleAdded} />

          {isSuperAdmin && (
            <FamilyUsersCard clientId={clientId} onAdded={handleAdded} />
          )}

          <UserTable
            users={visibleUsers}
            loading={loading}
            error={error}
            removing={removing}
            updatingRole={updatingRole}
            onRefresh={() => void load()}
            onRoleChange={(userId, role) => void handleRoleChange(userId, role)}
            onEdit={setEditingUser}
            onRemove={(user) => void handleRemove(user)}
          />
        </div>
      )}
    </div>
  );
}
