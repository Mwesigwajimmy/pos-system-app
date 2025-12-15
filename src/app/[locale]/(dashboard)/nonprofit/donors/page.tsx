import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Component Imports (Matching your folder structure)
import DonorList from '@/components/nonprofit/donors/DonorList';
// DonorProfile is likely used inside the list or as a dynamic route, but we can render it if needed or keep it for the dynamic page.

export default async function DonorsPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("business_id, currency, country") 
        .eq("id", user.id)
        .single();

    if (error || !profile?.business_id) {
        return <div className="p-8 text-destructive">Unauthorized: No Organization linked.</div>;
    }

    const tenantContext = {
        tenantId: profile.business_id,
        currency: profile.currency || 'USD',
        locale: locale
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Donor Management</h2>
                    <p className="text-muted-foreground">Manage donor profiles, history, and engagement.</p>
                </div>
            </div>
            {/* Pass context to the Client Component */}
            <DonorList tenant={tenantContext} />
        </div>
    );
}