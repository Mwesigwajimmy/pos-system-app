import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Components
import CampaignList from '@/components/nonprofit/fundraising/CampaignList';
import FundraiserProgress from '@/components/nonprofit/fundraising/FundraiserProgress';
import CreateCampaignModal from '@/components/nonprofit/fundraising/CreateCampaignModal';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function FundraisingPage({ params: { locale } }: PageProps) {
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Fundraising Campaigns</h2>
                    <p className="text-muted-foreground mt-1">
                        Manage events, digital campaigns, and fundraising goals.
                    </p>
                </div>
                {/* Modal now handles its own state and trigger button */}
                <CreateCampaignModal tenant={tenantContext} />
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
                <div className="lg:col-span-3">
                     <CampaignList tenant={tenantContext} />
                </div>
                <div className="lg:col-span-1">
                     <FundraiserProgress tenant={tenantContext} />
                </div>
            </div>
        </div>
    );
}