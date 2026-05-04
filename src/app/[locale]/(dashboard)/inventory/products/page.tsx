import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { 
    Activity, 
    Search,
    ShieldCheck
} from "lucide-react";

import InventoryDataTable from "@/components/inventory/InventoryDataTable";
import { columns } from "@/components/inventory/columns";

export default async function ProductInventoryPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Auth Guard
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // 2. Profile Resolution
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect('/dashboard');

  // 3. Initial Data Fetching
  const [productsResult, categoriesResult] = await Promise.all([
    supabase.rpc('get_paginated_products', {
      p_page: 1,
      p_page_size: 15,
      p_search_text: null,
      p_business_entity_id: profile.business_id,
      p_location_id: null 
    }),
    supabase
        .from('categories')
        .select('id, name')
        .eq('business_id', profile.business_id)
  ]);

  const initialData = productsResult.data?.products ?? [];
  const totalCount = productsResult.data?.total_count ?? 0;
  const categories = categoriesResult.data ?? [];

  return (
    <main className="min-h-screen bg-white">
      {/* THE FIX: This container centers the UI so it is not pushed to the far right */}
      <div className="max-w-[1600px] mx-auto py-8 px-6 md:px-10 lg:px-12 space-y-8 animate-in fade-in duration-500">
        
        {/* --- HEADER SECTION (From your Screenshot 2) --- */}
        <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
                <Activity size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Industrial Asset Registry</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter text-slate-900">Product Inventory</h1>
            <p className="text-slate-500 text-sm font-medium">
                Corporate repository for finished goods and specialized inventory assets.
            </p>
        </div>

        {/* --- SEARCH BOX (From your Screenshot 2) --- */}
        <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
            </div>
            <div className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-400 font-medium shadow-sm">
                Search registry by identifier or specification...
            </div>
        </div>

        {/* --- DATA TABLE SECTION --- */}
        <div className="pt-4">
            <div className="flex items-center gap-2 mb-6 opacity-40">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Distributed Asset Protocol</span>
            </div>

            {/* Calling your existing Table Component */}
            <InventoryDataTable
                columns={columns}
                initialData={initialData}
                totalCount={totalCount}
                categories={categories}
                businessEntityId={profile.business_id}
            />
        </div>

        {/* --- FOOTER SYNC STATUS --- */}
        <div className="flex justify-center pt-10 opacity-20">
             <div className="h-px w-24 bg-slate-300 mx-4 self-center" />
             <span className="text-[9px] font-bold uppercase tracking-widest">System Sync Active</span>
             <div className="h-px w-24 bg-slate-300 mx-4 self-center" />
        </div>
      </div>
    </main>
  );
}