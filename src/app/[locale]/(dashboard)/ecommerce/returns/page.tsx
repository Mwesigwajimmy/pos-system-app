import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import the real component
import { OrderReturnsWorkflow, OrderReturn } from '@/components/ecommerce/OrderReturnsWorkflow';

// ----------------------------------------------------------------------
// 1. AUTH UTILITY
// ----------------------------------------------------------------------
async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        redirect('/login');
    }
    return user;
}

// ----------------------------------------------------------------------
// 2. DATA FETCHING SERVICE
// ----------------------------------------------------------------------
async function getOrderReturns(supabase: any): Promise<OrderReturn[]> {
    /*
      ENTERPRISE QUERY:
      Fetch Returns -> Join Orders -> Join Customers
      We use standard Supabase foreign key joining syntax.
    */
    const { data, error } = await supabase
        .from('order_returns')
        .select(`
            id,
            rma_number,
            reason,
            status,
            requested_at,
            processed_at,
            approved_by,
            online_orders (
                order_uid,
                region_code,
                entity_name,
                tenant_id
            ),
            customers (
                name
            )
        `)
        .order('requested_at', { ascending: false });

    if (error) {
        console.error("Error fetching order returns:", error.message);
        return [];
    }

    // ------------------------------------------------------------------
    // 3. DATA TRANSFORMATION
    // ------------------------------------------------------------------
    // Convert complex DB object into flat UI-friendly structure
    return data.map((item: any) => {
        // Safe navigation for nested relations
        const order = item.online_orders || {};
        const customer = item.customers || {};

        return {
            id: item.id,
            returnNumber: item.rma_number,
            orderNumber: order.order_uid || 'UNK-ORDER',
            customer: customer.name || 'Unknown Customer',
            reason: item.reason || 'No reason provided',
            
            // Date Formatting
            requested: new Date(item.requested_at).toLocaleDateString('en-GB', {
                year: 'numeric', month: 'short', day: 'numeric'
            }),
            processedAt: item.processed_at 
                ? new Date(item.processed_at).toLocaleDateString('en-GB', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  }) 
                : null,
            
            approvedBy: item.approved_by, // Assuming this stores the email or name of the admin
            status: item.status, // Ensure DB status matches: 'pending'|'approved'|'rejected'|'completed'
            
            // Geographic Data
            entity: order.entity_name || 'Main Entity',
            region: order.region_code || 'Global',
            tenantId: order.tenant_id
        };
    });
}

// ----------------------------------------------------------------------
// 3. MAIN PAGE COMPONENT
// ----------------------------------------------------------------------
export default async function OrderReturnsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Auth Check
    await getCurrentUser(supabase);
    
    // 2. Fetch Data
    const returnsData = await getOrderReturns(supabase);

    // 3. Render
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Returns & Refunds</h2>
                    <p className="text-muted-foreground">
                        Manage customer return requests (RMA) and approve refunds.
                    </p>
                </div>
            </div>

            <OrderReturnsWorkflow returns={returnsData} />
        </div>
    );
}