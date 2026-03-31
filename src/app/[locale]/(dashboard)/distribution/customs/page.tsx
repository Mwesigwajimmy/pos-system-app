import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ForensicCustomsHub from "@/components/distribution/ForensicCustomsHub";
import { Suspense } from "react";
import { Loader2, Fingerprint } from "lucide-react";

export default async function CustomsHubPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = await createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
  if (!profile?.business_id) return <div className="p-8">Access Denied: No Sovereign Context.</div>;

  return (
    <div className="flex-1 p-4 md:p-10 pt-6 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Fingerprint className="text-blue-600" size={32} />
        <div>
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Customs Forensic Terminal</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ASYCUDA Bridge & Statutory Audit</p>
        </div>
      </div>

      <Suspense fallback={
        <div className="bg-white rounded-[2rem] p-20 border border-slate-100 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Connecting to Customs Registry...</span>
        </div>
      }>
        <ForensicCustomsHub />
      </Suspense>
    </div>
  );
}