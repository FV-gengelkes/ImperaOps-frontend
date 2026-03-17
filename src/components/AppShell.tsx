"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, Keyboard, LayoutDashboard, Lightbulb, LogOut, MapPin, Menu, Moon, Plane, Plus, Search, Settings, Shield, ShieldAlert, Sun, User, Users, X } from "lucide-react";
import { useAuth } from "./auth-context";
import { useBranding } from "./branding-context";
import { useModules } from "./modules-context";
import { useClientChangeRedirect } from "@/hooks/use-client-change-redirect";
import { useEffect, useRef, useState } from "react";
import { adminGetClients } from "@/lib/api";
import type { ClientAccessDto } from "@/lib/types";
import { NotificationBell } from "./NotificationBell";
import { useTheme } from "./theme-context";

// ── Keyboard shortcuts modal ───────────────────────────────────────────────────

const SHORTCUTS = [
  { keys: ["N"],        description: "New event"       },
  { keys: ["G", "E"],   description: "Go to Events"    },
  { keys: ["G", "D"],   description: "Go to Dashboard" },
  { keys: ["?"],        description: "Show this help"  },
];

function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-graphite rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-line w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-line/40">
          <div className="flex items-center gap-2">
            <Keyboard size={15} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-steel-white">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors">
            <X size={16} />
          </button>
        </div>
        <ul className="px-6 py-4 space-y-3">
          {SHORTCUTS.map(s => (
            <li key={s.keys.join("+")} className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i} className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded bg-slate-100 dark:bg-midnight text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-line">
                    {k}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const analytics = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/insights",  label: "Insights",  icon: Lightbulb },
];

const operations = [
  { href: "/events/list", label: "Events", icon: AlertTriangle },
  { href: "/events/new", label: "New Event", icon: Plus },
];

const adminLinks = [
  { href: "/admin/clients", label: "Clients",      icon: Settings },
  { href: "/admin/users",   label: "Super Admins", icon: Shield },
  { href: "/admin/audit",   label: "Audit Log",    icon: ShieldAlert },
];

function SidebarLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-brand text-brand-text shadow-sm"
          : "text-slate-400 hover:text-white hover:bg-graphite"
      }`}
    >
      <Icon size={17} />
      {label}
    </Link>
  );
}

// ── Top bar (desktop) ─────────────────────────────────────────────────────────

function TopBar() {
  const { user, isSuperAdmin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const initial = user?.displayName?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="hidden lg:flex fixed top-0 left-60 right-0 z-20 h-14 bg-midnight border-b border-slate-line/60 items-center px-6 gap-4">
      {/* Search — left */}
      <div className="flex-1">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            placeholder="Search…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-line rounded-lg bg-graphite
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Client switcher — center */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-xs font-medium text-slate-500">Active Client</span>
        <ClientSwitcher />
      </div>

      {/* Account — right */}
      <div className="flex-1 flex justify-end items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-graphite transition"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <NotificationBell />
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-graphite transition"
          >
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-brand-text font-bold text-sm select-none">
              {initial}
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-graphite border border-slate-200 dark:border-slate-line rounded-xl shadow-xl z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-line/40">
                <p className="text-sm font-semibold text-slate-800 dark:text-steel-white truncate">{user?.displayName}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>

              {/* Links */}
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-midnight transition"
                >
                  <User size={15} className="text-slate-400" />
                  My Profile
                </Link>
                <Link
                  href="/settings/client"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-midnight transition"
                >
                  <Settings size={15} className="text-slate-400" />
                  Client Settings
                </Link>

                {isSuperAdmin && (
                  <>
                    <div className="mx-4 my-1 border-t border-slate-100 dark:border-slate-line/40" />
                    <div className="px-4 py-1.5 flex items-center gap-1.5">
                      <Shield size={10} className="text-amber-500" />
                      <span className="text-[10px] font-semibold text-amber-500/80 uppercase tracking-widest">
                        Super Admin
                      </span>
                    </div>
                    <Link
                      href="/admin/clients"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-midnight transition"
                    >
                      <Settings size={15} className="text-slate-400" />
                      Manage Clients
                    </Link>
                    <Link
                      href="/admin/users"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-midnight transition"
                    >
                      <Users size={15} className="text-slate-400" />
                      Manage Users
                    </Link>
                    <Link
                      href="/admin/audit"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-midnight transition"
                    >
                      <ShieldAlert size={15} className="text-slate-400" />
                      Audit Log
                    </Link>
                  </>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-line/40 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** For super admins, orders clients as parents first then their children beneath them. */
function buildHierarchy(list: ClientAccessDto[]): ClientAccessDto[] {
  const parents  = list.filter(c => !c.parentClientId).sort((a, b) => a.name.localeCompare(b.name));
  const result: ClientAccessDto[] = [];
  for (const p of parents) {
    result.push(p);
    list
      .filter(c => c.parentClientId === p.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(c => result.push(c));
  }
  // Any orphans whose parent wasn't in the list
  const seen = new Set(result.map(c => c.id));
  list.filter(c => !seen.has(c.id)).forEach(c => result.push(c));
  return result;
}

function ClientSwitcher() {
  const { clients, activeClientId, setActiveClientId, isSuperAdmin, clientRefreshKey } = useAuth();
  const [open,       setOpen]       = useState(false);
  const [allClients, setAllClients] = useState<ClientAccessDto[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Super admins: fetch all clients, then scope to current client's family (parent + children).
  useEffect(() => {
    if (!isSuperAdmin) return;
    adminGetClients().then(dtos => {
      setAllClients(
        dtos
          .filter(c => c.status !== "Inactive")
          .map(c => ({ id: c.id, name: c.name, role: "Admin", parentClientId: c.parentClientId }))
      );
    }).catch(() => {});
  }, [isSuperAdmin, activeClientId, clientRefreshKey]);

  const displayClients = (() => {
    if (!isSuperAdmin || allClients.length === 0) return clients;
    const current = allClients.find(c => c.id === activeClientId);
    if (!current) return allClients.filter(c => c.id === activeClientId);
    // Find the family root: if current is a child, go to its parent; otherwise current is the root
    const rootId = current.parentClientId ?? current.id;
    const family = allClients.filter(c => c.id === rootId || c.parentClientId === rootId);
    return buildHierarchy(family);
  })();

  if (displayClients.length === 0) return null;

  const active = displayClients.find(c => c.id === activeClientId) ?? displayClients[0];
  const canSwitch = displayClients.length > 1;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => canSwitch && setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-graphite transition ${canSwitch ? "hover:bg-slate-line cursor-pointer" : "cursor-default"}`}
      >
        <div className="w-5 h-5 rounded bg-brand flex items-center justify-center text-brand-text text-[11px] font-bold shrink-0">
          {active?.name?.[0] ?? "?"}
        </div>
        <span className="text-sm font-medium text-slate-200 truncate max-w-[160px]">{active?.name ?? "No client"}</span>
        {canSwitch && (
          <ChevronDown size={13} className={`text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && canSwitch && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-full w-max max-w-xs bg-graphite border border-slate-line rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {displayClients.map(c => {
            const isChild = isSuperAdmin && !!c.parentClientId;
            return (
              <button
                key={c.id}
                onClick={() => { setActiveClientId(c.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 text-left text-sm hover:bg-slate-line transition ${
                  c.id === activeClientId ? "text-brand font-semibold" : "text-slate-300"
                } ${isChild ? "pl-7 pr-3 py-2" : "px-3 py-2.5"}`}
              >
                {isChild ? (
                  <div className="w-5 h-5 rounded bg-slate-line flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                    {c.name[0]}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-md bg-midnight flex items-center justify-center text-brand font-bold text-xs shrink-0">
                    {c.name[0]}
                  </div>
                )}
                <span className="flex-1 truncate">{c.name}</span>
                {c.id === activeClientId && (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium shrink-0">
                    <CheckCircle2 size={13} />
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Mobile drawer ──────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  isActive,
  isSuperAdmin,
  user,
  isAuthenticated,
  handleLogout,
  logoSrc,
  systemName,
  hasModule,
}: {
  open: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
  isSuperAdmin: boolean;
  user: { displayName: string; email: string } | null;
  isAuthenticated: boolean;
  handleLogout: () => void;
  logoSrc: string;
  systemName: string | null;
  hasModule: (id: string) => boolean;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      {/* Drawer panel */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-midnight flex flex-col">
        {/* Logo strip */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-line/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoSrc} alt="" className="h-10 w-auto shrink-0" />
            {systemName
              ? <span className="font-semibold text-steel-white text-lg tracking-tight truncate">{systemName}</span>
              : <span className="font-semibold text-steel-white text-lg tracking-tight">IMPERA<span className="text-brand">OPS</span></span>
            }
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-graphite transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 px-3">
            Analytics
          </p>
          {analytics.map(({ href, label, icon: Icon }) => (
            <SidebarLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
          ))}

          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 mt-5 px-3">
            Operations
          </p>
          {operations.map(({ href, label, icon: Icon }) => (
            <SidebarLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
          ))}

          {hasModule("ag_field_mapping") && (
            <>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 mt-5 px-3">
                Ag Field Mapping
              </p>
              <SidebarLink href="/ag/fields" label="Fields" Icon={MapPin} active={isActive("/ag/fields")} />
              <SidebarLink href="/ag/jobs" label="Spray Jobs" Icon={Plane} active={isActive("/ag/jobs")} />
            </>
          )}

          {isSuperAdmin && (
            <>
              <div className="my-4 border-t border-slate-line/60" />
              <div className="flex items-center gap-1.5 px-3 mb-2">
                <Shield size={10} className="text-amber-500" />
                <p className="text-[10px] font-semibold text-amber-500/80 uppercase tracking-widest">
                  Super Admin
                </p>
              </div>
              {adminLinks.map(({ href, label, icon: Icon }) => (
                <SidebarLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
              ))}
            </>
          )}
        </nav>

        {/* Profile footer */}
        <div className="px-3 py-4 border-t border-slate-line/60 shrink-0">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex-1 min-w-0">
              {user ? (
                <>
                  <p className="text-xs font-medium text-slate-300 truncate">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </>
              ) : (
                <p className="text-xs text-slate-500">Not signed in</p>
              )}
            </div>
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-critical hover:bg-graphite transition"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            ) : (
              <Link href="/login" onClick={onClose} className="text-xs text-brand hover:text-brand-hover transition">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout, isAuthenticated, isSuperAdmin, ready } = useAuth();
  const { theme, toggle } = useTheme();
  const { branding } = useBranding();
  const { hasModule } = useModules();
  const logoSrc    = branding?.logoUrl    ?? "/logo-icon.png";
  const systemName = branding?.systemName ?? null;
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const pendingKeyRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect to safe pages when the active client changes
  useClientChangeRedirect();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Skip when focus is on an interactive element
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      // Two-key sequences
      if (pendingKeyRef.current === "g") {
        pendingKeyRef.current = null;
        if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
        if (key === "e" || key === "E") { e.preventDefault(); router.push("/events/list"); return; }
        if (key === "d" || key === "D") { e.preventDefault(); router.push("/dashboard");   return; }
        return;
      }

      if (key === "g" || key === "G") {
        pendingKeyRef.current = "g";
        pendingTimerRef.current = setTimeout(() => { pendingKeyRef.current = null; }, 1500);
        return;
      }

      if (key === "n" || key === "N") { e.preventDefault(); router.push("/events/new"); return; }
      if (key === "?")                { e.preventDefault(); setShortcutsOpen(v => !v);  return; }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, [router]);

  // Login page and public report pages render full-screen without the shell
  if (pathname === "/login" || pathname.startsWith("/report/") || pathname === "/forgot-password" || pathname === "/set-password") return <>{children}</>;

  // Wait for auth hydration before rendering the shell to avoid flash
  if (!ready) return null;

  function handleLogout() {
    setDrawerOpen(false);
    logout();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/events/list") return pathname === href;
    if (href === "/events/new") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen bg-surface dark:bg-midnight">
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 w-60 bg-midnight z-30">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-line/60 shrink-0">
          <img src={logoSrc} alt="" className="h-10 w-auto" />
          {systemName
            ? <span className="font-semibold text-steel-white text-lg tracking-tight truncate">{systemName}</span>
            : <span className="font-semibold text-steel-white text-lg tracking-tight">IMPERA<span className="text-brand">OPS</span></span>
          }
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 px-3">
            Analytics
          </p>
          {analytics.map(({ href, label, icon: Icon }) => (
            <SidebarLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
          ))}

          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 mt-5 px-3">
            Operations
          </p>
          {operations.map(({ href, label, icon: Icon }) => (
            <SidebarLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
          ))}

          {hasModule("ag_field_mapping") && (
            <>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 mt-5 px-3">
                Ag Field Mapping
              </p>
              <SidebarLink href="/ag/fields" label="Fields" Icon={MapPin} active={isActive("/ag/fields")} />
              <SidebarLink href="/ag/jobs" label="Spray Jobs" Icon={Plane} active={isActive("/ag/jobs")} />
            </>
          )}

          {isSuperAdmin && (
            <>
              <div className="my-4 border-t border-slate-line/60" />
              <div className="flex items-center gap-1.5 px-3 mb-2">
                <Shield size={10} className="text-amber-500" />
                <p className="text-[10px] font-semibold text-amber-500/80 uppercase tracking-widest">
                  Super Admin
                </p>
              </div>
              {adminLinks.map(({ href, label, icon: Icon }) => (
                <SidebarLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
              ))}
            </>
          )}
        </nav>

        {/* Footer — user */}
        <div className="px-3 py-4 border-t border-slate-line/60 shrink-0">
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 min-w-0">
              {user ? (
                <>
                  <p className="text-xs font-medium text-slate-300 truncate">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </>
              ) : (
                <p className="text-xs text-slate-500">Not signed in</p>
              )}
            </div>

            {!isAuthenticated && (
              <Link
                href="/login"
                className="text-xs text-brand hover:text-brand-hover transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile top nav ─────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-midnight border-b border-slate-line/60 flex items-center px-4 gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <img src={logoSrc} alt="" className="h-9 w-auto" />
          {systemName
            ? <span className="font-semibold text-white text-base tracking-tight truncate max-w-[140px]">{systemName}</span>
            : <span className="font-semibold text-white text-base tracking-tight">IMPERA<span className="text-brand">OPS</span></span>
          }
        </div>

        <div className="flex-1" />

        {/* Dark mode toggle (mobile) */}
        <button
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-graphite transition"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-graphite transition"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* ── Desktop top bar ────────────────────────────────────── */}
      <TopBar />

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex-1 lg:ml-60 pt-14 min-w-0 flex flex-col">
        <div className="flex-1">{children}</div>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────── */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isActive={isActive}
        isSuperAdmin={isSuperAdmin}
        user={user}
        isAuthenticated={isAuthenticated}
        handleLogout={handleLogout}
        logoSrc={logoSrc}
        systemName={systemName}
        hasModule={hasModule}
      />

      {/* ── Keyboard shortcuts modal ────────────────────────── */}
      {shortcutsOpen && <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}
