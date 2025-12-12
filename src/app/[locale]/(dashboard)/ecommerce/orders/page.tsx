import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import the real component
import { OrderList, Order } from '@/components/ecommerce/OrderList';

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
async function getOnlineOrders(supabase: any): Promise<Order[]> {
    // Enterprise Fetch:
    // 1. Select basic order details
    // 2. Join 'customers' to get the name (using the foreign key 'customer_id' or 'customers')
    // 3. Limit to 500 for initial load performance (Pagination should ideally be server-side for >10k rows)
    
    const { data, error } = await supabase
        .from('online_orders')
        .select(`
            id,
            order_uid,
            status,
            total_amount,
            created_at,
            customers ( 
                id, 
                name 
            )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error("Error fetching online orders:", error.message);
        return [];
    }

    return data as Order[];
}

// ----------------------------------------------------------------------
// 3. MAIN PAGE COMPONENT
// ----------------------------------------------------------------------
export default async function OrderManagementPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Security Check
    await getCurrentUser(supabase);
    
    // 2. Fetch Real Data
    const orders = await getOnlineOrders(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
                    <p className="text-muted-foreground">
                        View and process all incoming orders from your online storefront.
                    </p>
                </div>
                {/* Optional: 'Export' or 'Create Manual Order' buttons */}
            </div>

            {/* Render the Client Table */}
            <OrderList orders={orders} />
        </div>
    );
}