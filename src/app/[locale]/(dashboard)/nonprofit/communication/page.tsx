import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import CampaignCentre from '@/components/nonprofit/communication/CampaignCentre';
import CommunicationLog from '@/components/nonprofit/communication/CommunicationLog';
import CreateCommCampaignModal from '@/components/nonprofit/communication/CreateCommCampaignModal';

interface PageProps {
  params: { locale: string };
}

export default async function CommunicationPage({ params: { locale } }: PageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase.from("profiles").select("business_id, currency").eq("id", user.id).single();
    if (!profile?.business_id) return <div>Unauthorized</div>;

    const tenantContext = {
        tenantId: profile.business_id,
        currency: profile.currency || 'USD'
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Communication Centre</h2>
                    <p className="text-muted-foreground">Manage email blasts and updates.</p>
                </div>
                {/* This line is now valid because the Modal manages its own state */}
                <CreateCommCampaignModal tenant={tenantContext} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                 <CampaignCentre tenant={tenantContext} />
                 <CommunicationLog tenant={tenantContext} />
            </div>
        </div>
    );
}