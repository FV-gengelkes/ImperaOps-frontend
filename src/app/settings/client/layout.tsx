import { AuthGuard } from "@/components/auth-guard";

export default function ClientSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
