import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { TicketList } from '@/components/crm/support/TicketList';
import { CreateTicketModal } from '@/components/crm/support/CreateTicketModal';

async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const { data: employee } = await supabase.from('employees').select('id, role, business_id').eq('user_id', user.id).single();
    return employee;
}

async function getSupportData(supabase: any) {
    const ticketsPromise = supabase.from('support_tickets')
        .select(`
            id, ticket_uid, subject, status, priority, 
            estimated_cost, currency_code, created_at, updated_at,
            customers ( id, name ),
            employees ( id, full_name )
        `)
        .order('updated_at', { ascending: false });

    const employeesPromise = supabase.from('employees').select('id, full_name');

    const [tickets, employees] = await Promise.all([ticketsPromise, employeesPromise]);
    return { tickets: tickets.data || [], employees: employees.data || [] };
}

export default async function SupportCenterPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) redirect('/login');
    
    const { tickets, employees } = await getSupportData(supabase);

    return (
        <div className="flex-1 space-y-6 p-6 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight">Support Center</h2>
                    <p className="text-muted-foreground font-medium text-sm">
                        Forensic resolution tracking for client intelligence.
                    </p>
                </div>
                 <CreateTicketModal 
                    employees={employees} 
                    currentBusinessId={currentUser.business_id} 
                 />
            </div>

            <TicketList tickets={tickets} />
        </div>
    );
}