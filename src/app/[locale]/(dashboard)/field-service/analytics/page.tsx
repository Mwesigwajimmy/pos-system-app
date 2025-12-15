import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Component Imports
// Ensure these use default imports based on your component definitions
import WorkOrderKPIDashboard from '@/components/field-service/analytics/WorkOrderKPIDashboard';
import TechnicianPerformanceDashboard from '@/components/field-service/analytics/TechnicianPerformanceDashboard';

export default async function AnalyticsPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Supabase Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 2. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Fetch Tenant Context from 'profiles'
    // Using your system's logic: profiles table holds the business_id link
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("business_id, currency") 
        .eq("id", user.id)
        .single();

    // 4. Enterprise Security Validation
    if (error || !profile?.business_id) {
        console.error("Analytics Access Error:", error);
        return (
            <div className="flex h-[50vh] items-center justify-center p-8 text-destructive">
                Unauthorized: No Business linked to this account.
            </div>
        );
    }

    // 5. Construct the Tenant Context Object
    // The components expect a 'tenant' object prop containing these fields
    const tenantContext = {
        tenantId: profile.business_id,
        currency: profile.currency || 'USD'
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Service Analytics</h2>
                    <p className="text-muted-foreground">
                        Operational insights, SLA tracking, and technician performance metrics.
                    </p>
                </div>
                {/* Optional: Display Context Badge */}
                <div className="hidden md:block">
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                        {tenantContext.currency}
                    </span>
                </div>
            </div>
            
            {/* 6. Render Client Components with Context */}
            {/* These components will use the tenantId to fetch their own specific data */}
            <WorkOrderKPIDashboard tenant={tenantContext} />
            
            <div className="mt-8">
                <TechnicianPerformanceDashboard tenant={tenantContext} />
            </div>
        </div>
    );
}