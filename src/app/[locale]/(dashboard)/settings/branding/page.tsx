import React from 'react';
import type { Metadata } from 'next';
import BrandingManager from '@/components/settings/BrandingManager';
import Link from 'next/link';
import { ChevronRight, Building2, Sparkles, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Identity Broadcast Hub | BBU1 Sovereign Settings',
  description: 'Manage corporate branding, stationery protocols, and global document identity.',
};

export default function BrandingPage({ params: { locale } }: { params: { locale: string } }) {
    return (
        <div className="flex-1 space-y-10 p-6 md:p-12 bg-slate-50/30 min-h-screen animate-in fade-in slide-in-from-bottom-2 duration-1000">
            
            {/* --- PROFESSIONAL BREADCRUMB NAVIGATION --- */}
            <nav aria-label="breadcrumb" className="flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                <Link href={`/${locale}/settings`} className="hover:text-blue-600 transition-colors">System Settings</Link>
                <ChevronRight className="h-3 w-3 mx-2 opacity-50" />
                <span className="text-slate-900" aria-current="page">
                    Branding & Identity
                </span>
            </nav>

            {/* --- MASTER PAGE HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-12">
                <div className="space-y-4">
                    <div className="flex items-center gap-6">
                        <div className="bg-slate-900 p-5 rounded-[2rem] shadow-2xl text-white transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Building2 size={40} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Identity Hub</h1>
                                <Badge className="bg-blue-600 text-white font-black px-4 py-1.5 text-[10px] tracking-widest uppercase rounded-full shadow-lg">
                                    Global Broadcast
                                </Badge>
                            </div>
                            <p className="text-slate-500 font-bold text-sm mt-2 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Sparkles size={16} className="text-blue-600"/> 
                                Automatic Branding Synchronization Engine
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- COMPLIANCE STATUS --- */}
                <div className="hidden lg:flex items-center gap-6 bg-white px-10 py-5 rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden group">
                    <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center shadow-inner group-hover:bg-blue-50 transition-colors">
                        <ShieldCheck size={28} className="text-emerald-600 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Identity Security</span>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">Verified Sovereign Data</span>
                    </div>
                </div>
            </header>

            {/* --- THE MASTER MANAGER MOUNT --- */}
            <div className="mx-auto max-w-[1400px]">
                <BrandingManager />
            </div>

            {/* --- PAGE FOOTER AUDIT --- */}
            <footer className="text-center pt-12 opacity-30">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
                    BBU1 Identity Protocol • Encrypted Branding Assets • Neural Sync Active
                </p>
            </footer>
        </div>
    );
}