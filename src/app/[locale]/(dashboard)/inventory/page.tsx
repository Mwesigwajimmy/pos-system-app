import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
    Boxes, Tags, BookOpen, ShieldCheck, 
    Zap, Activity, Fingerprint, Plus, LayoutDashboard
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- CORE MODULE COMPONENTS ---
import InventoryDataTable from "@/components/inventory/InventoryDataTable";
import CategoriesView from '@/components/inventory/CategoriesView';
import CompositesView from '@/components/inventory/CompositesView';
import { columns } from "@/components/inventory/columns";

/**
 * SOVEREIGN INVENTORY COMMAND CENTER
 * v10.2.4 - Enterprise Grade Multi-Tenant Orchestrator
 */
export default async function InventoryPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. HARD SECURITY AUTHENTICATION GUARD
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // 2. MASTER IDENTITY RESOLUTION
  // Resolving business_id from the 'profiles' table to ensure multi-tenant isolation.
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Alert variant="destructive" className="border-2 shadow-lg">
                <Activity className="h-5 w-5" />
                <AlertTitle className="font-black uppercase tracking-widest">Fiduciary Context Panic</AlertTitle>
                <AlertDescription className="mt-2 font-medium">
                    The Sovereign Engine could not resolve a Master Business ID for this session. 
                    Stock ledger access has been physically suspended.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  // 3. ENTERPRISE DATA FETCH (Surgically Aligned with Backend Signatures)
  // We fetch initial products and categories in parallel for high-performance hydration.
  const [productsResult, categoriesResult] = await Promise.all([
    supabase.rpc('get_paginated_products', {
      p_page: 1,
      p_page_size: 15,
      p_search_text: null,
      p_business_entity_id: profile.business_id,
      // ALIGNMENT FIX: Including the 5th parameter forces Postgres to pick 
      // the modern JSONB candidate, stopping the "Candidate Error" crash.
      p_location_id: null 
    }),
    supabase
        .from('categories')
        .select('id, name, description')
        .eq('business_id', profile.business_id)
        .order('name', { ascending: true })
  ]);

  // Handle potential ledger sync errors
  if (productsResult.error) console.error("Ledger Sync Failure:", productsResult.error.message);
  if (categoriesResult.error) console.error("Categorical Sync Failure:", categoriesResult.error.message);

  const initialData = productsResult.data?.products ?? [];
  const totalCount = productsResult.data?.total_count ?? 0;
  const categories = categoriesResult.data ?? [];

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8 pt-6 animate-in fade-in duration-1000">
      
      {/* --- ENTERPRISE DASHBOARD HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8">
        <div className="space-y-1">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl shadow-lg">
                    <Boxes className="text-primary w-8 h-8" />
                </div>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">
                    Inventory Command
                </h1>
            </div>
            <p className="text-muted-foreground font-medium mt-2">
                Unified Fiduciary Control for: <span className="font-black text-slate-900 underline decoration-primary/30 underline-offset-4">{profile.business_name}</span>
            </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
             <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3">
                <Zap size={14} className="text-emerald-400 fill-current animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest font-mono">Robotic Kernel: v10.2.4</span>
             </div>
             <Button variant="secondary" className="h-12 px-6 font-black uppercase tracking-widest shadow-xl rounded-xl hover:scale-105 transition-all" asChild>
                <Link href="/inventory/adjustments">
                    <Plus size={16} className="mr-2" /> New Adjustment
                </Link>
             </Button>
        </div>
      </div>

      {/* --- MASTER OPERATIONAL TABS --- */}
      <Tabs defaultValue="products" className="w-full space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <TabsList className="inline-flex h-14 items-center justify-center rounded-2xl bg-muted p-1.5 text-muted-foreground grid grid-cols-3 w-full md:w-[650px] border shadow-inner">
                <TabsTrigger value="products" className="rounded-xl font-black uppercase text-[10px] tracking-widest flex gap-2 h-11 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xl transition-all">
                    <Boxes className="h-4 w-4" /> Stock Ledger
                </TabsTrigger>
                <TabsTrigger value="categories" className="rounded-xl font-black uppercase text-[10px] tracking-widest flex gap-2 h-11 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xl transition-all">
                    <Tags className="h-4 w-4" /> Global Categories
                </TabsTrigger>
                <TabsTrigger value="composites" className="rounded-xl font-black uppercase text-[10px] tracking-widest flex gap-2 h-11 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-xl transition-all">
                    <BookOpen className="h-4 w-4" /> Sourcing Recipes
                </TabsTrigger>
            </TabsList>

            <div className="hidden xl:flex items-center gap-2 px-4 py-1.5 bg-slate-50 border rounded-full">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">ISA-700 / ISO-27001 Protocol</span>
            </div>
        </div>

        {/* --- TAB CONTENT: PRODUCT REGISTRY --- */}
        <TabsContent value="products" className="mt-0 outline-none animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2.5rem] p-1 shadow-2xl shadow-slate-200/60 border border-slate-100">
              <InventoryDataTable
                columns={columns}
                initialData={initialData}
                totalCount={totalCount}
                categories={categories}
                businessEntityId={profile.business_id}
              />
          </div>
        </TabsContent>

        {/* --- TAB CONTENT: GLOBAL CATEGORIES --- */}
        <TabsContent value="categories" className="mt-0 outline-none animate-in slide-in-from-bottom-4 duration-500">
            <CategoriesView />
        </TabsContent>

        {/* --- TAB CONTENT: COMPOSITE ORCHESTRATOR --- */}
        <TabsContent value="composites" className="mt-0 outline-none animate-in slide-in-from-bottom-4 duration-500">
            <CompositesView />
        </TabsContent>
      </Tabs>

      {/* --- FIDUCIARY AUDIT FOOTER --- */}
      <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
                <Fingerprint size={18} className="text-slate-500" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 leading-none">Chain of Custody</span>
                <span className="text-[9px] font-medium text-slate-400 mt-1 uppercase">Ledger Sealed by Sovereign Kernel v10.2</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-slate-500">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-md">
                <LayoutDashboard size={12} />
                ENTITY_PERIMETER: {profile.business_id.substring(0,12).toUpperCase()}
            </div>
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-md">
                <Activity size={12} />
                TENANT_ID: {profile.tenant_id.substring(0,8).toUpperCase()}
            </div>
          </div>
      </div>
    </main>
  );
}