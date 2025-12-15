import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// FIX 1: Use Default Imports (No curly braces)
import SmartScheduler from '@/components/field-service/schedule/SmartScheduler';
import RouteOptimization from '@/components/field-service/schedule/RouteOptimization';

export default async function SmartSchedulePage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Supabase Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Fetch Tenant Context from 'profiles'
    // This connects the User -> Profile -> Business ID (Tenant)
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

    // 5. Construct Context Object
    // The SmartScheduler component uses this to fetch its own data safely
    const tenantContext = {
        tenantId: profile.business_id,
        currency: profile.currency || 'USD'
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Smart Scheduler</h2>
                    <p className="text-muted-foreground">
                        AI-powered optimization for route planning and technician allocation.
                    </p>
                </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    {/* 
                        FIX 2: Prop Alignment
                        The component handles its own data fetching via useQuery using the tenantId.
                        We simply pass the tenant context.
                    */}
                    <SmartScheduler tenant={tenantContext} />
                </div>
                <div className="lg:col-span-1">
                    <RouteOptimization tenant={tenantContext} />
                </div>
            </div>
        </div>
    );
}