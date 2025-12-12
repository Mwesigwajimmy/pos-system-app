import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import the real component and interface
import { CartAbandonmentAnalytics, CartAbandonmentEntry } from '@/components/ecommerce/CartAbandonmentAnalytics';

// 1. Auth Check Utility
async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        redirect('/login');
    }
    return user;
}

// 2. Data Fetching Function
async function getAbandonedCarts(supabase: any): Promise<CartAbandonmentEntry[]> {
    // Fetch sessions where status is 'abandoned'
    const { data, error } = await supabase
        .from('cart_sessions') 
        .select(`
            id,
            session_uid,
            user_email,
            created_at,
            item_count,
            total_amount,
            is_reminder_sent,
            region_code,
            tenant_id
        `)
        .eq('status', 'abandoned') // Filter for abandoned carts only
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching abandoned carts:", error);
        return [];
    }

    // 3. Transform DB snake_case to Component camelCase
    return data.map((item: any) => ({
        id: item.id,
        sessionId: item.session_uid || 'N/A',
        user: item.user_email || 'Guest',
        timestamp: new Date(item.created_at).toLocaleString('en-GB', { 
            dateStyle: 'short', 
            timeStyle: 'short' 
        }),
        items: item.item_count || 0,
        value: item.total_amount || 0,
        notified: item.is_reminder_sent || false,
        region: item.region_code || 'Global',
        tenantId: item.tenant_id
    }));
}

export default async function CartAbandonmentPage() {
    // Initialize Supabase Server Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Ensure User is Authenticated
    await getCurrentUser(supabase);
    
    // Fetch Real Data
    const abandonedCarts = await getAbandonedCarts(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Cart Abandonment</h2>
                    <p className="text-muted-foreground">
                        Monitor potential lost revenue and automated recovery workflows.
                    </p>
                </div>
            </div>

            {/* Pass Real Data to Component */}
            <CartAbandonmentAnalytics entries={abandonedCarts} />
        </div>
    );
}