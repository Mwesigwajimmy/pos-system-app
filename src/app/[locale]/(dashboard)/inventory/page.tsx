import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
    Boxes, Tags, BookOpen, CheckCircle2, 
    Activity, Fingerprint, Plus, LayoutDashboard,
    AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- CORE MODULE COMPONENTS ---
import InventoryDataTable from "@/components/inventory/InventoryDataTable";
import CategoriesView from '@/components/inventory/CategoriesView';
import CompositesView from '@/components/inventory/CompositesView';
import { columns } from "@/components/inventory/columns";

export default async function InventoryPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Authentication Guard
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // 2. Identity Resolution
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Alert variant="destructive" className="border shadow-md rounded-xl">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="font-bold">Account Error</AlertTitle>
                <AlertDescription className="mt-1">
                    Could not resolve a valid business ID for your account. Please contact support.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  // 3. Data Fetching
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
        .select('id, name, description')
        .eq('business_id', profile.business_id)
        .order('name', { ascending: true })
  ]);

  const initialData = productsResult.data?.products ?? [];
  const totalCount = productsResult.data?.total_count ?? 0;
  const categories = categoriesResult.data ?? [];

  return (
    <main className="flex-1 space-y-8 p-6 md:p-10 animate-in fade-in duration-500 bg-slate-50/30">
      
      {/* --- PROFESSIONAL HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-1">
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-600 rounded-lg shadow-sm">
                    <Boxes className="text-white w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Inventory Management
                </h1>
            </div>
            <p className="text-sm text-slate-500 font-medium ml-1">
                Viewing stock for: <span className="font-bold text-slate-900">{profile.business_name}</span>
            </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
             <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System v10.2.4</span>
             </div>
             <Button variant="default" className="bg-blue-600 hover:bg-blue-700 h-10 px-6 font-bold shadow-sm" asChild>
                <Link href="/inventory/adjustments">
                    <Plus size={18} className="mr-2" /> New Adjustment
                </Link>
             </Button>
        </div>
      </div>

      {/* --- NAVIGATION TABS --- */}
      <Tabs defaultValue="products" className="w-full space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <TabsList className="bg-slate-200/50 p-1 rounded-xl w-full md:w-auto border border-slate-200">
                <TabsTrigger value="products" className="rounded-lg font-bold text-xs px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                    <Boxes className="h-4 w-4 mr-2" /> Stock Ledger
                </TabsTrigger>
                <TabsTrigger value="categories" className="rounded-lg font-bold text-xs px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                    <Tags className="h-4 w-4 mr-2" /> Categories
                </TabsTrigger>
                <TabsTrigger value="composites" className="rounded-lg font-bold text-xs px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                    <BookOpen className="h-4 w-4 mr-2" /> Recipes
                </TabsTrigger>
            </TabsList>

            <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secure Environment Active</span>
            </div>
        </div>

        {/* --- STOCK LEDGER --- */}
        <TabsContent value="products" className="mt-0 outline-none">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <InventoryDataTable
                columns={columns}
                initialData={initialData}
                totalCount={totalCount}
                categories={categories}
                businessEntityId={profile.business_id}
              />
          </div>
        </TabsContent>

        {/* --- CATEGORIES --- */}
        <TabsContent value="categories" className="mt-0 outline-none">
            <CategoriesView />
        </TabsContent>

        {/* --- RECIPES --- */}
        <TabsContent value="composites" className="mt-0 outline-none">
            <CompositesView />
        </TabsContent>
      </Tabs>

      {/* --- FOOTER / METADATA --- */}
      <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
                <Fingerprint size={18} className="text-slate-400" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none">Access Control</span>
                <span className="text-[10px] font-medium text-slate-400 mt-1">Authorized Session: System v10.2</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-[10px] font-mono font-semibold text-slate-500">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-md">
                <LayoutDashboard size={12} />
                ID: {profile.business_id.substring(0,12).toUpperCase()}
            </div>
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-md">
                <Activity size={12} />
                TENANT: {profile.tenant_id.substring(0,8).toUpperCase()}
            </div>
          </div>
      </div>
    </main>
  );
}