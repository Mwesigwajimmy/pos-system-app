import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

// Import Components and their Types
import { DashboardStats, DashboardStatsProps } from '@/components/professional-services/dashboard/DashboardStats';
import { TodaysAgenda, AgendaItem } from '@/components/professional-services/dashboard/TodaysAgenda';
import { TimeLogWidget } from '@/components/professional-services/dashboard/TimeLogWidget';
import { FinancialSnapshot, RecentInvoice } from '@/components/professional-services/dashboard/FinancialSnapshot';
import { Button } from '@/components/ui/button';

// --- Database Response Types ---
// These interfaces describe what Supabase returns raw from the database
interface DBAppointment {
    id: string;
    summary: string;
    scheduled_date: string;
    customers: { name: string } | null; // Relation can be null
}

interface DBTask {
    id: string;
    title: string;
    due_date: string;
    // tasks might not always have a customer relation, so handle strictly
    // Assuming tasks are linked to tenant, maybe not customer directly in your schema,
    // but based on your code you tried to access customers.name
    customers?: { name: string } | null; 
}

async function getProfessionalDashboardData(supabase: any) {
    const today = new Date();
    // Using simple ISO strings for Supabase comparison
    const todayStart = today.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const todayEnd = today.toISOString().split('T')[0] + 'T23:59:59.999Z';

    // Parallel Data Fetching
    const [statsResult, appointmentsResult, tasksResult, invoicesResult] = await Promise.all([
        // 1. Stats Aggregation
        (async () => {
            const { count: activeClients } = await supabase.from('customers').select('*', { count: 'exact', head: true });
            // Assuming 'appointments' table, or 'work_orders' as per your previous code. Sticking to 'work_orders'
            const { count: upcomingAppointments } = await supabase.from('work_orders').select('*', { count: 'exact', head: true }).gte('scheduled_date', todayStart).eq('status', 'SCHEDULED');
            const { count: overdueInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'OVERDUE');
            
            // Safe RPC call
            const { data: unbilled, error } = await supabase.rpc('sum_unbilled_hours');
            
            return {
                activeClients: activeClients ?? 0,
                upcomingAppointments: upcomingAppointments ?? 0,
                overdueInvoices: overdueInvoices ?? 0,
                unbilledHours: error ? 0 : (unbilled ?? 0),
            } as DashboardStatsProps;
        })(),

        // 2. Appointments (Work Orders)
        supabase
            .from('work_orders')
            .select(`id, summary, scheduled_date, customers ( name )`)
            .gte('scheduled_date', todayStart)
            .lte('scheduled_date', todayEnd)
            .eq('status', 'SCHEDULED'),

        // 3. Tasks
        supabase
            .from('compliance_tasks') // Updated table name based on previous context
            .select(`id, title, due_date`) // Removed customer join if not exists, add back if your schema has it
            .gte('due_date', todayStart)
            .lte('due_date', todayEnd)
            .eq('is_completed', false),

        // 4. Invoices
        supabase
            .from('invoices')
            .select(`id, invoice_uid, status, due_date, total, customers ( name )`)
            .order('created_at', { ascending: false })
            .limit(5)
    ]);

    // --- Transform Data for UI ---
    
    // Transform Appointments
    const appointments: AgendaItem[] = (appointmentsResult.data || []).map((a: any) => ({
        id: a.id,
        type: 'APPOINTMENT',
        dateTime: a.scheduled_date,
        title: a.summary || 'Untitled Appointment',
        clientName: a.customers?.name || 'Unknown Client'
    }));

    // Transform Tasks
    const tasks: AgendaItem[] = (tasksResult.data || []).map((t: any) => ({
        id: t.id,
        type: 'TASK',
        dateTime: t.due_date,
        title: t.title,
        clientName: 'Internal Task' // Or map customer if available
    }));

    // Combine and Sort Agenda
    const agenda = [...appointments, ...tasks].sort((a, b) => 
        new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

    // Transform Invoices (Casting to our UI type)
    const invoices: RecentInvoice[] = (invoicesResult.data || []).map((inv: any) => ({
        id: inv.id,
        invoice_uid: inv.invoice_uid,
        status: inv.status,
        due_date: inv.due_date,
        total: inv.total,
        customers: inv.customers,
        currency: 'USD' // Default or fetch from DB
    }));

    return {
        stats: statsResult,
        agenda,
        invoices,
    };
}

export default async function ProfessionalServicesDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Fetch data on the server
    const { stats, agenda, invoices } = await getProfessionalDashboardData(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Client Services Dashboard</h2>
                    <p className="text-muted-foreground">Your command center for managing clients and billable work.</p>
                </div>
                <div className="space-x-2">
                    <Button variant="outline">New Client</Button>
                    <Button>New Invoice</Button>
                </div>
            </div>

            {/* Pass server-fetched stats to the client component */}
            <DashboardStats stats={stats} />

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {/* Pass server-fetched agenda */}
                <TodaysAgenda items={agenda} />
                
                <div className="space-y-6">
                    {/* TimeLogWidget handles its own actions/state internally */}
                    <TimeLogWidget />
                    
                    {/* Pass server-fetched invoices */}
                    <FinancialSnapshot invoices={invoices} />
                </div>
            </div>
        </div>
    );
}