import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Wrench, GanttChartSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';

// Import the real components
import { JobCostsList } from '@/components/contractor/jobs/JobCostsList';
import { AddCostModal } from '@/components/contractor/jobs/AddCostModal';


// Data fetching function for a single job and its associated costs
async function getJobDetails(supabase: any, jobId: string) {
    const { data: job, error } = await supabase
        .from('projects')
        .select(`
            *,
            customers ( name ),
            job_costs ( * )
        `)
        .eq('id', jobId)
        .single();

    if (error || !job) {
        console.error("Error fetching job details:", error);
        return null;
    }
    
    // Server-side calculation ensures data is always fresh
    // --- THIS IS THE FIXED LINE ---
    const actualCost = job.job_costs.reduce((sum: number, cost: { amount: number }) => sum + cost.amount, 0);
    
    // Self-healing mechanism: If the denormalized `actual_cost` is out of sync, this fixes it.
    // This can happen if a cost is ever deleted or updated without a transaction.
    if (actualCost !== job.actual_cost) {
        await supabase.from('projects').update({ actual_cost: actualCost }).eq('id', job.id);
        job.actual_cost = actualCost;
    }

    return job;
}

interface JobDetailsPageProps {
    params: {
        jobId: string;
    };
}

export default async function JobDetailsPage({ params }: JobDetailsPageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const job = await getJobDetails(supabase, params.jobId);

    if (!job) {
        notFound();
    }
    
    const budget = job.estimated_budget || 0;
    const actual = job.actual_cost || 0;
    const variance = budget - actual;
    const percentage = budget > 0 ? (actual / budget) * 100 : 0;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="mb-6 flex justify-between items-center">
                <Button asChild variant="outline" size="sm">
                    <Link href="/contractor/jobs">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Jobs
                    </Link>
                </Button>
                <AddCostModal projectId={job.id} />
            </div>

            {/* Header Section */}
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">{job.name}</h2>
                <p className="text-muted-foreground">{job.project_uid} - {job.customers?.name || 'No Customer'}</p>
            </div>
            
            {/* KPI Cards for Job Financials */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estimated Budget</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(budget)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Actual Costs to Date</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(actual)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Variance</CardTitle>
                        <GanttChartSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", variance < 0 && "text-destructive")}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(variance)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Budget Used</CardTitle></CardHeader>
                    <CardContent>
                         <Progress value={percentage} className={cn(percentage > 90 && "[&>div]:bg-destructive", percentage > 75 && percentage <= 90 && "[&>div]:bg-yellow-500")} />
                         <p className="text-xs text-muted-foreground pt-2">{percentage.toFixed(1)}% of budget consumed</p>
                    </CardContent>
                </Card>
            </div>
            
            {/* Costs Table */}
            <JobCostsList costs={job.job_costs} />

        </div>
    );
}