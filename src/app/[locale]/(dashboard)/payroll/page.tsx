import { cookies } from 'next/headers'; // <-- STEP 1: Import cookies
import { createClient } from '@/lib/supabase/server';
import { PayrollHistoryTable } from '@/components/payroll/PayrollHistoryTable';
import { StartPayrollRunForm } from '@/components/payroll/StartPayrollRunForm';

export default async function PayrollPage() {
    const cookieStore = cookies(); // <-- STEP 2: Get the cookie store
    const supabase = createClient(cookieStore); // <-- STEP 3: Pass the store to the client
    
    // This logic fetches the tenant ID associated with the logged-in user.
    // Ensure your user's JWT or metadata contains this 'tenant_id'.
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.user_metadata?.tenant_id;

    if (!tenantId) {
        return (
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-4">Payroll</h1>
                <p className="text-red-500">
                    Error: Could not identify your business. Please ensure your user profile is correctly configured.
                </p>
            </div>
        )
    }

    const { data: runs } = await supabase.from('payroll_runs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    return (
        <div className="p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Payroll</h1>
            </div>
            <StartPayrollRunForm tenantId={tenantId} />
            <PayrollHistoryTable runs={runs || []} />
        </div>
    );
}