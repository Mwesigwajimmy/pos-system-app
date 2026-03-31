import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AuraLogisticsMaster from "@/components/distribution/AuraLogisticsMaster";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function AuraMasterPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = await createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
  if (!profile?.business_id) return <div className="p-8 text-red-500 font-bold uppercase tracking-widest text-xs">Entity Context Missing.</div>;

  return (
    <div className="flex-1 min-h-screen bg-slate-50/50">
      <Suspense fallback={
        <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Sovereign Node...</span>
        </div>
      }>
        <AuraLogisticsMaster />
      </Suspense>
    </div>
  );
}