import React, { Suspense } from "react";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import GlobalMarketScout from "@/components/distribution/GlobalMarketScout";
import { Loader2, Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";

// --- Enterprise Metadata ---
export const metadata: Metadata = {
  title: "Market Intelligence Scout | Sovereign Logistics",
  description: "Live competitive signaling and global commodity price monitoring hub.",
};

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function MarketIntelPage({ params }: PageProps) {
  // 1. Resolve Params & Cookies
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
    <div className="flex-1 p-4 md:p-10 pt-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Dynamic Header Area */}
      <div className="space-y-4">
        <Link 
          href={`/${locale}/distribution`}
          className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-emerald-500 transition-colors"
        >
          <ArrowLeft size={12} className="mr-2" /> Back to Operations
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <Globe className="text-emerald-500 animate-pulse" size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900">
              Market Intelligence <span className="text-emerald-500">Scout</span>
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Live Competitive Signal Engine • Sovereign Link Active
            </p>
          </div>
        </div>
      </div>

      {/* Main Intelligence View */}
      <Suspense fallback={
        <div className="bg-slate-950 rounded-[2.5rem] p-24 flex flex-col items-center justify-center gap-6 border border-white/5">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <div className="text-center space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-[0.4em] text-white">Scouring Global Nodes...</span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-500 italic font-mono">Syncing with SEARXNG_CORE</span>
            </div>
        </div>
      }>
        <div className="min-h-[700px]">
             <GlobalMarketScout />
        </div>
      </Suspense>

      {/* Security Compliance Footer */}
      <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-300">
        <p className="text-[9px] font-bold uppercase tracking-widest">
          Sovereign Signal Strength: 99.8% (Encrypted Feed)
        </p>
        <p className="text-[9px] font-medium italic">
          Protocol: SEARXNG-V1 | Node: {profile.business_id.substring(0,8).toUpperCase()}
        </p>
      </div>
    </div>
  );
}