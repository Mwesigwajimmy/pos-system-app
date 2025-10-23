import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { WorkOrderList } from '@/components/field-service/work-orders/WorkOrderList';
import { CreateWorkOrderModal } from '@/components/field-service/work-orders/CreateWorkOrderModal';

async function getAllWorkOrders(supabase: any) {
    const { data, error } = await supabase.from('work_orders').select(`id, work_order_uid, summary, status, scheduled_date, customers ( id, name )`).order('scheduled_date', { ascending: false });
    if (error) { console.error("Error fetching work orders:", error); return []; }
    return data;
}

export default async function WorkOrdersPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const workOrders = await getAllWorkOrders(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Work Orders</h2>
                    <p className="text-muted-foreground">Manage all scheduled and completed field service jobs.</p>
                </div>
                <CreateWorkOrderModal />
            </div>
            <WorkOrderList workOrders={workOrders} />
        </div>
    );
}