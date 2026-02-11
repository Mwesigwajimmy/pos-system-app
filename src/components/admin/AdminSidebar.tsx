"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Zap, Building2, Activity, Banknote, 
  ChevronLeft, ShieldCheck, LayoutDashboard,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 1. Define strict types for the menu configuration
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

const MENU_ITEMS: MenuItem[] = [
  { href: '/admin/command-center', label: 'War Room', icon: Zap },
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/telemetry', label: 'Telemetry', icon: Activity },
  { href: '/admin/billing', label: 'Cashflow', icon: Banknote },
];

export default function AdminSidebar({ role, className }: AdminSidebarProps) {
  const pathname = usePathname();
  
  // 2. State Management with Persistence
  // We initialize as false and use useEffect to sync with localStorage 
  // to avoid hydration mismatch between server and client.
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  // 3. Memoize computed values for performance
  const displayRole = useMemo(() => {
    const r = role?.toLowerCase() || 'architect';
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [role]);

  // Prevent hydration flicker: renders a shell or a specific state until mounted
  if (!mounted) {
    return <aside className={cn("bg-slate-900 border-r border-white/5 h-full w-64", className)} />;
  }

  return (
    <aside
      className={cn(
        'relative bg-slate-900 border-r border-white/5 flex flex-col h-full transition-all duration-300 ease-in-out z-40',
        collapsed ? 'w-20' : 'w-64',
        className
      )}
      aria-label="Admin side navigation"
    >
      {/* Header Section */}
      <div className="flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center justify-between min-h-[70px]">
          {!collapsed && (
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-tighter animate-in fade-in duration-500">
              <ShieldCheck size={14} className="shrink-0" />
              <span className="text-[10px] whitespace-nowrap">{displayRole} Access</span>
            </div>
          )}
          
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all",
              collapsed && "mx-auto"
            )}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ChevronLeft
              size={18}
              className={cn('transition-transform duration-300', collapsed ? 'rotate-180' : 'rotate-0')}
            />
          </button>
        </div>

        <div className={cn('p-6 shrink-0', collapsed ? 'text-center px-0' : '')}>
          <h2 className={cn(
            'font-black italic text-white tracking-tighter transition-all',
            collapsed ? 'text-xs' : 'text-xl'
          )}>
            SOV<span className="text-blue-600">{collapsed ? 'Q' : 'EREIGN_HQ'}</span>
          </h2>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-1 custom-scrollbar">
        {MENU_ITEMS.map((item) => {
          // Precise matching for active states
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
                collapsed ? 'justify-center' : ''
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} className={cn('shrink-0', isActive ? 'animate-pulse' : '')} />
              
              {!collapsed && (
                <span className="truncate animate-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              )}

              {/* Tooltip for collapsed state (Enterprise Standard) */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-white/10">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-white/5 mt-auto">
        <Link 
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all group',
            collapsed ? 'justify-center' : ''
          )}
        >
          <LayoutDashboard size={18} className="shrink-0 text-slate-600 group-hover:text-blue-400 transition-colors" />
          {!collapsed && (
            <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
              Exit to Tenant UI
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}