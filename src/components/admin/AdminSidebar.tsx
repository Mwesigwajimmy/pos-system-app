"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Zap,
  Building2,
  Activity,
  Banknote,
  ChevronLeft,
  ShieldCheck,
  LayoutDashboard,
  LucideIcon,
  ShieldAlert,
  Cpu,
  Fingerprint,
  Settings,
  FileClock,
  LogOut,
  Command,
  Loader2,
} from 'lucide-react';

/**
 * DEEPLY DEFINED UTILITY: cn (Class Name Merger)
 * Defined locally to ensure zero external dependency issues and a clean UI.
 */
function cn(...inputs: (string | undefined | boolean | null | Record<string, boolean>)[]) {
  return inputs
    .flatMap((input) => {
      if (typeof input === 'string') return input;
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([_, value]) => value)
          .map(([key]) => key);
      }
      return [];
    })
    .join(' ');
}

const supabase = createClient();

// --- TYPES ---

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Marks a high-privilege / irreversible-action area. Rendered with a caution accent and gated by `restrictedRoles`. */
  restricted?: boolean;
}

interface AdminSidebarProps {
  role: string;
  className?: string;
  /**
   * Roles that are NOT permitted to see `restricted` menu items (e.g. Sovereign Control).
   * Adjust these to match your actual role taxonomy — this is a conservative default.
   */
  restrictedFromRoles?: string[];
}

/**
 * AUTHORITATIVE MENU CONFIGURATION
 * Hrefs are aligned with the BBU1 System folder architecture.
 */
const MENU_ITEMS: MenuItem[] = [
  { href: '/command-center', label: 'War Room', icon: Zap },
  { href: '/tenants', label: 'Tenants', icon: Building2 },
  { href: '/telemetry', label: 'Telemetry', icon: Activity },
  { href: '/billing', label: 'Cashflow', icon: Banknote },
  { href: '/audit-log', label: 'Audit Log', icon: FileClock },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/sovereign-control', label: 'Sovereign Control', icon: ShieldAlert, restricted: true },
];

