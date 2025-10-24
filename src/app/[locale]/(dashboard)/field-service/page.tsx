import { cookies } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateWorkOrderModal } from '@/components/field-service/work-orders/CreateWorkOrderModal';

// Icons
import { Briefcase, Calendar, Wrench, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';


// --- THE FIX (Part 1): Define the "shape" of our job data ---
// This blueprint tells TypeScript what a 'job' object looks like.
interface DashboardJob {
    id: string;
    work_order_uid: string;
    summary: string;
    status: string;
    customers: { name: string; } | null; // Customer can be null
}


// --- DATA FETCHING ---
async function getFieldServiceDashboardData(supabase: any) {
    const today = new Date();
    const todayStart = format(today, 'yyyy-MM-dd 00:00:00');
    const todayEnd = format(today, 'yyyy-MM-dd 23:59:59');

    const [statsData, todayJobsData, priorityJobsData, recentJobsData] = await Promise.all([
        (async () => {
            const { count: activeJobs } = await supabase.from('work_orders').select('*', { count: 'exact', head: true }).in('status', ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS']);
            const { count: upcoming } = await supabase.from('work_orders').select('*', { count: 'exact', head: true }).gte('scheduled_date', todayStart);
            const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1);
            const { count: maintenanceDue } = await supabase.from('equipment').select('*', { count: 'exact', head: true }).lte('next_maintenance_date', nextMonth.toISOString());
            return { activeJobs: activeJobs ?? 0, upcoming: upcoming ?? 0, maintenanceDue: maintenanceDue ?? 0 };
        })(),
        supabase.from('work_orders').select(`id, work_order_uid, summary, status, customers ( name )`).gte('scheduled_date', todayStart).lte('scheduled_date', todayEnd).order('scheduled_date', { ascending: true }),
        supabase.from('work_orders').select(`id, work_order_uid, summary, customers ( name )`).in('priority', ['HIGH', 'URGENT']).in('status', ['SCHEDULED', 'DISPATCHED']).limit(5),
        supabase.from('work_orders').select(`id, work_order_uid, summary, customers ( name ), completed_at`).eq('status', 'COMPLETED').order('completed_at', { ascending: false }).limit(5)
    ]);

    return {
        stats: statsData,
        todayJobs: (todayJobsData.data as DashboardJob[]) ?? [],
        priorityJobs: (priorityJobsData.data as DashboardJob[]) ?? [],
        recentJobs: (recentJobsData.data as DashboardJob[]) ?? [],
    };
}


// --- THE DASHBOARD COMPONENT ---
export default async function FieldServiceDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { stats, todayJobs, priorityJobs, recentJobs } = await getFieldServiceDashboardData(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Field Service Dashboard</h2>
                    <p className="text-muted-foreground">Your command center for daily operations.</p>
                </div>
                <CreateWorkOrderModal />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Jobs</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.activeJobs}</div><p className="text-xs text-muted-foreground">Currently scheduled or in progress</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Upcoming Jobs</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.upcoming}</div><p className="text-xs text-muted-foreground">Jobs scheduled for today onwards</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Maintenance Due</CardTitle><Wrench className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.maintenanceDue}</div><p className="text-xs text-muted-foreground">Equipment service needed in 30 days</p></CardContent></Card>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Today's Schedule</CardTitle>
                        <CardDescription>All work orders scheduled for today, {format(new Date(), 'PPP')}.</CardDescription>
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
                                    // --- THE FIX (Part 2): Apply the blueprint to the loop ---
                                    todayJobs.map((job: DashboardJob) => (
                                        <TableRow key={job.id}>
                                            <TableCell className="font-medium">{job.work_order_uid}</TableCell>
                                            <TableCell>{job.customers?.name || 'N/A'}</TableCell>
                                            <TableCell>{job.summary}</TableCell>
                                            <TableCell><Badge>{job.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/field-service/work-orders/${job.id}`}>
                                                    <Button variant="outline" size="sm">View</Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No jobs scheduled for today.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-amber-500" /> High Priority Queue</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {priorityJobs.length > 0 ? (
                                // --- THE FIX (Part 2): Apply the blueprint to the loop ---
                                priorityJobs.map((job: DashboardJob) => (
                                    <div key={job.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{job.customers?.name}</p>
                                            <p className="text-xs text-muted-foreground">{job.summary}</p>
                                        </div>
                                        <Link href={`/field-service/work-orders/${job.id}`}><Button variant="secondary" size="sm">Details</Button></Link>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No urgent jobs in the queue.</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center"><CheckCircle2 className="mr-2 h-5 w-5 text-green-600" /> Recently Completed</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-4">
                             {recentJobs.length > 0 ? (
                                // --- THE FIX (Part 2): Apply the blueprint to the loop ---
                                recentJobs.map((job: DashboardJob) => (
                                    <div key={job.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{job.customers?.name}</p>
                                            <p className="text-xs text-muted-foreground">{job.summary}</p>
                                        </div>
                                        <Link href={`/field-service/work-orders/${job.id}`}><Button variant="ghost" size="sm">View</Button></Link>
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