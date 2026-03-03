"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, LayoutDashboard, LogOut, Plus, Search, Settings, Shield, Truck, User, Users } from "lucide-react";
import { useAuth } from "./auth-context";
import { useClientChangeRedirect } from "@/hooks/use-client-change-redirect";
import { useEffect, useRef, useState } from "react";
import { adminGetClients } from "@/lib/api";
import type { ClientAccessDto } from "@/lib/types";

const analytics = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const operations = [
  { href: "/incident/list", label: "Incidents", icon: AlertTriangle },
  { href: "/incident/0/details", label: "New Incident", icon: Plus },
];

const adminLinks = [
  { href: "/admin/clients", label: "Clients",   icon: Settings },
  { href: "/admin/users",   label: "Users",     icon: Users },
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
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-400 hover:text-white hover:bg-slate-800"
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
    <header className="hidden lg:flex fixed top-0 left-60 right-0 z-20 h-14 bg-slate-950 border-b border-slate-800/60 items-center px-6 gap-4">
      {/* Search — left */}
      <div className="flex-1">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            placeholder="Search…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-700 rounded-lg bg-slate-800
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Client switcher — center */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-xs font-medium text-slate-500">Active Client</span>
        <ClientSwitcher />
      </div>

      {/* Account — right */}
      <div className="flex-1 flex justify-end">
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm select-none">
              {initial}
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.displayName}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>

              {/* Links */}
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <User size={15} className="text-slate-400" />
                  My Profile
                </Link>
                <Link
                  href="/settings/client"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <Settings size={15} className="text-slate-400" />
                  Client Settings
                </Link>

                {isSuperAdmin && (
                  <>
                    <div className="mx-4 my-1 border-t border-slate-100" />
                    <div className="px-4 py-1.5 flex items-center gap-1.5">
                      <Shield size={10} className="text-amber-500" />
                      <span className="text-[10px] font-semibold text-amber-500/80 uppercase tracking-widest">
                        Super Admin
                      </span>
                    </div>
                    <Link
                      href="/admin/clients"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Settings size={15} className="text-slate-400" />
                      Manage Clients
                    </Link>
                    <Link
                      href="/admin/users"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Users size={15} className="text-slate-400" />
                      Manage Users
                    </Link>
                  </>
                )}
              </div>

              <div className="border-t border-slate-100 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
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
  const { clients, activeClientId, setActiveClientId, isSuperAdmin } = useAuth();
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

  // Super admins see every active client; fetch once on mount.
  useEffect(() => {
    if (!isSuperAdmin) return;
    adminGetClients().then(dtos => {
      setAllClients(
        dtos
          .filter(c => c.isActive)
          .map(c => ({ id: c.id, name: c.name, role: "Admin", parentClientId: c.parentClientId }))
      );
    }).catch(() => {});
  }, [isSuperAdmin]);

  const displayClients = isSuperAdmin && allClients.length > 0
    ? buildHierarchy(allClients)
    : clients;

  if (displayClients.length === 0) return null;

  const active = displayClients.find(c => c.id === activeClientId) ?? displayClients[0];
  const canSwitch = displayClients.length > 1;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => canSwitch && setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 transition ${canSwitch ? "hover:bg-slate-700 cursor-pointer" : "cursor-default"}`}
      >
        <div className="w-5 h-5 rounded bg-indigo-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
          {active?.name?.[0] ?? "?"}
        </div>
        <span className="text-sm font-medium text-slate-200 truncate max-w-[160px]">{active?.name ?? "No client"}</span>
        {canSwitch && (
          <ChevronDown size={13} className={`text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && canSwitch && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-full w-max max-w-xs bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {displayClients.map(c => {
            const isChild = isSuperAdmin && !!c.parentClientId;
            return (
              <button
                key={c.id}
                onClick={() => { setActiveClientId(c.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 text-left text-sm hover:bg-slate-700 transition ${
                  c.id === activeClientId ? "text-indigo-400 font-semibold" : "text-slate-300"
                } ${isChild ? "pl-7 pr-3 py-2" : "px-3 py-2.5"}`}
              >
                {isChild ? (
                  <div className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                    {c.name[0]}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-md bg-indigo-900 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout, isAuthenticated, isSuperAdmin } = useAuth();

  // Redirect to safe pages when the active client changes
  useClientChangeRedirect();

  // Login page renders full-screen without the shell
  if (pathname === "/login") return <>{children}</>;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/incident/list") return pathname === href;
    if (href === "/incident/0/details") return pathname.endsWith("/details") && pathname.includes("/0/");
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 w-60 bg-slate-950 z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800/60 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Truck size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">FreightVis</span>
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

          {isSuperAdmin && (
            <>
              <div className="my-4 border-t border-slate-800/60" />
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
        <div className="px-3 py-4 border-t border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 min-w-0">
              {user ? (
                <>
                  <p className="text-xs font-medium text-slate-300 truncate">{user.displayName}</p>
                  <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
                </>
              ) : (
                <p className="text-xs text-slate-600">Not signed in</p>
              )}
            </div>

            {!isAuthenticated && (
              <Link
                href="/login"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile top nav ─────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-slate-950 border-b border-slate-800/60 flex items-center px-4 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
            <Truck size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">FreightVis</span>
        </div>

        <div className="flex-1" />

        <nav className="flex items-center gap-1">
          {[...analytics, ...operations, ...(isSuperAdmin ? adminLinks : [])].map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </nav>
      </header>

      {/* ── Desktop top bar ────────────────────────────────────── */}
      <TopBar />

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex-1 lg:ml-60 pt-14 min-w-0 flex flex-col">
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
