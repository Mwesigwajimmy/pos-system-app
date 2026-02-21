import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format, subMonths } from 'date-fns';
import { redirect } from 'next/navigation';
import { ComplianceHub } from '@/components/compliance/ComplianceHub';

export default async function CompliancePage({
    searchParams
}: {
    searchParams: { from?: string, to?: string }
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTHENTICATION (Hard Guard)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. THE MASTER IDENTITY RESOLVER (Absolute Truth)
    // We pull every relevant ID from the Master 'profiles' table using auth.uid()
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
            business_id,
            tenant_id,
            organization_id,
            active_organization_slug,
            business_name
        `)
        .eq('id', user.id)
        .single();

    // Enterprise Safety Check: No more assumptions
    if (profileError || !profile?.business_id) {
        console.error("Master Identity Error:", profileError);
        return (
            <div className="p-8 border-2 border-red-200 rounded-xl bg-red-50 text-red-900 font-mono">
                <h2 className="font-bold underline uppercase">Fiduciary Context Panic</h2>
                <p className="text-xs mt-2 italic">The system could not resolve a Master Business ID for session: {user.id}</p>
                <p className="text-xs mt-1">Please ensure your Master Profile has a valid 'business_id' and 'tenant_id'.</p>
            </div>
        );
    }

    const businessId = profile.business_id;
    const tenantId = profile.tenant_id;
    const entityName = profile.business_name || "Sovereign Entity";

    // 3. DATE LOGIC
    const toDate = searchParams.to ? new Date(searchParams.to) : new Date();
    const fromDate = searchParams.from ? new Date(searchParams.from) : subMonths(toDate, 1);
    const to = format(toDate, 'yyyy-MM-dd');
    const from = format(fromDate, 'yyyy-MM-dd');
    
    // 4. FETCH DATA (Using the Master Business ID)
    const { data: taxSummary } = await supabase.rpc('generate_sales_tax_report', { 
        start_date: from, 
        p_end_date: to, // Ensure param name matches your RPC
        p_business_id: businessId 
    });

    const reportPeriod = `${format(fromDate, 'PPP')} - ${format(toDate, 'PPP')}`;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-700">
            {/* Context Badge: Proves the system is "Smart" and knows where it is */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-md w-fit text-[10px] font-mono tracking-widest uppercase shadow-xl">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Entity: {entityName}
            </div>

            <ComplianceHub
                taxSummary={taxSummary || { total_revenue: 0, total_taxable_revenue: 0, total_tax_collected: 0 }}
                taxTransactions={[]} 
                tasks={[]} 
                reportPeriod={reportPeriod}
                businessId={businessId} 
            />
        </div>
    );
}