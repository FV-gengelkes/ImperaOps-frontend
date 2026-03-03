import "./globals.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/components/auth-context";
import { ClientIdProvider } from "@/components/client-id-context";

export const metadata: Metadata = {
  title: "FreightVis",
  description: "FreightVis MVP - Incidents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ClientIdProvider>
            <AppShell>{children}</AppShell>
          </ClientIdProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
