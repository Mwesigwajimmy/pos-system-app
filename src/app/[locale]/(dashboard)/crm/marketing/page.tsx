import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { CampaignList } from '@/components/crm/marketing/CampaignList';
import { CreateCampaignModal } from '@/components/crm/marketing/CreateCampaignModal';

/**
 * Retrieves the current operator and verifies permissions.
 */
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

/**
 * Fetches the database records for all marketing campaigns.
 */
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
        console.error("Database error fetching campaigns:", error);
        return [];
    }

    return data;
}

export default async function MarketingCampaignsPage() {
    // Standardizing for Next.js 15
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    // Permission Security Layer - Clean Error State
    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
         return (
             <div className="flex flex-col items-center justify-center flex-1 h-full p-10 bg-white">
                <div className="max-w-md text-center space-y-3">
                    <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
                    <p className="text-sm text-slate-500 font-medium">
                        You do not have the required permissions to access the marketing management module.
                    </p>
                </div>
            </div>
        );
    }
    
    const campaigns = await getMarketingCampaigns(supabase);

    return (
        <div className="flex-1 p-6 md:p-10 bg-white">
            {/* Header Section: Clean, Balanced, and Professionally Positioned */}
            <header className="flex flex-wrap items-center justify-between gap-6 mb-10">
                 <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketing Campaigns</h1>
                    <p className="text-sm font-medium text-slate-500">
                        Manage and track your organization's email and SMS communication strategy.
                    </p>
                </div>
                <div className="flex items-center">
                    <CreateCampaignModal employeeId={currentUser.id} />
                </div>
            </header>

            {/* Campaign Dashboard Content */}
            <div className="bg-white border-t border-slate-100 pt-6">
                <CampaignList campaigns={campaigns} />
            </div>
        </div>
    );
}