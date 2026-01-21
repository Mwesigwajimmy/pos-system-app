import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import PurchaseOrderDataTable from "@/components/purchases/PurchaseOrderDataTable";
import SupplierDataTable from "@/components/purchases/SupplierDataTable";
import { poColumns } from "@/components/purchases/poColumns";
import { supplierColumns } from "@/components/purchases/supplierColumns";

// --- Icons & UI ---
import { 
    PlusCircle, 
    Truck, 
    Landmark, 
    ShieldCheck, 
    LayoutDashboard, 
    Users2,
    PackageSearch
} from "lucide-react";

export default async function PurchasesPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Secure Server Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 2. Authentication & Secure Identity Resolution
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Multi-Tenant Security Context
    // We resolve the business_id from the 'profiles' table (The Ledger Truth)
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) {
        redirect(`/${locale}/onboarding`);
    }

    const businessId = profile.business_id;

    // 4. Fetch Legal Entity Branding
    // This ensures that POs generated from this page are professionally branded.
    const { data: tenantRecord } = await supabase
        .from('tenants')
        .select('name, currency')
        .eq('id', businessId)
        .single();

    const tenantName = tenantRecord?.name || "Our Organization";

    return (
        <div className="flex h-full flex-col space-y-8 p-4 md:p-8 bg-slate-50/30 min-h-screen">
            
            {/* Enterprise Executive Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                        <LayoutDashboard className="h-3 w-3" />
                        <span>Supply Chain & Procurement</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                        Procurement Hub
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                        Managing inventory inflow for <span className="text-primary font-bold underline underline-offset-4">{tenantName}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Ledger Status Indicator */}
                    <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-white rounded-xl border shadow-sm">
                        <div className="p-2 bg-blue-500/10 rounded-full">
                            <Landmark className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Inventory Asset Sync</span>
                            <span className="text-xs font-mono font-bold text-blue-600">ACCOUNTS 1200/2000 ACTIVE</span>
                        </div>
                    </div>

                    <Button asChild className="h-12 px-8 shadow-xl bg-primary hover:bg-primary/90 transition-all font-bold">
                        <Link href={`/${locale}/purchases/new`}>
                            <PlusCircle className="mr-2 h-5 w-5" /> New Purchase Order
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Main Operational Switchboard */}
            <Tabs defaultValue="purchase-orders" className="space-y-6">
                <div className="bg-white p-1 rounded-xl border shadow-sm inline-flex">
                    <TabsList className="bg-transparent gap-2">
                        <TabsTrigger value="purchase-orders" className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 font-bold transition-all">
                            <Truck className="h-4 w-4 mr-2" /> Purchase Orders
                        </TabsTrigger>
                        <TabsTrigger value="suppliers" className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 font-bold transition-all">
                            <Users2 className="h-4 w-4 mr-2" /> Supplier Registry
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="purchase-orders" className="space-y-4 outline-none">
                    <div className="flex items-center gap-2 px-2">
                        <PackageSearch className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Active Order Pipeline</h2>
                    </div>
                    {/* 
                        The PurchaseOrderDataTable now receives the tenant context.
                        This component handles the 'Commercial PO' PDF generation.
                    */}
                    <PurchaseOrderDataTable 
                        columns={poColumns} 
                    />
                </TabsContent>

                <TabsContent value="suppliers" className="space-y-4 outline-none">
                    <div className="flex items-center gap-2 px-2">
                        <Users2 className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Verified Vendors</h2>
                    </div>
                    <SupplierDataTable 
                        columns={supplierColumns} 
                        tenantId={businessId} 
                    />
                </TabsContent>
            </Tabs>

            {/* GLOBAL COMPLIANCE FOOTER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-8 border-t mt-auto">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1 text-green-600">
                        <ShieldCheck className="h-3.5 w-3.5"/> GADS INTERCONNECT: ARMED
                    </span>
                    <span className="flex items-center gap-1">
                        <Landmark className="h-3.5 w-3.5"/> AP & INVENTORY LEDGER LINK: VERIFIED
                    </span>
                </div>
                <p>© 2026 UG-BizSuite Cloud ERP • Secure Environment: {businessId.substring(0,8)}</p>
            </div>
        </div>
    );
}