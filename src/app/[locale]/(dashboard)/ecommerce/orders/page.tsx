import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import the real component
import { OrderList } from '@/components/ecommerce/OrderList';

// This utility should ideally live in a central auth file
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    return user;
}

// Data fetching function for all online orders
async function getOnlineOrders(supabase: any) {
    const { data, error } = await supabase
        .from('online_orders')
        .select(`
            id,
            order_uid,
            status,
            total_amount,
            created_at,
            customers ( id, name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching online orders:", error);
        return [];
    }

    return data;
}

export default async function OrderManagementPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    await getCurrentUser(supabase); // Just for auth check
    
    const orders = await getOnlineOrders(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Online Orders</h2>
                    <p className="text-muted-foreground">
                        View and manage all orders from your online storefront.
                    </p>
                </div>
                 {/* Placeholder for "Export" or other actions */}
            </div>

            {/* Use the real OrderList component */}
            <OrderList orders={orders} />
        </div>
    );
}