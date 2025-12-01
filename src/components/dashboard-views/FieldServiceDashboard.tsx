'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, CheckCircle2, Clock, DollarSign, MapPin } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

// Define the return type for safety
type FieldServiceData = {
    dailyRevenue: number;
    completedToday: number;
    activeJobs: number;
    pending: number;
};

async function fetchFieldData(): Promise<FieldServiceData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Revenue Generated Today (Service Invoices)
    const { data: invoices } = await supabase
        .from('invoices')
        .select('total')
        .gte('created_at', today);
    
    const dailyRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

    // 2. Jobs Completed Today
    const { count: completedToday } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', today);

    // 3. Currently Active Jobs (On-site)
    const { count: activeJobs } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

    // 4. Pending / Unscheduled (Backlog)
    const { count: pending } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    return { 
        dailyRevenue, 
        completedToday: completedToday || 0, 
        activeJobs: activeJobs || 0,
        pending: pending || 0
    };
}

export default function FieldServiceDashboard() {
    // Listen to changes in work_orders (tech updates) and invoices (billing)
    useRealtimeRefresh(['work_orders', 'invoices'], ['field-dash']);
    
    const { data, isLoading } = useQuery({ 
        queryKey: ['field-dash'], 
        queryFn: fetchFieldData 
    });

    // FIX: Allow number OR undefined
    const formatCurrency = (val: number | undefined) => 
        `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6 animate-in fade-in-50">
            <h2 className="text-3xl font-bold tracking-tight">Field Operations</h2>
            
            <div className="grid gap-4 md:grid-cols-4">
                {/* Metric 1: Today's Revenue */}
                <Card className="border-l-4 border-l-green-600">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Service Revenue Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            {isLoading ? "..." : formatCurrency(data?.dailyRevenue)}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <DollarSign className="h-3 w-3 mr-1" /> Invoiced Today
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 2: Completed Jobs */}
                <Card className="border-l-4 border-l-blue-600">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Jobs Completed Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">
                            {isLoading ? "..." : (data?.completedToday ?? 0)}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Tickets Closed
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 3: Active Now */}
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Techs On-Site</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : (data?.activeJobs ?? 0)}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 mr-1 text-orange-500 animate-pulse" /> Live Activity
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 4: Backlog */}
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending Dispatch</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : (data?.pending ?? 0)}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 mr-1" /> Unassigned
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}