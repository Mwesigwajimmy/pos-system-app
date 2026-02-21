import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format, subMonths } from 'date-fns';
import { redirect } from 'next/navigation';
import { ComplianceHub } from '@/components/compliance/ComplianceHub';

async function getComplianceHubData(supabase: any, from: string, to: string, activeSlug: string) {
    // 1. Resolve the physical organization ID from the slug
    const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('slug', activeSlug)
        .single();

    if (!org) throw new Error("Organization not found");

    // 2. Parallel Fetch using the Master Interconnected RPC we just created
    // This now pulls the REAL Forensic Integrity Score from the Audit Module
    const [taxReportResult, tasksResult] = await Promise.all([
        supabase.rpc('generate_tax_report', { 
            p_start_date: from, 
            p_end_date: to,
            p_entity_id: org.id 
        }).single(),
        supabase
            .from('compliance_tasks')
            .select('*')
            .eq('business_id', org.id)
            .order('due_date', { ascending: true })
            .limit(10) // Only top tasks for the hub
    ]);

    // Format the data to match the UI component expectations
    const taxSummary = {
        total_revenue: taxReportResult.data?.taxable_sales || 0,
        total_taxable_revenue: taxReportResult.data?.taxable_sales || 0,
        total_tax_collected: taxReportResult.data?.tax_liability || 0,
        forensic_score: taxReportResult.data?.forensic_integrity_score || 100 // THE AUDIT LINK
    };

    const tasks = tasksResult.data || [];

    return { taxSummary, tasks, businessId: org.id, entityName: org.name };
}

export default async function CompliancePage({
    searchParams
}: {
    searchParams: { from?: string, to?: string }
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTH CHECK
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. SOVEREIGN CONTEXT RESOLUTION
    const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("active_organization_slug")
        .eq("user_id", user.id)
        .single();

    const activeSlug = userProfile?.active_organization_slug;
    if (!activeSlug) return <div className="p-8 text-red-500 font-mono">Error: No active organization context found.</div>;

    // 3. DATE LOGIC
    const toDate = searchParams.to ? new Date(searchParams.to) : new Date();
    const fromDate = searchParams.from ? new Date(searchParams.from) : subMonths(toDate, 1);
    const to = format(toDate, 'yyyy-MM-dd');
    const from = format(fromDate, 'yyyy-MM-dd');
    
    // 4. FETCH INTERCONNECTED DATA
    const { taxSummary, tasks, businessId, entityName } = await getComplianceHubData(supabase, from, to, activeSlug);
    
    const reportPeriod = `${format(fromDate, 'PPP')} - ${format(toDate, 'PPP')}`;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-700">
            {/* Header informing user exactly which entity they are looking at */}
            <div className="border-l-4 border-blue-600 pl-4 py-1">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Autonomous Compliance Hub</span>
                <h3 className="text-sm font-medium text-slate-500 italic">Connected to: {entityName}</h3>
            </div>

            <ComplianceHub
                taxSummary={taxSummary}
                taxTransactions={[]} // Transactions can be drilled down into via the specific Sales Tax page
                tasks={tasks}
                reportPeriod={reportPeriod}
                businessId={businessId} 
            />
        </div>
    );
}