import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ForensicCustomsHub from "@/components/distribution/ForensicCustomsHub";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function CustomsHubPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = await createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (!profile?.business_id) {
    return (
      <div className="p-8 text-sm font-medium text-slate-500">
        Access Denied: Business profile not identified.
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-10 bg-slate-50/20 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        {/* 
            The header has been removed from this page file to allow 
            the CustomsHub component to manage the title, 
            preventing duplicate headings.
        */}
        <Suspense fallback={
          <div className="bg-white rounded-2xl p-24 border border-slate-100 flex flex-col items-center justify-center gap-4 shadow-sm">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Loading Customs Records...
            </span>
          </div>
        }>
          <ForensicCustomsHub />
        </Suspense>
      </div>
    </main>
  );
}