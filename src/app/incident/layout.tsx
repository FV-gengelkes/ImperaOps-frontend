import { AuthGuard } from "@/components/auth-guard";

export default function IncidentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {children}
      </div>
    </AuthGuard>
  );
}
