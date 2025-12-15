import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Components (Default Imports)
import ImpactDashboard from '@/components/nonprofit/impact/ImpactDashboard';
import BeneficiaryList from '@/components/nonprofit/impact/BeneficiaryList';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function ImpactPage({ params: { locale } }: PageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    // 2. Fetch Profile & Tenant
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Impact & Outcomes</h2>
                    <p className="text-muted-foreground mt-1">
                        Measure and report on your organization's social impact and beneficiary reach.
                    </p>
                </div>
                {/* Add 'Export Report' button here in the future */}
            </div>

            <ImpactDashboard tenant={tenantContext} />
            
            <div className="mt-8">
                <BeneficiaryList tenant={tenantContext} />
            </div>
        </div>
    );
}