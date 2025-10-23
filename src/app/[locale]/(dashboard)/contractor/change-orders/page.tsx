import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Import the real component
import { ChangeOrderList } from '@/components/contractor/change-orders/ChangeOrderList';


// Data fetching function for all change orders
async function getAllChangeOrders(supabase: any) {
    const { data, error } = await supabase
        .from('change_orders')
        .select(`
            id,
            title,
            status,
            amount_change,
            created_at,
            projects ( id, name, project_uid )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching change orders:", error);
        return [];
    }

    return data;
}

export default async function ContractorChangeOrdersPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    // Add auth check here if needed
    
    const changeOrders = await getAllChangeOrders(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Change Orders</h2>
                    <p className="text-muted-foreground">
                        A central log of all approved and pending changes to project scope and budget.
                    </p>
                </div>
                {/* As noted, a "Create" button for change orders belongs on the specific Job Details page, not this central log. */}
            </div>

            {/* Use the real ChangeOrderList component */}
            <ChangeOrderList changeOrders={changeOrders} />
        </div>
    );
}