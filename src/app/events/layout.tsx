import { AuthGuard } from "@/components/auth-guard";

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="p-6 lg:p-8">
        {children}
      </div>
    </AuthGuard>
  );
}
