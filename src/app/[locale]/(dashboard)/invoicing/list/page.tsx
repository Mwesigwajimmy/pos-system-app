import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// --- Icons & UI ---
import { PlusCircle, FileWarning, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- Supabase & Components ---
import { createClient } from '@/lib/supabase/server';
import { InvoicesDataTable, InvoiceData } from '@/components/invoicing/InvoicesDataTable';

// --- Types ---
// This ensures we know exactly what we are looking for in the DB
interface DatabaseInvoice {
    id: string;
    invoice_number: string | null;
    customer_name: string | null;
    total: number | null;
    balance_due: number | null;
    currency: string | null;
    status: string | null;
    issue_date: string | null;
    due_date: string | null;
    items_data: any; // JSONB
    created_at: string;
}

export default async function InvoicesListPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Secure Server Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authentication Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        // If not logged in, force redirect to login
        redirect(`/${locale}/auth/login`);
    }

    // 3. Multi-Tenant Security Context
    // We must find which Business (Tenant) this user belongs to.
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id, full_name')
        .eq('id', user.id)
        .single();

    // Handle "Orphaned User" (User exists but has no organization)
    if (!profile?.business_id) {
        return (
            <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 p-8">
                <div className="rounded-full bg-red-100 p-4 text-red-600">
                    <ShieldAlert className="h-10 w-10" />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Access Denied</h1>
                    <p className="mt-2 text-gray-500">
                        Your account ({user.email}) is not linked to an active Organization.
                    </p>
                    <p className="text-sm text-gray-400">Tenant ID is missing.</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={`/${locale}/onboarding`}>Create or Join Organization</Link>
                </Button>
            </div>
        );
    }

    const tenantId = profile.business_id;

    // 4. Enterprise Data Fetching
    // We fetch EVERYTHING needed for the dashboard in one request.
    const { data: rawData, error: dbError } = await supabase
        .from('invoices')
        .select(`
            id,
            invoice_number,
            customer_name,
            total,
            balance_due,
            currency,
            status,
            issue_date,
            due_date,
            items_data,
            created_at
        `)
        .eq('tenant_id', tenantId) // <--- CRITICAL SECURITY FILTER
        .order('created_at', { ascending: false });

    // Handle Database Connection Errors
    if (dbError) {
        console.error("Critical Invoice Fetch Error:", dbError);
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>System Error</AlertTitle>
                    <AlertDescription>
                        Could not retrieve invoice registry. Please try again later.
                        <br />
                        <span className="font-mono text-xs opacity-70">Error: {dbError.message}</span>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // 5. Data Transformation & Normalization
    // Convert raw DB nulls into safe defaults (0, "", etc.) so the UI never crashes.
    const invoices: InvoiceData[] = (rawData || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number || `DRAFT-${inv.id.slice(0,4)}`,
        customer_name: inv.customer_name || 'Unknown Client',
        // Convert High Precision Decimals to standard JS Numbers
        total: Number(inv.total) || 0,
        balance_due: Number(inv.balance_due) || 0,
        currency: inv.currency || 'UGX',
        status: inv.status || 'draft',
        // Handle dates safely
        issue_date: inv.issue_date || new Date().toISOString(),
        due_date: inv.due_date || null,
        // Calculate items count from JSONB
        items_count: Array.isArray(inv.items_data) ? inv.items_data.length : 0,
    }));

    // 6. Render the Professional UI
    return (
        <div className="flex h-full flex-col space-y-6 p-8">
            {/* Header Section */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Invoices
                    </h2>
                    <p className="text-sm text-gray-500">
                        Manage financial records for <span className="font-semibold text-primary">Current Organization</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" /> Sync
                    </Button>
                    <Button asChild className="shadow-lg">
                        <Link href="/invoicing/create">
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Invoice
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Main Data Table */}
            <div className="flex-1 rounded-xl border bg-card text-card-foreground shadow-sm">
                <InvoicesDataTable 
                    data={invoices} 
                    locale={locale} 
                />
            </div>
        </div>
    );
}