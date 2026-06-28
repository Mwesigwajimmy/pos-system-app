/**
 * --- LOGISTICS DISPATCH PAGE ---
 * PATH: /distribution/dispatch
 * Use: Shipment confirmation and dispatch management
 */

import DispatchWorkbench from "@/components/distribution/DispatchWorkbench";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function DispatchPage({ params: { locale } }: { params: { locale: string } }) {
  
  // 1. Initialize Database Client
  const supabase = await createClient(await cookies());
  
  // 2. Authentication Check
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  return (
    <main className="flex-1 bg-slate-50/20 min-h-screen">
      <div className="max-w-[1450px] mx-auto p-6 md:p-10 space-y-6">
        
        {/* SUBTLE NAVIGATION */}
        <div className="flex items-center justify-start">
            <Link 
                href={`/${locale}/distribution`} 
                className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors group"
            >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Back to Logistics</span>
            </Link>
        </div>

        {/* 
            The main header has been removed from this page file.
            The DispatchWorkbench component will manage its own 
            title and interface to ensure a clean, non-duplicate layout.
        */}
        <div className="animate-in fade-in duration-700">
            <DispatchWorkbench businessId={profile.business_id} />
        </div>
      </div>
    </main>
  );
}