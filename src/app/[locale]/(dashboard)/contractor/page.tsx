import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Construction, DollarSign, FileText, GanttChartSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActiveJobsList } from '@/components/contractor/jobs/ActiveJobsList';

// A mock component for UI structure if the real one isn't ready.
const RecentCostsChart = () => (
    <Card className="lg:col-span-2">
        <CardHeader>
            <CardTitle>Recent Costs</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="h-[350px] w-full flex items-center justify-center p-10 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">RecentCostsChart Component</p>
            </div>
        </CardContent>
    </Card>
);

// Data fetching function for all contractor dashboard stats
async function getContractorDashboardData(supabase: any) {
    const activeJobsPromise = supabase
        .from('projects')
        .select('id, project_uid, name, estimated_budget, actual_cost')
        .eq('status', 'IN_PROGRESS');
        
    const pendingEstimatesPromise = supabase
        .from('estimates')
        .select('id', { count: 'exact' })
        .eq('status', 'SENT');
        
    // --- THIS IS THE FIXED BLOCK ---
    const totalCostsPromise = supabase
        .from('job_costs')
        .select('amount')
        .then((res: { data: { amount: number }[] | null }) =>
            res.data?.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0) || 0
        );

    const [activeJobsResult, pendingEstimatesResult, totalCosts] = await Promise.all([
        activeJobsPromise,
        pendingEstimatesPromise,
        totalCostsPromise
    ]);

    return {
        activeJobs: activeJobsResult.data || [],
        activeJobsCount: (activeJobsResult.data || []).length,
        pendingEstimatesCount: pendingEstimatesResult.count || 0,
        totalCosts,
    };
}

export default async function ContractorDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { activeJobs, activeJobsCount, pendingEstimatesCount, totalCosts } = await getContractorDashboardData(supabase);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Contractor Dashboard</h2>
                <div className="flex items-center space-x-2">
                    <Button asChild><Link href="/contractor/estimates">New Estimate</Link></Button>
                    <Button asChild><Link href="/contractor/jobs">New Job</Link></Button>
                </div>
            </div>
            
            {/* Top KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                        <Construction className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeJobsCount}</div>
                        <p className="text-xs text-muted-foreground">Currently in progress</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Estimates</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingEstimatesCount}</div>
                        <p className="text-xs text-muted-foreground">Awaiting customer approval</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Costs (This Month)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCosts)}
                        </div>
                        <p className="text-xs text-muted-foreground">Across all active jobs</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Profit Margin</CardTitle>
                        <GanttChartSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">18.2%</div>
                        <p className="text-xs text-muted-foreground">On completed jobs</p>
                    </CardContent>
                </Card>
            </div>
            
            {/* Main Dashboard Layout */}
             <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <ActiveJobsList jobs={activeJobs} />
                </div>
                <RecentCostsChart />
            </div>
        </div>
    );
}