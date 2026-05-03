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
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <Alert variant="destructive" className="max-w-md border-none shadow-lg rounded-2xl bg-white p-8">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <AlertTitle className="text-lg font-bold text-slate-900 mt-2">Account Error</AlertTitle>
                <AlertDescription className="text-slate-500 mt-1">
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
    <main className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto py-8 px-6 md:px-10 lg:px-12 space-y-10 animate-in fade-in duration-500">
        
        {/* --- PROFESSIONAL HEADER --- */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50 pb-8">
            <div className="flex items-center gap-5">
                <div className="p-3 bg-slate-900 rounded-xl text-white shadow-md">
                    <Boxes className="w-7 h-7" />
                </div>
                <div className="space-y-0.5">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
                        Inventory Management
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <LayoutDashboard size={12} className="text-blue-500" /> Facility: {profile.business_name}
                        </span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 font-bold px-3 py-0.5 rounded-full text-[9px] uppercase tracking-wider border-none">
                            Network Active
                        </Badge>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                 <div className="hidden sm:block text-right pr-4 border-r border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Environment</p>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">System v10.2.4</p>
                 </div>
                 <Button variant="default" className="bg-blue-600 hover:bg-blue-700 h-10 px-6 font-bold shadow-md rounded-lg transition-all active:scale-95" asChild>
                    <Link href="/inventory/adjustments">
                        <Plus size={18} className="mr-2" /> New Adjustment
                    </Link>
                 </Button>
            </div>
        </header>

        <p className="text-sm text-slate-500 font-medium -mt-4 ml-1">
            Viewing stock for: <span className="font-bold text-slate-900">{profile.business_name}</span>
        </p>

        {/* --- NAVIGATION TABS --- */}
        <Tabs defaultValue="products" className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <TabsList className="bg-slate-200/50 p-1 rounded-lg h-10 w-full md:w-auto">
                    <TabsTrigger 
                        value="products" 
                        className="font-bold px-6 h-8 text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                    >
                        <Boxes size={14} />
                        Stock Ledger
                    </TabsTrigger>
                    <TabsTrigger 
                        value="categories" 
                        className="font-bold px-6 h-8 text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                    >
                        <Tags size={14} />
                        Categories
                    </TabsTrigger>
                    <TabsTrigger 
                        value="composites" 
                        className="font-bold px-6 h-8 text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                    >
                        <BookOpen size={14} />
                        Recipes
                    </TabsTrigger>
                </TabsList>
                
                <div className="hidden lg:flex items-center gap-3 px-5 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Secure Protocol Active</span>
                </div>
            </div>

            {/* --- STOCK LEDGER --- */}
            <TabsContent value="products" className="m-0 outline-none">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <InventoryDataTable
                    columns={columns}
                    initialData={initialData}
                    totalCount={totalCount}
                    categories={categories}
                    businessEntityId={profile.business_id}
                  />
              </div>
            </TabsContent>

            <TabsContent value="categories" className="m-0 outline-none">
                <CategoriesView />
            </TabsContent>

            <TabsContent value="composites" className="m-0 outline-none">
                <CompositesView />
            </TabsContent>
        </Tabs>

        {/* --- FOOTER / METADATA --- */}
        <footer className="pt-20 pb-12">
            <div className="flex justify-center items-center gap-4 mb-6 opacity-30">
                <div className="h-px w-16 bg-slate-200" />
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-slate-400" />
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">
                        Cloud Infrastructure v10.2
                    </p>
                </div>
                <div className="h-px w-16 bg-slate-200" />
            </div>
            
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 opacity-40">
                <div className="flex items-center gap-2">
                    <Fingerprint size={12} className="text-slate-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        Node ID: {profile.business_id.substring(0,12).toUpperCase()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Activity size={12} className="text-slate-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        Tenant: {profile.tenant_id.substring(0,8).toUpperCase()}
                    </span>
                </div>
            </div>
        </footer>
      </div>
    </main>
  );
}

const Badge = ({ children, className, variant }: any) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
        {children}
    </span>
);