import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// FIX: Use named imports to match component exports
import { VolunteerList } from '@/components/nonprofit/volunteering/VolunteerList';
import { VolunteerHoursTracker } from '@/components/nonprofit/volunteering/VolunteerHoursTracker';
import { VolunteerSignupModal } from '@/components/nonprofit/volunteering/VolunteerSignupModal';

export default async function VolunteeringPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("business_id, currency") 
        .eq("id", user.id)
        .single();

    if (error || !profile?.business_id) {
        return <div className="p-8 text-destructive">Unauthorized: No organization found.</div>;
    }

    const tenantId = profile.business_id;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Volunteer Management</h2>
                    <p className="text-muted-foreground">Recruit, track hours, and manage volunteer shifts.</p>
                </div>
                {/* Modal handles its own open state and trigger button */}
                <VolunteerSignupModal tenantId={tenantId} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                 <VolunteerList tenantId={tenantId} />
                 <VolunteerHoursTracker tenantId={tenantId} />
            </div>
        </div>
    );
}