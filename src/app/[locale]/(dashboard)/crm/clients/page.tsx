import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { ClientIntelligenceLedger } from '@/components/crm/clients/ClientLedger';

async function getClientLedgerData(supabase: any) {
    const { data, error } = await supabase
        .from('view_client_subscription_ledger')
        .select('*')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("Error fetching ledger:", error);
        return [];
    }
    return data;
}

export default async function ClientLedgerPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const clients = await getClientLedgerData(supabase);

    return (
        <div className="flex-1 space-y-6 p-6 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight">Client Intelligence</h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Manage global subscriptions, debt standing, and forensic billing.
                    </p>
                </div>
            </div>

            <ClientIntelligenceLedger clients={clients} />
        </div>
    );
}