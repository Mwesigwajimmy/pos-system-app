'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, FileText, Briefcase } from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

type ProData = {
    hoursToday: number;
    invoicedToday: number;
    projects: number;
};

async function fetchProData(): Promise<ProData> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: hours } = await supabase.from('timesheets').select('hours').gte('date', today);
    const hoursToday = hours?.reduce((a, b) => a + b.hours, 0) || 0;

    const { data: invoices } = await supabase.from('invoices').select('total').gte('issue_date', today);
    const invoicedToday = invoices?.reduce((a, b) => a + b.total, 0) || 0;

    const { count: projects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active');

    return { hoursToday, invoicedToday, projects: projects || 0 };
}

export default function ProServicesDashboard() {
    useRealtimeRefresh(['timesheets', 'invoices', 'projects'], ['pro-dash']);
    
    const { data, isLoading } = useQuery({ queryKey: ['pro-dash'], queryFn: fetchProData });
    
    // FIX: Handle undefined values safely
    const formatCurrency = (val: number | undefined) => `UGX ${new Intl.NumberFormat('en-US').format(val || 0)}`;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Practice Performance</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Billable Hours Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : (data?.hoursToday || 0)} Hrs</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><Clock className="h-3 w-3 mr-1"/> Logged by Team</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Invoiced Today</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{isLoading ? "..." : formatCurrency(data?.invoicedToday)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><FileText className="h-3 w-3 mr-1"/> New Bills Issued</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Matters</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : (data?.projects || 0)}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1"><Briefcase className="h-3 w-3 mr-1"/> Open Files</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}