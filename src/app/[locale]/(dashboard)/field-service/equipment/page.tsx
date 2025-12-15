import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Component Imports - Using Named Imports based on your file export
import { EquipmentList } from '@/components/field-service/equipment/EquipmentList';
import { CreateEquipmentModal } from '@/components/field-service/equipment/CreateEquipmentModal';

// Enterprise: Scoped Data Fetching
async function getTenantEquipment(supabase: any, tenantId: string) {
    const { data, error } = await supabase
        .from('equipment')
        .select(`*`)
        // CRITICAL: Filter by tenant_id
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .limit(500);

    if (error) { 
        console.error("Error fetching equipment:", error); 
        return []; 
    }
    return data;
}

export default async function EquipmentPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Supabase Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Fetch Tenant Context from 'profiles'
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("business_id, currency") 
        .eq("id", user.id)
        .single();

    // 4. Security Check
    if (error || !profile?.business_id) {
        return (
            <div className="flex h-[50vh] items-center justify-center p-8 text-destructive">
                Unauthorized: No Business linked to this account.
            </div>
        );
    }

    // 5. Data Fetching
    const equipment = await getTenantEquipment(supabase, profile.business_id);

    // 6. Context Construction
    const tenantContext = {
        tenantId: profile.business_id,
        currency: profile.currency || 'USD'
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Equipment Management</h2>
                    <p className="text-muted-foreground">Track all your company assets, vehicles, and tools.</p>
                </div>
                {/* 
                   Now this works because CreateEquipmentModal accepts the 'tenant' prop 
                */}
                <CreateEquipmentModal tenant={tenantContext} />
            </div>
            
            <EquipmentList 
                equipment={equipment} 
                tenant={tenantContext} 
            />
        </div>
    );
}