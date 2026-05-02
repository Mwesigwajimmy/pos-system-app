import React from 'react';
import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

// --- Icons & UI ---
import { PlusCircle, FileWarning, ShieldAlert, RefreshCw, LayoutDashboard, ShieldCheck, History, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- Supabase & Components ---
import { createClient } from '@/lib/supabase/server';
import { InvoicesDataTable, InvoiceData } from '@/components/invoicing/InvoicesDataTable';

// --- Enterprise Metadata ---
export const metadata: Metadata = {
    title: "Invoice Registry | Enterprise Financial Ledger",
    description: "Unified accounts receivable management with automated ledger synchronization.",
};

export default async function InvoicesListPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        redirect(`/${locale}/auth/login`);
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id, organization_id')
        .eq('id', user.id)
        .single();

    const activeTenantId = profile?.business_id || profile?.organization_id;

    if (profileError || !activeTenantId) {
        return (
            <div className="flex min-h-screen items-center justify-center p-12 bg-slate-50">
                <div className="w-full max-w-md bg-white border border-slate-200 p-12 rounded-[2rem] shadow-xl text-center space-y-6">
                    <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                        <ShieldAlert size={32} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Mapping Required</h1>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Your account profile is not currently associated with an active business unit. 
                            Registry access is restricted until mapping is complete.
                        </p>
                    </div>
                    <Button className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100" asChild>
                        <Link href={`/${locale}/onboarding`}>Link Business Unit</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const { data: tenantRecord } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', activeTenantId)
        .single();

    const tenantLegalName = tenantRecord?.name || "Corporate Entity";

    const { data: rawData, error: dbError } = await supabase
        .from('invoices') 
        .select(`
            *,
            customers ( name )
        `)
        .eq('business_id', activeTenantId) 
        .order('created_at', { ascending: false });

    if (dbError) {
        return (
            <div className="max-w-3xl mx-auto py-20 px-6">
                <Alert className="border-none shadow-2xl bg-white rounded-3xl p-10 border border-slate-200">
                    <FileWarning className="h-10 w-10 text-rose-500 mb-4" />
                    <AlertTitle className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Registry Synchronization Error</AlertTitle>
                    <AlertDescription className="text-slate-500 font-medium leading-relaxed">
                        The system encountered a protocol interruption while accessing the transaction ledger. 
                        Operational data retrieval has been paused for integrity.
                        <div className="mt-8 p-4 bg-slate-50 rounded-xl font-mono text-[10px] text-slate-400 uppercase tracking-widest border border-slate-100">
                            Error Code: {dbError.message}
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const invoices: InvoiceData[] = (rawData || []).map((inv: any) => {
        const total = Number(inv.total_amount) || Number(inv.total) || 0;
        const taxAmount = Number(inv.tax_amount || inv.tax || 0); 
        
        return {
            id: String(inv.id),
            invoice_number: inv.invoice_number || `INV-${inv.id}`,
            customer_name: inv.customers?.name || inv.customer_name || 'Standard Account',
            total: total,
            tax_amount: taxAmount,
            subtotal: total - taxAmount,
            balance_due: Number(inv.balance_due) || 0,
            currency: inv.currency || inv.currency_code || 'USD',
            status: inv.status || 'DRAFT',
            issue_date: inv.issue_date || inv.created_at || new Date().toISOString(),
            due_date: inv.due_date || null,
            items_count: Array.isArray(inv.items_data) ? inv.items_data.length : 0,
            transaction_id: inv.transaction_id || null,
            items_data: inv.items_data || [] 
        };
    });

    return (
        <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700 bg-white">
            
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-100 pb-12">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
                        <Link href={`/${locale}/dashboard`} className="hover:text-blue-600 transition-colors">Financial Dashboard</Link>
                        <ChevronRight className="h-3 w-3 opacity-30" />
                        <span className="text-blue-600">Accounts Receivable</span>
                    </div>
                    
                    <div className="space-y-1">
                        <h1 className="text-4xl font-bold text-slate-900 tracking-tighter">Invoice Registry</h1>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-500">
                                Management of <span className="text-slate-900 font-bold">{invoices.length}</span> documents for:
                            </span>
                            <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 font-bold text-slate-700 text-xs uppercase tracking-tight">
                                {tenantLegalName}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="h-12 px-6 font-bold text-slate-500 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-xs uppercase tracking-widest">
                        <History className="mr-2 h-4 w-4" /> 
                        Registry Logs
                    </Button>
                    <Button asChild className="h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-bold uppercase text-[11px] tracking-[0.1em] rounded-2xl">
                        <Link href={`/${locale}/invoicing/create`}>
                            <PlusCircle className="mr-2 h-4 w-4" /> New Entry
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="min-h-[600px]">
                <InvoicesDataTable 
                    data={invoices} 
                    locale={locale} 
                    tenantName={tenantLegalName}
                />
            </main>

            <footer className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">
                    Automated Transaction Environment V1.0
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                        <ShieldCheck className="h-4 w-4"/> Ledger Synchronized
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Activity className="h-4 w-4"/> Interconnect ID: {activeTenantId.substring(0,8).toUpperCase()}
                    </div>
                </div>
            </footer>
        </div>
    );
}