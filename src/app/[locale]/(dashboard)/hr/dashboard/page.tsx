import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HrDashboard, { HrKpi } from '@/components/hr/HrDashboard';

async function getKpiData(supabase: any, tenantId: string) {
    // 1. Total Employees
    const { count: empCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'); // RLS automatically handles tenant_id

    // 2. Open Positions
    const { count: jobCount } = await supabase
        .from('job_openings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

    // 3. Payroll (Assuming a 'payroll_runs' table exists)
    const { data: payrollData } = await supabase
        .from('payroll_runs')
        .select('total_cost')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    // 4. Absence Rate (Mock calculation based on real attendance logs count if needed, or static for now)
    // In a real system, you might have a 'kpi_stats' materialized view.

    const kpis: HrKpi[] = [
        { label: "Total Employees", value: empCount || 0, period: "Current" },
        { label: "Open Positions", value: jobCount || 0, period: "Current" },
        // Fallback for payroll if table is empty
        { label: "Payroll Cost", value: payrollData?.total_cost || 0, unit: "UGX", period: "Last Run" },
        { label: "Absence Rate", value: "2.1%", period: "Last Month" }, // You can calculate this via SQL RPC if needed
    ];

    return kpis;
}

export default async function HrDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: employee } = await supabase
        .from('employees')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .single();

    if (!employee) return <div>Access Denied</div>;

    const kpis = await getKpiData(supabase, employee.tenant_id);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">HR Overview</h2>
            <HrDashboard kpis={kpis} />
        </div>
    );
}