export default function AdminSidebar({ role, className, restrictedFromRoles = ['viewer', 'support'] }: AdminSidebarProps) {
  const pathname = usePathname();
  const params = useParams();

  // Locale detection for global multi-currency/multi-location logic
  const locale = params?.locale || 'en';

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ email?: string | null } | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Persistence logic for the "Business OS" feel
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        setCollapsed(JSON.parse(saved));
      }
    } catch {
      // Corrupted or inaccessible storage — fall back to the default expanded state.
    }
    setMounted(true);
  }, []);

  // Resolve the current admin's session for the identity footer
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setSessionUser(data?.user ? { email: data.user.email } : null);
    });
    return () => { active = false; };
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + B toggles the sidebar, matching common admin-tool conventions
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const newState = !prev;
      try {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
      } catch {
        // Non-fatal — collapse state simply won't persist across reloads.
      }
      return newState;
    });
  };

  const displayRole = useMemo(() => {
    const r = role?.toLowerCase() || 'architect';
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [role]);

  const isRestrictedForRole = useMemo(
    () => restrictedFromRoles.includes((role || '').toLowerCase()),
    [restrictedFromRoles, role]
  );

  const visibleItems = useMemo(
    () => MENU_ITEMS.filter(item => !item.restricted || !isRestrictedForRole),
    [isRestrictedForRole]
  );

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch {
      setIsSigningOut(false);
    }
  };

  // Prevent hydration flicker in the Admin environment
  if (!mounted) {
    return <aside className={cn("bg-white border-r border-slate-200 h-full w-64", className)} />;
  }

  return (
    <aside
      className={cn(
        'relative bg-white border-r border-slate-200 flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-40 shadow-sm',
        collapsed ? 'w-[80px]' : 'w-72',
        className
      )}
      aria-label="BBU1 Admin Navigation"
    >
      {/* 1. HEADER: BRANDING & ROLE ACCESS */}
      <div className="flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between min-h-[80px]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                <ShieldCheck size={16} className="text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 leading-none">
                  Secure Access
                </span>
                <span className="text-xs font-bold text-slate-400 mt-1.5">
                  {displayRole} Mode
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            title="Toggle sidebar (⌘B)"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              "p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all border border-slate-200 active:scale-90",
              collapsed && "mx-auto"
            )}
          >
            <ChevronLeft
              size={18}
              className={cn('transition-transform duration-500', collapsed ? 'rotate-180' : 'rotate-0')}
            />
          </button>
        </div>

        {/* LOGO AREA - CLEAN WHITE THEME */}
        <div className={cn('p-8 shrink-0', collapsed ? 'text-center px-0' : '')}>
          <div className="relative inline-block">
            <h2 className={cn(
              'font-black text-slate-900 tracking-tighter transition-all duration-500',
              collapsed ? 'text-sm' : 'text-2xl'
            )}>
              SOV<span className="text-blue-600">{collapsed ? 'Q' : 'EREIGN_HQ'}</span>
            </h2>
            {!collapsed && (
              <div className="absolute -bottom-2 left-0 h-1 w-12 bg-blue-600 rounded-full opacity-20" />
            )}
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION LINKS: THE CORE ENGINE */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 space-y-2 custom-scrollbar py-4">
        {visibleItems.map((item, idx) => {
          const dynamicHref = `/${locale}${item.href}`;
          const isActive = pathname === dynamicHref || (item.href !== '/' && pathname?.startsWith(dynamicHref));
          const Icon = item.icon;
          const isFirstRestricted = item.restricted && !visibleItems[idx - 1]?.restricted;

          return (
            <React.Fragment key={item.href}>
              {isFirstRestricted && (
                <div className={cn("flex items-center gap-2 pt-3 pb-1", collapsed ? "justify-center px-0" : "px-4")}>
                  <div className="h-px flex-1 bg-slate-100" />
                  {!collapsed && <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Caution</span>}
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
              )}

              <Link
                href={dynamicHref}
                aria-current={isActive ? 'page' : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  'group relative flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300',
                  isActive
                    ? item.restricted
                      ? 'bg-rose-600 text-white shadow-xl shadow-rose-100'
                      : 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                    : item.restricted
                      ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                  collapsed ? 'justify-center' : ''
                )}
              >
                <div className="relative">
                  <Icon
                    size={20}
                    className={cn(
                      'shrink-0 transition-transform duration-300 group-hover:scale-110',
                      isActive ? 'text-white' : item.restricted ? 'text-rose-400 group-hover:text-rose-600' : 'text-slate-400 group-hover:text-blue-600'
                    )}
                  />
                </div>

                {!collapsed && (
                  <span className="truncate animate-in fade-in slide-in-from-left-3 duration-500">
                    {item.label}
                  </span>
                )}

                {/* ACTIVE INDICATOR */}
                {isActive && !collapsed && (
                  <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full" />
                )}

                {/* FLOATING TOOLTIP FOR COLLAPSED STATE */}
                {collapsed && (
                  <div className="absolute left-full ml-6 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap z-50 shadow-2xl border border-white/10 translate-x-[-10px] group-hover:translate-x-0">
                    {item.label}
                  </div>
                )}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* 3. FOOTER: SESSION IDENTITY & SYSTEM INFRASTRUCTURE */}
      <div className="p-6 border-t border-slate-100 space-y-4 bg-slate-50/50">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-1 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Cpu size={14} className="text-slate-300" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Core V10.2.4 Active
            </span>
          </div>
        )}

        {/* SESSION IDENTITY */}
        {!collapsed && sessionUser?.email && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0">
              {sessionUser.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-800 truncate">{sessionUser.email}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">{displayRole}</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              {isSigningOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            </button>
          </div>
        )}

        {collapsed && sessionUser?.email && (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-full flex items-center justify-center p-2.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            {isSigningOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          </button>
        )}

        <Link
          href={`/${locale}/dashboard`}
          className={cn(
            'flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all group',
            collapsed ? 'justify-center' : ''
          )}
        >
          <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-blue-50 transition-colors">
            <LayoutDashboard size={18} className="shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                Tenant Portal
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Exit Admin</span>
            </div>
          )}
        </Link>

        {!collapsed && (
          <div className="mt-4 px-4 py-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-1.5 rounded-lg">
                <Fingerprint size={16} className="text-blue-600" />
              </div>
              <span className="text-[9px] text-slate-900 font-black uppercase leading-tight tracking-tighter">
                Forensic Terminal<br />
                <span className="text-blue-600">Encrypted Signal</span>
              </span>
            </div>
            <div className="flex items-center gap-0.5 text-slate-300" title="Toggle sidebar">
              <Command size={11} />
              <span className="text-[9px] font-black">B</span>
            </div>
          </div>
        )}
      </div>

      {/* CUSTOM SCROLLBAR CSS */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </aside>
  );
}