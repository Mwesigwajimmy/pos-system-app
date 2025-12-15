import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// FIX 1: Use Default Imports (Remove curly braces)
import MobileTechnicianDashboard from '@/components/field-service/technician/MobileTechnicianDashboard';
import OfflineCapabilityManager from '@/components/field-service/technician/OfflineCapabilityManager';

export default async function TechnicianPortalPage({ params: { locale } }: { params: { locale: string } }) {
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
    // The components will use this to fetch their own data safely
    const tenantContext = {
        tenantId: profile.business_id,
        currency: profile.currency || 'USD'
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">My Jobs</h2>
                    <p className="text-muted-foreground">
                        Manage your daily route and job execution.
                    </p>
                </div>
                {/* 
                   FIX 2: Correct Props
                   OfflineCapabilityManager takes 'tenant' object, not 'tenantId' string 
                */}
                <OfflineCapabilityManager tenant={tenantContext} />
            </div>
            
            {/* 
               FIX 3: Correct Props
               MobileTechnicianDashboard expects 'currentUser' (ID string) and 'tenant' object
            */}
            <MobileTechnicianDashboard 
                currentUser={user.id}
                tenant={tenantContext} 
            />
        </div>
    );
}