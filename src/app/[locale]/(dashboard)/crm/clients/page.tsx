import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { ClientIntelligenceLedger } from '@/components/crm/clients/ClientLedger';

/**
 * 🛡️ IDENTITY RESOLUTION
 * Fetches the specific business node ID for the current operator.
 */
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    // Fetching business_id from the employee ledger
    const { data: employee } = await supabase
        .from('employees')
        .select('id, business_id')
        .eq('user_id', user.id)
        .single();
        
    return employee;
}

/**
 * 🧠 FORENSIC LEDGER FETCH
 * Pulls all client financials and subscription statuses for the business.
 */
async function getClientLedgerData(supabase: any, bizId: string) {
    const { data, error } = await supabase
        .from('view_client_subscription_ledger')
        .select('*')
        .eq('business_id', bizId) // Security: Isolation by Business ID
        .order('full_name', { ascending: true });

    if (error) {
        console.error("Forensic Ledger Fetch Error:", error);
        return [];
    }
    return data;
}

export default async function ClientLedgerPage() {
    // ✅ Next.js 15 Requirement: Await cookies
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const currentUser = await getCurrentUser(supabase);

    // Security Gate: Ensure the user is linked to a business
    if (!currentUser || !currentUser.business_id) {
         return (
             <div className="flex-1 space-y-4 p-8 pt-6">
                <h2 className="text-3xl font-black tracking-tight text-red-600 uppercase">Forensic Access Denied</h2>
                <p className="font-bold text-slate-500">Your profile is not linked to a verified business node.</p>
            </div>
        );
    }

    const clients = await getClientLedgerData(supabase, currentUser.business_id);

    return (
        <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 bg-white">
            {/* SOVEREIGN CRM HEADER */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Client Intelligence</h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Manage global subscriptions, debt standing, and forensic client billing.
                    </p>
                </div>
            </div>

            {/* Passing both the data and the Business ID for onboarding actions */}
            <ClientIntelligenceLedger 
                clients={clients} 
                businessId={currentUser.business_id} 
            />
        </div>
    );
}