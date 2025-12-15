import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Component Imports
import { WorkOrderList } from '@/components/field-service/work-orders/WorkOrderList';
import { CreateWorkOrderModal } from '@/components/field-service/work-orders/CreateWorkOrderModal';

// Enterprise: Scoped Data Fetching
// We renamed this from 'getAllWorkOrders' to 'getTenantWorkOrders' to reflect security
async function getTenantWorkOrders(supabase: any, tenantId: string) {
    const { data, error } = await supabase
        .from('work_orders')
        .select(`
            id, 
            work_order_uid, 
            summary, 
            status, 
            priority,
            scheduled_date, 
            customers ( id, name, address, city )
        `)
        // CRITICAL: Filter by tenant_id to prevent data leaks between organizations
        .eq('tenant_id', tenantId)
        .order('scheduled_date', { ascending: false })
        .limit(100); // Enterprise best practice: Limit initial fetch to prevent performance bottlenecks

    if (error) { 
        console.error("Error fetching work orders:", error); 
        return []; 
    }
    return data;
}

export default async function WorkOrdersPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Supabase Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Fetch Tenant Context from 'profiles'
    // This is the source of truth for the user's business association
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("business_id, currency") 
        .eq("id", user.id)
        .single();

    // 4. Enterprise Security Validation
    if (error || !profile?.business_id) {
        return (
            <div className="flex h-[50vh] items-center justify-center p-8 text-destructive">
                Unauthorized: No Business linked to this account.
            </div>
        );
    }

    // 5. Tenant-Scoped Data Fetching
    const workOrders = await getTenantWorkOrders(supabase, profile.business_id);

    // 6. Construct Context Object
    const tenantContext = {
        tenantId: profile.business_id,
        currency: profile.currency || 'USD'
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Work Orders</h2>
                    <p className="text-muted-foreground">Manage all scheduled and completed field service jobs.</p>
                </div>
                {/* 
                   Pass Tenant Context to the Modal. 
                   New Work Orders must be inserted with the correct 'tenant_id'.
                */}
                <CreateWorkOrderModal tenant={tenantContext} />
            </div>
            
            {/* 
               Pass data and context. 
               The list might need currency context to display pricing/totals.
            */}
            <WorkOrderList 
                workOrders={workOrders} 
                tenant={tenantContext} 
            />
        </div>
    );
}