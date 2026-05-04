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

  // 1. Authoritative Authentication Guard
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // 2. Master Identity Resolution
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect('/dashboard');

  // 3. Parallel Data Fetching for Performance
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
      {/* THE FIX: 'mx-auto' keeps the UI centered, 'max-w' prevents it from stretching off-screen on large displays */}
      <div className="max-w-[1600px] mx-auto py-8 px-6 md:px-10 lg:px-12 space-y-8 animate-in fade-in duration-500">
        
        {/* --- PROFESSIONAL HEADER SECTION --- */}
        <div className="flex flex-col space-y-2 border-b border-slate-50 pb-6">
            <div className="flex items-center gap-2 text-blue-600">
                <Activity size={16} className="animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Industrial Asset Registry</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter text-slate-900">Product Inventory</h1>
            <p className="text-slate-500 text-sm font-medium">
                Corporate repository for finished goods and specialized inventory assets for <span className="text-slate-900 font-bold">{profile.business_name}</span>.
            </p>
        </div>

        {/* --- GLOBAL SEARCH TERMINAL --- */}
        <div className="relative max-w-2xl group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <div className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-400 font-medium shadow-sm group-focus-within:bg-white group-focus-within:border-blue-200 transition-all">
                Search registry by identifier or specification...
            </div>
        </div>

        {/* --- CORE DATA TABLE SECTION --- */}
        <div className="pt-4 space-y-6">
            <div className="flex items-center gap-2 opacity-40">
                <ShieldCheck size={14} className="text-blue-600" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Distributed Asset Protocol Active</span>
            </div>

            {/* 
                This component now handles its own internal layout. 
                The buttons (Add Product / Import) will now align correctly to the right 
                because this parent container is properly centered. 
            */}
            <InventoryDataTable
                columns={columns}
                initialData={initialData}
                totalCount={totalCount}
                categories={categories}
                businessEntityId={profile.business_id}
            />
        </div>

        {/* --- FOOTER METADATA --- */}
        <footer className="pt-20 pb-12">
            <div className="flex justify-center items-center gap-4 opacity-20">
                 <div className="h-px w-24 bg-slate-300" />
                 <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">
                    System Sync: High Integrity
                 </span>
                 <div className="h-px w-24 bg-slate-300" />
            </div>
        </footer>
      </div>
    </main>
  );
}