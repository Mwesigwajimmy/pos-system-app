import React from 'react';
import type { Metadata } from 'next';
import BrandingManager from '@/components/settings/BrandingManager';

export const metadata: Metadata = {
  title: 'Branding Settings | Business Manager',
  description: 'Manage corporate branding, stationery details, and global document identity.',
};

export default function BrandingPage() {
    return (
        /** 
         * CLEAN PROFESSIONAL LAYOUT
         * Removed the top header and breadcrumbs to focus entirely on the branding form.
         * The background is a soft, clean slate-white.
         */
        <div className="flex-1 p-6 md:p-12 bg-slate-50/30 min-h-screen animate-in fade-in duration-700">
            
            {/* --- MAIN CONTENT AREA --- */}
            <div className="mx-auto max-w-[1400px]">
                {/* 
                  The BrandingManager now sits at the top of the page 
                  providing a direct, clean user experience.
                */}
                <BrandingManager />
            </div>

            {/* --- PAGE FOOTER --- */}
            <footer className="py-20 opacity-20">
                <div className="flex justify-center items-center gap-6">
                    <div className="h-[1px] w-16 bg-slate-300" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                        Standard Identity Protocol
                    </p>
                    <div className="h-[1px] w-16 bg-slate-300" />
                </div>
            </footer>
        </div>
    );
}