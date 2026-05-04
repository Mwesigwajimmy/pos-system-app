"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
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
  Fingerprint
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

// --- TYPES ---

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface AdminSidebarProps {
  role: string;
  className?: string;
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
  { href: '/sovereign-control', label: 'Sovereign Control', icon: ShieldAlert },
];

export default function AdminSidebar({ role, className }: AdminSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  
  // Locale detection for global multi-currency/multi-location logic
  const locale = params?.locale || 'en';

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Persistence logic for the "Business OS" feel
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(JSON.parse(saved));
    }
    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
      return newState;
    });
  };

  const displayRole = useMemo(() => {
    const r = role?.toLowerCase() || 'architect';
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [role]);

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
        {MENU_ITEMS.map((item) => {
          const dynamicHref = `/${locale}${item.href}`;
          const isActive = pathname === dynamicHref || (item.href !== '/' && pathname?.startsWith(dynamicHref));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={dynamicHref}
              className={cn(
                'group relative flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300',
                isActive
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                collapsed ? 'justify-center' : ''
              )}
            >
              <div className="relative">
                <Icon size={20} className={cn('shrink-0 transition-transform duration-300 group-hover:scale-110', isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600')} />
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
          );
        })}
      </nav>

      {/* 3. FOOTER: SYSTEM INFRASTRUCTURE */}
      <div className="p-6 border-t border-slate-100 space-y-4 bg-slate-50/50">
        {!collapsed && (
            <div className="flex items-center gap-3 px-2 py-1 mb-2">
                <Cpu size={14} className="text-slate-300" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Core V10.2.4 Active
                </span>
            </div>
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
            <div className="mt-4 px-4 py-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm">
                <div className="bg-blue-50 p-1.5 rounded-lg">
                    <Fingerprint size={16} className="text-blue-600" />
                </div>
                <span className="text-[9px] text-slate-900 font-black uppercase leading-tight tracking-tighter">
                    Forensic Terminal<br/>
                    <span className="text-blue-600">Encrypted Signal</span>
                </span>
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