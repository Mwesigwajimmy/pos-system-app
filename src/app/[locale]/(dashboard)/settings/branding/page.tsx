import React from 'react';
import type { Metadata } from 'next';
import BrandingManager from '@/components/settings/BrandingManager';
import Link from 'next/link';
import { ChevronRight, Building2, Sparkles, ShieldCheck, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Branding Settings | Business Manager',
  description: 'Manage corporate branding, stationery details, and global document identity.',
};

export default function BrandingPage({ params: { locale } }: { params: { locale: string } }) {
    return (
        <div className="flex-1 space-y-10 p-6 md:p-10 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
            
            {/* --- BREADCRUMB NAVIGATION --- */}
            <nav aria-label="breadcrumb" className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400">
                <Link href={`/${locale}/settings`} className="hover:text-blue-600 transition-colors">Settings</Link>
                <ChevronRight className="h-3 w-3 mx-2 opacity-40" />
                <span className="text-slate-900" aria-current="page">
                    Branding & Identity
                </span>
            </nav>

            {/* --- PAGE HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-200 pb-10">
                <div className="flex items-center gap-6">
                    <div className="bg-slate-900 p-4 rounded-xl shadow-sm text-white">
                        <Palette size={32} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Branding & Identity</h1>
                            <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50/50 font-bold px-3 py-0.5 text-[10px] uppercase tracking-wide">
                                Active Session
                            </Badge>
                        </div>
                        <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
                            Manage your corporate identity and document visual standards.
                        </p>
                    </div>
                </div>

                {/* --- COMPLIANCE STATUS --- */}
                <div className="hidden lg:flex items-center gap-5 bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner">
                        <ShieldCheck size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Security</span>
                        <span className="text-sm font-bold text-slate-700 mt-0.5">System Verified</span>
                    </div>
                </div>
            </header>

            {/* --- CONTENT AREA --- */}
            <div className="mx-auto max-w-[1500px]">
                {/* Logic remains untouched in the component mount */}
                <BrandingManager />
            </div>

            {/* --- PAGE FOOTER --- */}
            <footer className="py-12 opacity-30">
                <div className="flex justify-center items-center gap-4">
                    <div className="h-[1px] w-12 bg-slate-400" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Standard Identity Protocol • Version 5.2
                    </p>
                    <div className="h-[1px] w-12 bg-slate-400" />
                </div>
            </footer>
        </div>
    );
}