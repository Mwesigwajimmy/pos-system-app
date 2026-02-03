"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Zap, Building2, Activity, Banknote, 
  ChevronLeft, ShieldCheck,LayoutDashboard 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/admin/command-center', label: 'War Room', icon: Zap },
    { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
    { href: '/admin/telemetry', label: 'Telemetry', icon: Activity },
    { href: '/admin/billing', label: 'Cashflow', icon: Banknote },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-white/5 flex flex-col h-full">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest text-[10px] mb-2">
           <ShieldCheck size={12} /> Architect Access
        </div>
        <h2 className="text-xl font-black text-white italic">SOVEREIGN<span className="text-blue-600">_HQ</span></h2>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              pathname.includes(item.href) 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}>
              <item.icon size={18} />
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <Link href="/dashboard">
          <div className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
            <LayoutDashboard size={14} /> Exit to Tenant UI
          </div>
        </Link>
      </div>
    </aside>
  );
}