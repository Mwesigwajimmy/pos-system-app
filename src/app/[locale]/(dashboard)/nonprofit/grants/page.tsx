import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Components (Using Default Imports now)
import GrantsList from '@/components/nonprofit/grants/GrantsList';
import GrantComplianceTracker from '@/components/nonprofit/grants/GrantComplianceTracker';
import ApplyGrantModal from '@/components/nonprofit/grants/ApplyGrantModal';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function GrantsPage({ params: { locale } }: PageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    // 2. Fetch Profile/Tenant
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("business_id, currency") 
        .eq("id", user.id)
        .single();

    if (error || !profile?.business_id) {
        return (
            <div className="p-8 text-destructive border border-destructive/20 bg-destructive/10 rounded-md m-4">
                <strong>Unauthorized:</strong> Unable to load organization data.
            </div>
        );
    }

    const tenantContext = {
        tenantId: profile.business_id,
        currency: profile.currency || 'USD'
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Grant Management</h2>
                    <p className="text-muted-foreground mt-1">
                        Track applications, manage deadlines, and ensure compliance.
                    </p>
                </div>
                {/* Modal handles its own trigger button */}
                <ApplyGrantModal tenant={tenantContext} />
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <GrantsList tenant={tenantContext} />
                </div>
                <div className="lg:col-span-1">
                    <GrantComplianceTracker tenant={tenantContext} />
                </div>
            </div>
        </div>
    );
}