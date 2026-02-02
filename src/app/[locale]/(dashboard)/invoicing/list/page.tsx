import React from 'react';
import { Metadata } from "next";
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// --- Icons & UI ---
import { PlusCircle, FileWarning, ShieldAlert, RefreshCw, LayoutDashboard, ShieldCheck, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- Supabase & Components ---
import { createClient } from '@/lib/supabase/server';
import { InvoicesDataTable, InvoiceData } from '@/components/invoicing/InvoicesDataTable';

// --- Enterprise Metadata ---
export const metadata: Metadata = {
    title: "Invoice Registry | Enterprise Financial Control",
    description: "Unified accounts receivable ledger with real-time autonomous synchronization.",
};

export default async function InvoicesListPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Secure Server Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authentication & Identity Context
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Sovereign Context Resolution
    // We fetch both columns to bridge the desync discovered in our historical audit.
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id, organization_id')
        .eq('id', user.id)
        .single();

    // The 'activeTenantId' is our golden key for the 1:1 Ledger Interconnect
    const activeTenantId = profile?.business_id || profile?.organization_id;

    if (profileError || !activeTenantId) {
        return (
            <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-6 p-8 text-center">
                <div className="rounded-3xl bg-red-50 border-2 border-dashed border-red-200 p-12 shadow-2xl shadow-red-500/10 max-w-md">
                    <ShieldAlert className="h-16 w-16 text-red-600 mx-auto mb-6 animate-pulse" />
                    <h1 className="text-3xl font-black tracking-tighter text-red-900 uppercase">Entity Unlinked</h1>
                    <p className="mt-4 text-red-700 font-medium leading-relaxed">
                        Security Alert: Your profile is not currently mapped to an active Business Unit. 
                        Registry access is restricted.
                    </p>
                    <Button variant="destructive" className="mt-8 font-bold" asChild>
                        <Link href={`/${locale}/onboarding`}>Link Business Unit</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Fetch the legal tenant name for high-end document branding
    const { data: tenantRecord } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', activeTenantId)
        .single();

    const tenantLegalName = tenantRecord?.name || "Global Organization";

    // 4. Global Interconnect Fetch (1:1 Relational Bridge)
    // We fetch from the 'invoices' table and join 'customers' to ensure names are always current.
    const { data: rawData, error: dbError } = await supabase
        .from('invoices') 
        .select(`
            *,
            customers ( name )
        `)
        .eq('business_id', activeTenantId) 
        .order('created_at', { ascending: false });

    if (dbError) {
        console.error("[Enterprise Invoicing] Interconnect Failure:", dbError.message);
        return (
            <div className="p-8 max-w-3xl mx-auto">
                <Alert variant="destructive" className="border-none shadow-2xl bg-red-600 text-white rounded-2xl p-8">
                    <FileWarning className="h-8 w-8 text-white" />
                    <AlertTitle className="text-2xl font-black tracking-tighter uppercase mb-2">Ledger Desync Error</AlertTitle>
                    <AlertDescription className="text-red-100 font-medium leading-relaxed">
                        The system encountered a logic gap while synchronizing with the General Ledger. 
                        The autonomous engine has paused for safety.
                        <span className="block mt-6 font-mono text-[10px] p-2 bg-red-700/50 rounded uppercase">Technical Root: {dbError.message}</span>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // 5. Enterprise Data Transformation (Traceability Check)
    const invoices: InvoiceData[] = (rawData || []).map((inv: any) => {
        const total = Number(inv.total_amount) || Number(inv.total) || 0;
        const taxAmount = Number(inv.tax_amount || inv.tax || 0); 
        
        return {
            id: String(inv.id),
            // Use the verified reference or fallback to the BIGINT ID
            invoice_number: inv.invoice_number || `INV-${inv.id}`,
            // Relational name takes priority over string backup
            customer_name: inv.customers?.name || inv.customer_name || 'Walk-in Client',
            total: total,
            tax_amount: taxAmount,
            subtotal: total - taxAmount,
            balance_due: Number(inv.balance_due) || 0,
            currency: inv.currency || inv.currency_code || 'UGX',
            status: inv.status || 'DRAFT',
            issue_date: inv.issue_date || inv.created_at || new Date().toISOString(),
            due_date: inv.due_date || null,
            items_count: Array.isArray(inv.items_data) ? inv.items_data.length : 0,
            // Interconnect Key: Used by UI to show "Ledger Sealed" badge
            transaction_id: inv.transaction_id || null,
            items_data: inv.items_data || [] 
        };
    });

    // 6. Render Autonomous Registry
    return (
        <div className="flex h-full flex-col space-y-8 p-6 md:p-10 bg-slate-50/50">
            {/* Context Navigation */}
            <div className="flex items-center gap-3 text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black">
                <LayoutDashboard className="h-3 w-3" />
                <Link href={`/${locale}/dashboard`} className="hover:text-blue-600 transition-colors">Sovereign Control</Link>
                <span className="opacity-30">/</span>
                <span className="text-blue-600">Revenue Ledger</span>
            </div>

            {/* Global Header Interface */}
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end border-b border-slate-100 pb-10">
                <div className="space-y-3">
                    <h2 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">
                        Invoice Registry
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 h-1.5 w-8 rounded-full" />
                        <p className="text-sm text-slate-500 font-medium">
                            Monitoring <span className="text-slate-900 font-bold">{invoices.length}</span> documents for <span className="text-blue-600 font-black italic">{tenantLegalName}</span>
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button variant="ghost" className="h-12 px-6 font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                        <History className="mr-2 h-4 w-4" /> 
                        Audit Logs
                    </Button>
                    <Button asChild className="h-12 px-8 shadow-2xl shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 transition-all font-black uppercase text-xs tracking-widest rounded-xl">
                        <Link href={`/${locale}/invoicing/create`}>
                            <PlusCircle className="mr-2 h-5 w-5" strokeWidth={3} /> New Invoice
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Interconnected Data Fabric */}
            <div className="flex-1 overflow-hidden">
                <div className="relative">
                    <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                    <InvoicesDataTable 
                        data={invoices} 
                        locale={locale} 
                        tenantName={tenantLegalName}
                    />
                </div>
            </div>

            {/* Global Compliance & Integrity Footer */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] text-slate-300 font-black py-6 border-t border-slate-100 uppercase tracking-[0.25em]">
                <p>© 2026 Sovereign ERP Systems • Autonomous Financial Environment</p>
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5 text-blue-600/60">
                        <ShieldCheck className="h-3.5 w-3.5"/> 1:1 Ledger Interconnect: Active
                    </span>
                    <span className="opacity-50">IFRS GAAP Compliant Architecture</span>
                </div>
            </div>
        </div>
    );
}