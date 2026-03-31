import React, { Suspense } from "react";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import CargoManifestEntry from "@/components/distribution/CargoManifestEntry";
import { Loader2, Anchor, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

// --- Enterprise Metadata ---
export const metadata: Metadata = {
  title: "Global Cargo Manifest | Sovereign Logistics",
  description: "International freight registry and ASYCUDA-ready manifest declaration terminal.",
};

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function ManifestEntryPage({ params }: PageProps) {
  // 1. Resolve Params & Cookies for Server Handshake
  const { locale } = params;
  const supabase = await createClient(await cookies());

  // 2. SECURE AUTHENTICATION
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // 3. SOVEREIGN CONTEXT RESOLUTION
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  return (
    <div className="flex-1 min-h-screen bg-slate-50/30 animate-in fade-in duration-500">
      
      {/* 4. DYNAMIC HEADER BLOCK */}
      <div className="p-4 md:p-10 pb-0 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-4">
                <Link 
                    href={`/${locale}/distribution`}
                    className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors"
                >
                    <ArrowLeft size={12} className="mr-2" /> Back to Operations
                </Link>
                
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-950 rounded-2xl shadow-xl text-blue-400">
                        <Anchor size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900">
                            Manifest <span className="text-blue-600">Entry</span>
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Trade Compliance Node: {profile.business_id.substring(0,8).toUpperCase()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Live Security Badge */}
            <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                        Compliance Bridge
                    </span>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <ShieldCheck size={12} className="text-emerald-500" /> Statutory Sync Active
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* 5. MAIN INTERFACE WITH SUSPENSE */}
      <Suspense fallback={
        <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <div className="text-center space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">Initializing Trade Registry...</span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 italic">Syncing Port Authority Data Tables</span>
            </div>
        </div>
      }>
        <div className="pb-20">
             <CargoManifestEntry />
        </div>
      </Suspense>

      {/* 6. SOVEREIGN SYSTEM FOOTER */}
      <div className="container mx-auto px-10 pb-10 border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-300">
        <p className="text-[9px] font-bold uppercase tracking-[0.4em]">
          BBU1-LOGISTICS-OS V10.2 • Forensic Audit Protocol
        </p>
        <p className="text-[9px] font-medium italic">
          Manifest Integrity: 99.9% | Forensic ID: {profile.business_id.split('-')[0].toUpperCase()}
        </p>
      </div>
    </div>
  );
}