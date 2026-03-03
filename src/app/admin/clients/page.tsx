import { AdminGuard } from "@/components/admin-guard";
import { AdminClientsPage } from "./admin-clients-page";

export default function Page() {
  return (
    <AdminGuard>
      <AdminClientsPage />
    </AdminGuard>
  );
}
