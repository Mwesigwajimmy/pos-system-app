import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import the client component and interface
import { Customer360View, CustomerProfile } from '@/components/ecommerce/Customer360View';

// ----------------------------------------------------------------------
// 1. TYPE DEFINITIONS
// ----------------------------------------------------------------------
// Exact shape of the data returned by the PostgreSQL RPC function
interface CustomerAnalyticsDB {
    id: string;
    name: string;
    email: string;
    segment: string;
    orders_count: number;
    total_spent: number;
    last_order_date: string | null;
    region: string;
    entity: string;
    tenant_id: string;
}

// ----------------------------------------------------------------------
// 2. AUTH & SECURITY
// ----------------------------------------------------------------------
async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        redirect('/login');
    }
    return user;
}

// ----------------------------------------------------------------------
// 3. ENTERPRISE DATA FETCHING (RPC)
// ----------------------------------------------------------------------
async function getCustomer360Data(supabase: any): Promise<CustomerProfile[]> {
    /* 
       ENTERPRISE IMPLEMENTATION:
       We call a dedicated PostgreSQL function (RPC) 'get_customer_360_analytics'.
       This performs server-side aggregation (SUM, COUNT) in the DB engine,
       drastically reducing bandwidth and memory usage compared to joining raw tables.
    */

    const { data, error } = await supabase
        .rpc('get_customer_360_analytics', { 
            limit_val: 1000, // Safe upper limit for the initial view
            offset_val: 0 
        });

    if (error) {
        console.error("CRITICAL: Failed to fetch Customer 360 Analytics:", error.message);
        // In enterprise apps, we might return an empty array or throw to an Error Boundary
        return []; 
    }

    // Map DB snake_case to Domain Model camelCase
    // This ensures the frontend is decoupled from specific DB column names
    return (data as CustomerAnalyticsDB[]).map((row) => ({
        id: row.id,
        name: row.name || 'Unknown Profile',
        email: row.email || 'No Email',
        segment: (row.segment as any) || 'Regular',
        ordersCount: row.orders_count || 0,
        totalSpent: row.total_spent || 0,
        lastOrder: row.last_order_date 
            ? new Date(row.last_order_date).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'Never',
        region: row.region || 'Global',
        entity: row.entity || 'Main Entity',
        tenantId: row.tenant_id
    }));
}

// ----------------------------------------------------------------------
// 4. MAIN PAGE COMPONENT
// ----------------------------------------------------------------------
export default async function CustomerManagementPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Authenticate
    await getCurrentUser(supabase);
    
    // 2. Fetch Data via RPC
    const customerData = await getCustomer360Data(supabase);

    // 3. Render
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Customer Management</h2>
                    <p className="text-muted-foreground">
                        Real-time 360° analytics: LTV, churn risk, and regional performance.
                    </p>
                </div>
            </div>

            <Customer360View initialCustomers={customerData} />
        </div>
    );
}