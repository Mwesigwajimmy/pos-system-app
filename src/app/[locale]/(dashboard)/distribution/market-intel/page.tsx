import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import GlobalMarketScout from "@/components/distribution/GlobalMarketScout";
import { Suspense } from "react";
import { Loader2, Globe } from "lucide-react";

export default async function MarketIntelPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = await createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  return (
    <div className="flex-1 p-4 md:p-10 pt-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Globe className="text-emerald-500 animate-pulse" size={32} />
        <div>
            <h2 className="text-3xl font-black tracking-tighter uppercase">Market Intelligence Scout</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Live Competitive Signal Engine</p>
        </div>
      </div>

      <Suspense fallback={
        <div className="bg-slate-950 rounded-[2rem] p-24 flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <div className="text-center space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-[0.4em] text-white">Scouring Global Nodes...</span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-500 italic">Syncing with SEARXNG_CORE</span>
            </div>
        </div>
      }>
        <div className="h-[700px]">
             <GlobalMarketScout />
        </div>
      </Suspense>
    </div>
  );
}