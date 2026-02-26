import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
    Boxes, Tags, BookOpen, ShieldCheck, 
    Zap, Activity, Fingerprint, Plus 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// CORE COMPONENTS
import InventoryDataTable from "@/components/inventory/InventoryDataTable";
import CategoriesView from '@/components/inventory/CategoriesView';
import CompositesView from '@/components/inventory/CompositesView';
import { columns } from "@/components/inventory/columns";

export default async function InventoryPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. HARD SECURITY AUTHENTICATION GUARD
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // 2. MASTER IDENTITY RESOLUTION (Absolute Truth)
  // We resolve the business_id to ensure the stock counts are isolated
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return (
        <div className="p-8">
            <Alert variant="destructive">
                <Activity className="h-4 w-4" />
                <AlertTitle>Fiduciary Identity Failure</AlertTitle>
                <AlertDescription>No active business context found for your session.</AlertDescription>
            </Alert>
        </div>
    );
  }

  // 3. ENTERPRISE DATA FETCH (Surgically isolated by Business ID)
  const [productsResult, categoriesResult] = await Promise.all([
    supabase.rpc('get_paginated_products', {
      p_page: 1,
      p_page_size: 15,
      p_search_text: null,
      p_business_entity_id: profile.business_id, // FIXED: Now passing real ID
    }),
    supabase
        .from('categories')
        .select('id, name, description')
        .eq('business_id', profile.business_id), // FIXED: Now filtering categories
  ]);

  const initialData = productsResult.data?.products ?? [];
  const totalCount = productsResult.data?.total_count ?? 0;
  const categories = categoriesResult.data ?? [];

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8 pt-6 animate-in fade-in duration-1000">
      
      {/* Enterprise Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-8">
        <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3 uppercase italic">
                <Boxes className="text-primary w-10 h-10" />
                Inventory Command
            </h1>
            <p className="text-muted-foreground font-medium">
                Unified stock management and fractional ledger control for: <span className="font-black text-slate-900 underline decoration-primary/30 underline-offset-4">{profile.business_name}</span>
            </p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2">
                <Zap size={14} className="text-emerald-400 animate-pulse fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">Robotic Sync: ACTIVE</span>
             </div>
             <Button variant="secondary" className="h-12 font-bold shadow-lg" asChild>
                <Link href="/inventory/adjustments">
                    <Plus size={16} className="mr-2" /> New Adjustment
                </Link>
             </Button>
        </div>
      </div>

      {/* Main Operational Tabs */}
      <Tabs defaultValue="products" className="w-full space-y-6">
        <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground grid grid-cols-3 w-full md:w-[600px] border shadow-sm">
          <TabsTrigger value="products" className="rounded-lg font-bold flex gap-2 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Boxes className="h-4 w-4" /> All Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg font-bold flex gap-2 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Tags className="h-4 w-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="composites" className="rounded-lg font-bold flex gap-2 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BookOpen className="h-4 w-4" /> Composites
          </TabsTrigger>
        </TabsList>

        {/* --- TAB CONTENT: PRODUCTS --- */}
        <TabsContent value="products" className="mt-0 outline-none">
          <div className="bg-white rounded-2xl p-1 shadow-2xl shadow-slate-200/50">
              <InventoryDataTable
                columns={columns}
                initialData={initialData}
                totalCount={totalCount}
                categories={categories}
                businessEntityId={profile.business_id}
              />
          </div>
        </TabsContent>

        {/* --- TAB CONTENT: CATEGORIES --- */}
        <TabsContent value="categories" className="mt-0 outline-none">
            <CategoriesView />
        </TabsContent>

        {/* --- TAB CONTENT: COMPOSITES --- */}
        <TabsContent value="composites" className="mt-0 outline-none">
            <CompositesView />
        </TabsContent>
      </Tabs>

      {/* Forensic Policy Footer */}
      <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            Stock Integrity Sealed by Sovereign Kernel v10.2
          </div>
          <div className="font-mono bg-slate-100 px-2 py-1 rounded">
            ENTITY_PERIMETER: {profile.business_id.substring(0,12).toUpperCase()}
          </div>
      </div>
    </main>
  );
}