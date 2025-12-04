import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FinancialReportGenerator from '@/components/professional-services/reports/FinancialReportGenerator';

export default async function ReportsPage({ params: { locale } }: { params: { locale: string } }) {
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

    // FIX: Create the tenant context object
    const tenantContext = {
        tenantId: profile.business_id,
        currency: 'USD' // Default currency, or fetch from profile if available
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Practice Reports</h2>
                    <p className="text-muted-foreground">Utilization, Realization, and P&L Statements.</p>
                </div>
            </div>
            {/* FIX: Pass the 'tenant' object prop instead of 'tenantId' */}
            <FinancialReportGenerator tenant={tenantContext} />
        </div>
    );
}