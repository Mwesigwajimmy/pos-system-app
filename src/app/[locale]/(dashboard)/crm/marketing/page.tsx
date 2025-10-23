import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import the real components
import { CampaignList } from '@/components/crm/marketing/CampaignList';
import { CreateCampaignModal } from '@/components/crm/marketing/CreateCampaignModal';


// This utility should ideally live in a central auth file
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    const { data: employee } = await supabase
        .from('employees')
        .select('id, role')
        .eq('user_id', user.id)
        .single();
    return employee;
}

// Data fetching function for all marketing campaigns
async function getMarketingCampaigns(supabase: any) {
    const { data, error } = await supabase
        .from('marketing_campaigns')
        .select(`
            id,
            name,
            type,
            status,
            created_at,
            scheduled_at,
            sent_at,
            employees ( id, full_name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching marketing campaigns:", error);
        return [];
    }

    return data;
}

export default async function MarketingCampaignsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
         return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-destructive">Access Denied</h2>
                <p>You do not have permission to access the marketing module.</p>
            </div>
        );
    }
    
    const campaigns = await getMarketingCampaigns(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Marketing Campaigns</h2>
                    <p className="text-muted-foreground">
                        Create and manage your email and SMS marketing campaigns.
                    </p>
                </div>
                 <CreateCampaignModal employeeId={currentUser.id} />
            </div>

            <CampaignList campaigns={campaigns} />
        </div>
    );
}