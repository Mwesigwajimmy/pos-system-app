import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// We will create this component in the next step
import { DispatchCalendar } from '@/components/field-service/schedule/DispatchCalendar';
import { Button } from '@/components/ui/button';

// Define the type for the nested assignment object
interface WorkOrderAssignment {
    employees: {
        full_name: string;
    } | null;
}

// Define the type for the work order data returned by the Supabase query
interface WorkOrderFromQuery {
    id: string;
    work_order_uid: string;
    summary: string;
    status: string;
    priority: string;
    scheduled_date: string;
    customers: { name: string } | null;
    work_order_assignments: WorkOrderAssignment[];
}

// Data fetching function for all scheduled work orders
async function getScheduledWorkOrders(supabase: any) {
    const { data, error } = await supabase
        .from('work_orders')
        .select(`
            id,
            work_order_uid,
            summary,
            status,
            priority,
            scheduled_date,
            completed_at,
            customers ( name ),
            work_order_assignments ( employees ( id, full_name ) )
        `)
        .in('status', ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS']);

    if (error) {
        console.error("Error fetching work orders:", error);
        return [];
    }
    
    // Transform the data into the event format that FullCalendar expects
    return data.map((wo: WorkOrderFromQuery) => ({
        id: wo.id,
        title: wo.summary,
        start: wo.scheduled_date,
        extendedProps: {
            uid: wo.work_order_uid,
            status: wo.status,
            priority: wo.priority,
            customer: wo.customers?.name || 'N/A',
            technicians: wo.work_order_assignments
                .map((a: WorkOrderAssignment) => a.employees?.full_name)
                .filter(Boolean) // This removes any null/undefined names
        }
    }));
}

export default async function SchedulePage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const events = await getScheduledWorkOrders(supabase);

    return (
        <div className="flex flex-col h-[calc(100vh-57px)]">
             <header className="flex-shrink-0 p-4 md:p-6 flex items-center justify-between border-b bg-card">
                 <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Dispatch & Schedule</h2>
                    <p className="text-muted-foreground">
                        Drag and drop to schedule jobs and assign technicians.
                    </p>
                </div>
                <div>
                    {/* The "New Work Order" modal will be created in a later step */}
                    <Button>New Work Order</Button>
                </div>
            </header>
            
            <main className="flex-grow p-4 bg-muted/20">
                 {/* The main interactive calendar component */}
                <DispatchCalendar initialEvents={events} />
            </main>
        </div>
    );
}