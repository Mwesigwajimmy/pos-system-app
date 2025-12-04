import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// FIX: Ensure correct import if it's a default export
import ResourceAllocationHeatmap from '@/components/professional-services/resource-planning/ResourceAllocationHeatmap';

export default async function ResourcePlanningPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div className="p-8">Unauthorized.</div>;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Resource Planning</h2>
                    <p className="text-muted-foreground">Manage consultant availability and allocations.</p>
                </div>
            </div>
            {/* FIX: Pass 'tenant' object instead of 'tenantId' string */}
            <ResourceAllocationHeatmap tenant={{ tenantId: profile.business_id }} />
        </div>
    );
}