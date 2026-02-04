"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Zap, Building2, Activity, Banknote, 
  ChevronLeft, ShieldCheck, LayoutDashboard 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Normalize role to lowercase (matches your backend)
  const normalizedRole = (role ?? '').toLowerCase();
  const displayRole =
    normalizedRole.length > 0
      ? normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)
      : 'Architect';

  const menuItems = [
    { href: '/admin/command-center', label: 'War Room', icon: Zap },
    { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
    { href: '/admin/telemetry', label: 'Telemetry', icon: Activity },
    { href: '/admin/billing', label: 'Cashflow', icon: Banknote },
  ];

  return (
    <aside
      className={cn(
        'bg-slate-900 border-r border-white/5 flex flex-col h-full transition-all',
        collapsed ? 'w-20' : 'w-64'
      )}
      aria-label="Admin sidebar"
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between gap-2">
        <div className={cn('flex items-center gap-2', collapsed ? 'justify-center w-full' : '')}>
          <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest text-[10px]">
            <ShieldCheck size={12} />
            {!collapsed && <span>{displayRole} Access</span>}
          </div>
        </div>

        {/* Collapse / Expand button — uses ChevronLeft so the import is used */}
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-white/5 transition-colors"
        >
          <ChevronLeft
            size={16}
            className={cn(
              'transition-transform',
              collapsed ? 'rotate-180' : 'rotate-0'
            )}
          />
        </button>
      </div>

      <div className={cn('p-4', collapsed ? 'px-2' : '')}>
        <h2 className={cn('text-xl font-black italic text-white', collapsed ? 'sr-only' : '')}>
          SOVEREIGN<span className="text-blue-600">_HQ</span>
        </h2>
      </div>

      <nav className={cn('flex-1 p-2 space-y-1', collapsed ? 'px-1' : 'p-4')} aria-label="Admin navigation">
        {menuItems.map((item) => {
          const isActive = pathname?.startsWith(item.href) ?? false;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
                collapsed ? 'justify-center' : ''
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <Link href="/dashboard">
          <div className={cn(
            'flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest',
            collapsed ? 'justify-center' : ''
          )}>
            <LayoutDashboard size={14} />
            {!collapsed && <span>Exit to Tenant UI</span>}
          </div>
        </Link>
      </div>
    </aside>
  );
}