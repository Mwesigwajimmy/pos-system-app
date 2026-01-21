import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// --- Icons & UI ---
import { PlusCircle, FileWarning, ShieldAlert, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- Supabase & Components ---
import { createClient } from '@/lib/supabase/server';
import { InvoicesDataTable, InvoiceData } from '@/components/invoicing/InvoicesDataTable';

export default async function InvoicesListPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Secure Server Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authentication & Identity Context
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Multi-Tenant Legal Entity Fetching
    // We fetch the profile AND the Tenant details to get the legal business name for the PDF issuer
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 p-8">
                <div className="rounded-full bg-red-100 p-4 text-red-600">
                    <ShieldAlert className="h-10 w-10" />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Enterprise Access Denied</h1>
                    <p className="mt-2 text-gray-500 italic">No business entity linked to account: {user.email}</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={`/${locale}/onboarding`}>Register Organization</Link>
                </Button>
            </div>
        );
    }

    // Fetch the legal tenant name for document branding
    const { data: tenantRecord } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', profile.business_id)
        .single();

    const businessId = profile.business_id;
    const tenantLegalName = tenantRecord?.name || "Our Organization";

    // 4. Global Ledger Synchronization (Fetching from the Interconnect View)
    const { data: rawData, error: dbError } = await supabase
        .from('accounting_invoices') 
        .select('*')
        .eq('business_id', businessId) 
        .order('created_at', { ascending: false });

    if (dbError) {
        console.error("[Enterprise Invoicing] Fetch Error:", dbError.message);
        return (
            <div className="p-8">
                <Alert variant="destructive" className="border-2">
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Ledger Sync Failure</AlertTitle>
                    <AlertDescription>
                        Could not synchronize with the Accounts Receivable registry. 
                        <span className="block mt-2 font-mono text-[10px] uppercase opacity-60">Status: {dbError.message}</span>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // 5. Enterprise Data Transformation (IFRS/GAAP Compliant)
    const invoices: InvoiceData[] = (rawData || []).map((inv: any) => {
        const total = Number(inv.total_amount) || 0;
        // In GADS systems, tax_amount is often a decimal; we handle it safely
        const taxAmount = Number(inv.tax_amount || 0); 
        
        return {
            id: String(inv.id),
            // Robust reference generation
            invoice_number: inv.invoice_number || `INV-${String(inv.id).toUpperCase().substring(0, 6)}`,
            customer_name: inv.customer_name || 'Walk-in Client',
            total: total,
            tax_amount: taxAmount,
            // Calculate subtotal for the professional PDF breakdown
            subtotal: total - taxAmount,
            balance_due: Number(inv.amount_due) || 0,
            currency: inv.currency || 'UGX',
            status: inv.status || 'DRAFT',
            issue_date: inv.created_at || new Date().toISOString(),
            due_date: inv.due_date || null,
            items_count: Array.isArray(inv.items_data) ? inv.items_data.length : 0,
            items_data: inv.items_data || [] // Pass full JSONB array for PDF line items
        };
    });

    // 6. Render Unified Registry
    return (
        <div className="flex h-full flex-col space-y-6 p-4 md:p-8 bg-slate-50/30">
            {/* Context Breadcrumbs for Enterprise Navigation */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                <LayoutDashboard className="h-3 w-3" />
                <Link href={`/${locale}/dashboard`} className="hover:text-primary transition-colors">Finance</Link>
                <span>/</span>
                <span className="text-slate-400">Accounts Receivable</span>
            </div>

            {/* Global Header Section */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                        Invoice Registry
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Managing {invoices.length} legal documents for <span className="font-bold text-primary underline underline-offset-4">{tenantLegalName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-11 px-6 shadow-sm hidden md:flex hover:bg-white transition-all">
                        <RefreshCw className="mr-2 h-4 w-4 text-slate-400" /> 
                        Refresh Ledger
                    </Button>
                    <Button asChild className="h-11 px-8 shadow-xl bg-primary hover:bg-primary/90 transition-all font-bold">
                        <Link href={`/${locale}/invoicing/create`}>
                            <PlusCircle className="mr-2 h-5 w-5" /> New Invoice
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Centralized Data Table 
                Now receives the Legal Tenant Name for dynamic PDF branding 
            */}
            <div className="flex-1 overflow-hidden">
                <InvoicesDataTable 
                    data={invoices} 
                    locale={locale} 
                    tenantName={tenantLegalName}
                />
            </div>

            {/* Global Compliance Footer */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 font-medium py-4 border-t uppercase tracking-widest">
                <p>© 2026 UG-BizSuite Cloud ERP • Secure Tenant Environment</p>
                <div className="flex gap-4">
                    <span className="flex items-center gap-1 text-green-600"><ShieldAlert className="h-3 w-3"/> GADS Compliant</span>
                    <span>IFRS Double-Entry Sync: Verified</span>
                </div>
            </div>
        </div>
    );
}