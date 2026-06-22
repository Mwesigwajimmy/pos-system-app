import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { ClientIntelligenceLedger } from '@/components/crm/clients/ClientLedger';

/**
 * Retrieves the business ID for the current authenticated user.
 */
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const { data: employee } = await supabase
        .from('employees')
        .select('id, business_id')
        .eq('user_id', user.id)
        .single();
        
    return employee;
}

/**
 * Fetches customer records and subscription data for the business.
 */
async function getCustomerData(supabase: any, bizId: string) {
    const { data, error } = await supabase
        .from('view_client_subscription_ledger')
        .select('*')
        .eq('business_id', bizId)
        .order('full_name', { ascending: true });

    if (error) {
        console.error("Database Fetch Error:", error);
        return [];
    }
    return data;
}

export default async function ClientLedgerPage() {
    // Next.js 15 Requirement: Await cookies
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const currentUser = await getCurrentUser(supabase);

    // Validate business context
    if (!currentUser || !currentUser.business_id) {
         return (
             <div className="flex flex-col items-center justify-center h-full p-10 bg-white">
                <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
                <p className="text-sm text-slate-500 mt-2">Your profile is not linked to a verified business account.</p>
            </div>
        );
    }

    const clients = await getCustomerData(supabase, currentUser.business_id);

    return (
        <div className="flex-1 p-6 md:p-10 bg-white">
            {/* Header Section */}
            <div className="mb-8">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Management</h1>
                    <p className="text-slate-500 text-sm font-medium">
                        View and manage customer records, billing status, and active subscriptions.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <ClientIntelligenceLedger 
                clients={clients} 
                businessId={currentUser.business_id} 
            />
        </div>
    );
}