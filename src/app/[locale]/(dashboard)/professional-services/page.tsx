import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

import { DashboardStats } from '@/components/professional-services/dashboard/DashboardStats';
import { TodaysAgenda, AgendaItem } from '@/components/professional-services/dashboard/TodaysAgenda';
import { TimeLogWidget } from '@/components/professional-services/dashboard/TimeLogWidget';
import { FinancialSnapshot, RecentInvoice } from '@/components/professional-services/dashboard/FinancialSnapshot';
import { Button } from '@/components/ui/button';


// --- THE FIX (Part 1): Define the "shape" of the raw data from Supabase ---
// This tells TypeScript what the data looks like right after we fetch it.
type RawAppointment = {
    id: string;
    summary: string;
    scheduled_date: string;
    customers: { name: string; } | null;
};

type RawTask = {
    id: string;
    title: string;
    due_date: string;
    customers: { name: string; } | null;
};


async function getProfessionalDashboardData(supabase: any) {
    const today = new Date();
    const todayStart = format(today, 'yyyy-MM-dd 00:00:00');
    const todayEnd = format(today, 'yyyy-MM-dd 23:59:59');

    const [statsData, appointmentsData, tasksData, invoicesData] = await Promise.all([
        (async () => {
            const { count: activeClients } = await supabase.from('customers').select('*', { count: 'exact', head: true });
            const { count: upcomingAppointments } = await supabase.from('work_orders').select('*', { count: 'exact', head: true }).gte('scheduled_date', todayStart).in('status', ['SCHEDULED']);
            const { count: overdueInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'OVERDUE');
            const { data: unbilled, error } = await supabase.rpc('sum_unbilled_hours');
            return {
                activeClients: activeClients ?? 0,
                upcomingAppointments: upcomingAppointments ?? 0,
                overdueInvoices: overdueInvoices ?? 0,
                unbilledHours: error ? 0 : unbilled,
            };
        })(),
        supabase.from('work_orders').select(`id, summary, scheduled_date, customers ( name )`).gte('scheduled_date', todayStart).lte('scheduled_date', todayEnd).in('status', ['SCHEDULED']),
        supabase.from('tasks').select(`id, title, due_date, customers ( name )`).gte('due_date', todayStart).lte('due_date', todayEnd).eq('is_completed', false),
        supabase.from('invoices').select(`id, invoice_uid, status, due_date, total, customers ( name )`).order('created_at', { ascending: false }).limit(5)
    ]);

    // --- THE FIX (Part 2): Apply the new types to the .map() functions ---
    const appointments: AgendaItem[] = (appointmentsData.data || []).map((a: RawAppointment) => ({ id: a.id, type: 'APPOINTMENT', dateTime: a.scheduled_date, title: a.summary, clientName: a.customers?.name || null }));
    const tasks: AgendaItem[] = (tasksData.data || []).map((t: RawTask) => ({ id: t.id, type: 'TASK', dateTime: t.due_date, title: t.title, clientName: t.customers?.name || null }));
    const agenda = [...appointments, ...tasks].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    return {
        stats: statsData,
        agenda,
        invoices: (invoicesData.data as RecentInvoice[]) ?? [],
    };
}

export default async function ProfessionalServicesDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
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

            <DashboardStats stats={stats} />

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                <TodaysAgenda items={agenda} />
                <div className="space-y-6">
                    <TimeLogWidget />
                    <FinancialSnapshot invoices={invoices} />
                </div>
            </div>
        </div>
    );
}