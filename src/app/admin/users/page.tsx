import { AdminGuard } from "@/components/admin-guard";
import { AdminUsersPage } from "./admin-users-page";

export default function Page() {
  return (
    <AdminGuard>
      <AdminUsersPage />
    </AdminGuard>
  );
}
