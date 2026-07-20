import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PurchaseOrderDetailView from "@/components/purchases/PurchaseOrderDetailView";
import Link from "next/link";

/**
 * --- BBU1 PURCHASE ORDER REGISTRY GATEWAY ---
 * VERSION: v5.1 OMEGA (NEXT.JS 15 COMPLIANT)
 * Logic: Secure server-side resolution of procurement documents.
 * Security: Multi-tenant vault verification and Director identity handshake.
 */

// --- Icons & UI ---
import { 
    ChevronRight, 
    ShieldCheck, 
    LayoutDashboard, 
    Truck, 
    Landmark,
    FileText 
} from "lucide-react";

type PageProps = {
  params: Promise<{ locale: string; poId: string }>;
};

export default async function PurchaseOrderDetailPage(props: PageProps) {
  // NEXT.JS 15 HANDSHAKE: Await params before consumption
  const { locale, poId: rawPoId } = await props.params;
  const poId = Number(rawPoId);
  
  if (isNaN(poId)) notFound();

  // NEXT.JS 15 HANDSHAKE: Await cookies
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. AUTHENTICATION & SECURE IDENTITY RESOLUTION
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // We fetch the profile to get the definitive Business ID for RLS enforcement
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/onboarding`);

  // 2. FETCH LEGAL TENANT BRANDING (For the PDF Printing Engine Handshake)
  const { data: tenantRecord } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', profile.business_id)
    .single();

  const tenantLegalName = tenantRecord?.name || "Authorized Entity";

  // 3. ENTERPRISE DATA FETCHING (Interconnected Logic)
  // Fetching PO details through the RPC while enforcing the business_id seal
  const { data: initialData, error } = await supabase
    .rpc('get_purchase_order_details', { p_po_id: poId });

  // 4. MULTI-TENANT SECURITY SHIELD (Strict Isolation)
  // Logic: Block access if the PO does not belong to the current authenticated business
  if (error || !initialData || initialData.po.business_id !== profile.business_id) {
    console.error("[Procurement Guard] Security Violation or Missing Data Trace.");
    notFound();
  }

  return (
    <div className="flex h-full flex-col space-y-6 p-4 md:p-8 bg-slate-50/30 min-h-screen">
        
        {/* Professional Enterprise Breadcrumbs */}
        <nav aria-label="breadcrumb" className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <LayoutDashboard className="h-3 w-3" />
            <Link href={`/${locale}/dashboard`} className="hover:text-primary transition-colors">Finance</Link>
            <ChevronRight className="h-3 w-3 opacity-30" />
            <Link href={`/${locale}/purchases`} className="hover:text-primary transition-colors">Procurement</Link>
            <ChevronRight className="h-3 w-3 opacity-30" />
            <span className="text-slate-400">Order Audit: #PO-{poId}</span>
        </nav>

        {/* Global Context Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tighter text-slate-900 uppercase">
                        Procurement Registry
                    </h1>
                </div>
                <p className="text-xs text-muted-foreground font-medium italic">
                    Detailed ledger record for <span className="font-black text-slate-800 underline underline-offset-4">{tenantLegalName}</span>
                </p>
            </div>

            {/* Compliance Badging */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border shadow-sm">
                <div className="p-2 bg-green-500/10 rounded-full">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase leading-none tracking-widest">Integrity Status</span>
                    <span className="text-xs font-mono font-bold text-green-600 mt-1">GADS-INTERCONNECTED</span>
                </div>
            </div>
        </div>
        
        {/* MAIN COMPONENT
            Transmits data to the client view for interaction and receiving.
        */}
        <div className="flex-1">
            <PurchaseOrderDetailView 
                initialData={initialData} 
                poId={poId} 
            />
        </div>

        {/* Audit Disclaimer Footer */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-6 border-t">
            <Landmark className="h-4 w-4" />
            <span>Digital Audit Trace: PO-REC-{poId} • Linked to Master GL • IFRS Compliant • Sector Isolated</span>
        </div>
    </div>
  );
}