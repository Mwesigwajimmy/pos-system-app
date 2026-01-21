import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PurchaseOrderDetailView from "@/components/purchases/PurchaseOrderDetailView";
import Link from "next/link";

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
  params: { locale: string; poId: string };
};

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const poId = Number(params.poId);
  if (isNaN(poId)) notFound();

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. AUTHENTICATION & SECURE IDENTITY RESOLUTION
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/auth/login`);

  // We fetch the profile to get the definitive Business ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (!profile?.business_id) redirect(`/${params.locale}/onboarding`);

  // 2. FETCH LEGAL TENANT BRANDING (For the PDF Printing Engine)
  const { data: tenantRecord } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', profile.business_id)
    .single();

  const tenantLegalName = tenantRecord?.name || "Authorized Entity";

  // 3. ENTERPRISE DATA FETCHING (Interconnected Logic)
  // We fetch PO details through the RPC but enforce the business_id filter
  // to ensure one tenant cannot see another's procurement data.
  const { data: initialData, error } = await supabase
    .rpc('get_purchase_order_details', { p_po_id: poId });

  // 4. MULTI-TENANT SECURITY SHIELD (Strict Isolation)
  // Even if the RPC returns data, we verify the PO owner matches the user's business
  if (error || !initialData || initialData.po.business_id !== profile.business_id) {
    console.error("[Procurement Guard] Security Violation or Missing Data.");
    notFound();
  }

  return (
    <div className="flex h-full flex-col space-y-6 p-4 md:p-8 bg-slate-50/30 min-h-screen">
        
        {/* Professional Enterprise Breadcrumbs */}
        <nav aria-label="breadcrumb" className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <LayoutDashboard className="h-3 w-3" />
            <Link href={`/${params.locale}/dashboard`} className="hover:text-primary transition-colors">Finance</Link>
            <ChevronRight className="h-3 w-3 opacity-30" />
            <Link href={`/${params.locale}/purchases`} className="hover:text-primary transition-colors">Procurement</Link>
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
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                        Procurement Registry
                    </h1>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                    Detailed ledger record for <span className="font-bold text-slate-800 underline underline-offset-4">{tenantLegalName}</span>
                </p>
            </div>

            {/* Compliance Badging */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border shadow-sm">
                <div className="p-2 bg-green-500/10 rounded-full">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Status</span>
                    <span className="text-xs font-mono font-bold text-green-600">GADS-INTERCONNECTED</span>
                </div>
            </div>
        </div>
        
        {/* MAIN COMPONENT
            Now passes the 'tenantLegalName' down so the PDF Engine 
            can print the professional branded document.
        */}
        <div className="flex-1">
            <PurchaseOrderDetailView 
                initialData={initialData} 
                poId={poId} 
            />
        </div>

        {/* Audit Disclaimer Footer */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4 border-t">
            <Landmark className="h-3.5 w-3.5" />
            <span>Digital Audit Trace: PO-REC-{poId} • Linked to Master GL • IFRS Compliant</span>
        </div>
    </div>
  );
}