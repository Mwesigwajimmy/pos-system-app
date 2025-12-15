import { cookies } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// FIX: This component now requires the 'tenant' prop for security
import { CreateWorkOrderModal } from '@/components/field-service/work-orders/CreateWorkOrderModal';

// Icons
import { Briefcase, Calendar, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';

// --- TYPES ---
interface DashboardJob {
    id: string;
    work_order_uid: string;
    summary: string;
    status: string;
    customers: { name: string; } | null; 
}

// --- DATA FETCHING (SECURE) ---
async function getFieldServiceDashboardData(supabase: any, tenantId: string) {
    const today = new Date();
    // Use ISO strings for safer DB comparison
    const todayStart = today.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const todayEnd = today.toISOString().split('T')[0] + 'T23:59:59.999Z';

    const [statsData, todayJobsData, priorityJobsData, recentJobsData] = await Promise.all([
        // 1. Stats Queries (Parallelized)
        (async () => {
            const { count: activeJobs } = await supabase
                .from('work_orders')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId) // SECURE
                .in('status', ['scheduled', 'dispatched', 'in_progress']); // Standardized snake_case

            const { count: upcoming } = await supabase
                .from('work_orders')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId) // SECURE
                .gte('scheduled_date', todayStart);

            const nextMonth = new Date(); 
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            
            const { count: maintenanceDue } = await supabase
                .from('equipment')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId) // SECURE
                .lte('next_maintenance_date', nextMonth.toISOString());

            return { 
                activeJobs: activeJobs ?? 0, 
                upcoming: upcoming ?? 0, 
                maintenanceDue: maintenanceDue ?? 0 
            };
        })(),

        // 2. Today's Jobs
        supabase
            .from('work_orders')
            .select(`id, work_order_uid, summary, status, customers ( name )`)
            .eq('tenant_id', tenantId) // SECURE
            .gte('scheduled_date', todayStart)
            .lte('scheduled_date', todayEnd)
            .order('scheduled_date', { ascending: true }),

        // 3. High Priority Jobs
        supabase
            .from('work_orders')
            .select(`id, work_order_uid, summary, status, customers ( name )`)
            .eq('tenant_id', tenantId) // SECURE
            .in('priority', ['HIGH', 'URGENT'])
            .in('status', ['scheduled', 'dispatched', 'in_progress'])
            .limit(5),

        // 4. Recently Completed
        supabase
            .from('work_orders')
            .select(`id, work_order_uid, summary, customers ( name ), completed_at`)
            .eq('tenant_id', tenantId) // SECURE
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(5)
    ]);

    return {
        stats: statsData,
        todayJobs: (todayJobsData.data as any[]) ?? [], // Type assertion to handle joined data
        priorityJobs: (priorityJobsData.data as any[]) ?? [],
        recentJobs: (recentJobsData.data as any[]) ?? [],
    };
}

// --- MAIN PAGE COMPONENT ---
export default async function FieldServiceDashboardPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Supabase
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Fetch Tenant Context from 'profiles'
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("business_id, currency") 
        .eq("id", user.id)
        .single();

    // 4. Enterprise Security Validation
    if (error || !profile?.business_id) {
        return (
            <div className="flex h-[50vh] items-center justify-center p-8 text-destructive">
                Unauthorized: No Business linked to this account.
            </div>
        );
    }

    // 5. Fetch Tenant-Scoped Data
    const { stats, todayJobs, priorityJobs, recentJobs } = await getFieldServiceDashboardData(supabase, profile.business_id);

    // 6. Construct Context
    const tenantContext = {
        tenantId: profile.business_id,
        currency: profile.currency || 'USD'
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Field Service Dashboard</h2>
                    <p className="text-muted-foreground">Your command center for daily operations.</p>
                </div>
                {/* FIX: Passed tenant context to Modal */}
                <CreateWorkOrderModal tenant={tenantContext} />
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeJobs}</div>
                        <p className="text-xs text-muted-foreground">Currently scheduled or in progress</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming Jobs</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.upcoming}</div>
                        <p className="text-xs text-muted-foreground">Jobs scheduled for today onwards</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.maintenanceDue}</div>
                        <p className="text-xs text-muted-foreground">Equipment service needed in 30 days</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {/* Today's Schedule Table */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Today's Schedule</CardTitle>
                        <CardDescription>Work orders scheduled for {format(new Date(), 'PPP')}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Work Order</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Summary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {todayJobs.length > 0 ? (
                                    todayJobs.map((job: DashboardJob) => (
                                        <TableRow key={job.id}>
                                            <TableCell className="font-medium font-mono text-xs">{job.work_order_uid}</TableCell>
                                            <TableCell>{job.customers?.name || 'N/A'}</TableCell>
                                            <TableCell>{job.summary}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{job.status.replace('_', ' ')}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/field-service/work-orders/${job.id}`}>
                                                    <Button variant="outline" size="sm">View</Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No jobs scheduled for today.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Right Column: Priority & Recent */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center text-base">
                                <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" /> High Priority Queue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {priorityJobs.length > 0 ? (
                                priorityJobs.map((job: DashboardJob) => (
                                    <div key={job.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">{job.customers?.name}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{job.summary}</p>
                                        </div>
                                        <Link href={`/field-service/work-orders/${job.id}`}>
                                            <Button variant="secondary" size="sm" className="h-7 text-xs">Details</Button>
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No urgent jobs in the queue.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center text-base">
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Recently Completed
                             </CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-4">
                             {recentJobs.length > 0 ? (
                                recentJobs.map((job: DashboardJob) => (
                                    <div key={job.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">{job.customers?.name}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{job.summary}</p>
                                        </div>
                                        <Link href={`/field-service/work-orders/${job.id}`}>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No jobs have been completed recently.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}