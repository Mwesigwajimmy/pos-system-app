import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { TicketList } from '@/components/crm/support/TicketList';
import { CreateTicketModal } from '@/components/crm/support/CreateTicketModal';

/**
 * Retrieves the current user and their professional context.
 */
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const { data: employee } = await supabase
        .from('employees')
        .select('id, role, business_id')
        .eq('user_id', user.id)
        .single();
        
    return employee;
}

/**
 * Fetches ticket records and the list of available support agents.
 */
async function getSupportData(supabase: any) {
    const ticketsPromise = supabase.from('support_tickets')
        .select(`
            id, ticket_uid, subject, status, priority, 
            estimated_cost, currency_code, created_at, updated_at,
            customers ( id, name ),
            employees ( id, full_name )
        `)
        .order('updated_at', { ascending: false });

    const employeesPromise = supabase.from('employees')
        .select('id, full_name');

    const [tickets, employees] = await Promise.all([ticketsPromise, employeesPromise]);
    return { 
        tickets: tickets.data || [], 
        employees: employees.data || [] 
    };
}

export default async function SupportCenterPage() {
    // Standardized for Next.js 15
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) redirect('/login');
    
    const { tickets, employees } = await getSupportData(supabase);

    return (
        <div className="flex-1 p-6 md:p-10 bg-white min-h-screen">
            {/* Header Section: Professionally positioned with balanced typography */}
            <header className="flex flex-wrap items-center justify-between gap-6 mb-10">
                 <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Center</h1>
                    <p className="text-sm font-medium text-slate-500">
                        Manage and track customer support requests and ticket resolutions.
                    </p>
                </div>
                
                <div className="flex items-center">
                    <CreateTicketModal 
                        employees={employees} 
                        currentBusinessId={currentUser.business_id} 
                    />
                </div>
            </header>

            {/* Support Ticket Dashboard */}
            <div className="bg-white border-t border-slate-100 pt-6">
                <TicketList tickets={tickets} />
            </div>
        </div>
    );
}