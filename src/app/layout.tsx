import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/components/auth-context";
import { BrandingProvider } from "@/components/branding-context";
import { ClientIdProvider } from "@/components/client-id-context";
import { ToastProvider } from "@/components/toast-context";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { ThemeProvider } from "@/components/theme-context";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "ImperaOps",
  description: "ImperaOps MVP - Incidents",
};

// Inline script runs before hydration to apply the stored theme class,
// preventing a flash of the wrong theme.
const themeInitScript = `(function(){try{var t=localStorage.getItem('imperaops.theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ClientIdProvider>
              <BrandingProvider>
                <ToastProvider>
                  <AppErrorBoundary>
                    <AppShell>{children}</AppShell>
                  </AppErrorBoundary>
                </ToastProvider>
              </BrandingProvider>
            </ClientIdProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
