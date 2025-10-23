import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// We will create these components in the upcoming steps
// import { TicketList } from '@/components/crm/support/TicketList';
// import { CreateTicketModal } from '@/components/crm/support/CreateTicketModal';

// --- Mock Component Placeholders for UI structure ---
const TicketList = ({ tickets }: { tickets: any[] }) => (
    <div className="p-10 border-2 border-dashed rounded-lg">
        <h3 className="text-center font-semibold">TicketList Component</h3>
        <p className="text-center text-sm text-muted-foreground">This will display a filterable list of all support tickets.</p>
        <pre className="mt-4 text-xs bg-muted p-2 rounded">{JSON.stringify(tickets, null, 2)}</pre>
    </div>
);
const CreateTicketModal = () => (
    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">Create New Ticket</button>
);
// --- End Mock Components ---

// This utility should ideally live in a central auth file
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    const { data: employee } = await supabase
        .from('employees')
        .select('id, role')
        .eq('user_id', user.id)
        .single();
    return employee;
}

// Data fetching function for all support tickets
async function getSupportTickets(supabase: any) {
    const { data, error } = await supabase
        .from('support_tickets')
        .select(`
            id,
            ticket_uid,
            subject,
            status,
            priority,
            created_at,
            updated_at,
            customers ( id, name ),
            employees ( id, full_name )
        `)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error("Error fetching support tickets:", error);
        return [];
    }

    return data;
}

export default async function SupportCenterPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
         return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-destructive">Access Denied</h2>
                <p>You do not have permission to access the support module.</p>
            </div>
        );
    }
    
    const tickets = await getSupportTickets(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Support Center</h2>
                    <p className="text-muted-foreground">
                        Manage all customer support tickets from one place.
                    </p>
                </div>
                 <CreateTicketModal />
            </div>

            {/* The main data table displaying all tickets */}
            <TicketList tickets={tickets} />
        </div>
    );
}