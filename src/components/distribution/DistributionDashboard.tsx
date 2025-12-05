'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Truck, 
    Route, 
    ClipboardCheck, 
    TrendingUp, 
    Package, 
    AlertCircle, 
    DollarSign, 
    ArrowRight,
    CalendarClock
} from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

// --- Types ---
interface DashboardData {
    stats: {
        monthly_revenue: number;
        active_vans: number;
        total_fleet: number;
        pending_orders: number;
    };
    recent_loads: Array<{
        id: string;
        loaded_at: string;
        total_loaded_value: number;
        vehicle_name: string;
        driver_name: string;
        is_settled: boolean;
    }>;
    currency: string;
}

// --- API Fetcher ---
async function fetchDashboardData(): Promise<DashboardData> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_distribution_dashboard_data');
    if (error) {
        console.error("Dashboard Fetch Error:", error);
        throw error;
    }
    return data;
}

// --- Component ---
export default function DistributionDashboard() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['distributionDashboard'],
        queryFn: fetchDashboardData,
    });

    // Helper for Currency Formatting
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-UG', { 
            style: 'currency', 
            currency: data?.currency || 'UGX',
            minimumFractionDigits: 0 
        }).format(amount);
    };

    if (isError) {
        return (
            <div className="p-8 border rounded-lg bg-red-50 text-red-600 flex items-center gap-3">
                <AlertCircle className="h-6 w-6" />
                <div>
                    <h3 className="font-bold">System Error</h3>
                    <p>Failed to load real-time distribution data. Please check your connection.</p>
                </div>
            </div>
        );
    }

    const features = [
        { 
            title: "Fleet & Routes", 
            description: "Manage vehicles and sales routes.", 
            href: "/distribution/routes", 
            icon: Route,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        { 
            title: "Van Loading", 
            description: "Assign stock to vehicles for delivery.", 
            href: "/distribution/loading", 
            icon: Truck,
            color: "text-orange-600",
            bg: "bg-orange-50"
        },
        { 
            title: "Route Settlement", 
            description: "Reconcile cash and returns.", 
            href: "/distribution/settlement", 
            icon: ClipboardCheck,
            color: "text-green-600",
            bg: "bg-green-50"
        },
        { 
            title: "Analytics", 
            description: "Performance reports and insights.", 
            href: "/distribution/analytics", 
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50"
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in-50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Distribution Hub</h1>
                    <p className="text-muted-foreground mt-1">Real-time supply chain monitoring and logistics control.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                         <Link href="/distribution/maintenance">Fleet Maintenance</Link>
                    </Button>
                    <Button asChild>
                         <Link href="/distribution/loading">New Load Out</Link>
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard 
                    title="Revenue (Settled)" 
                    value={data ? formatMoney(data.stats.monthly_revenue) : null}
                    icon={DollarSign}
                    subtext="Total processed this month"
                    loading={isLoading}
                />
                <KpiCard 
                    title="Active Vans" 
                    value={data ? data.stats.active_vans.toString() : null}
                    icon={Truck}
                    subtext="Currently on route"
                    loading={isLoading}
                />
                <KpiCard 
                    title="Pending Orders" 
                    value={data ? data.stats.pending_orders.toString() : null}
                    icon={Package}
                    subtext="Awaiting delivery"
                    loading={isLoading}
                />
                <KpiCard 
                    title="Total Fleet" 
                    value={data ? data.stats.total_fleet.toString() : null}
                    icon={Route}
                    subtext="Registered vehicles"
                    loading={isLoading}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                {/* Main Activity Table */}
                <Card className="col-span-1 md:col-span-4 h-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Active Van Loads</CardTitle>
                            <CardDescription>Real-time status of vehicles in the field.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/distribution/settlement" className="flex items-center gap-1">
                                View All <ArrowRight className="h-4 w-4"/>
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Load Info</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.recent_loads.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                                                No vans currently active.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data?.recent_loads.map((load) => (
                                            <TableRow key={load.id}>
                                                <TableCell>
                                                    <div className="font-medium">{load.vehicle_name}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <CalendarClock className="h-3 w-3"/>
                                                        {format(new Date(load.loaded_at), 'MMM d, h:mm a')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{load.driver_name}</TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {formatMoney(load.total_loaded_value)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                        In Progress
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions Grid */}
                <div className="col-span-1 md:col-span-3 grid gap-4">
                    {features.map((feature) => (
                        <Link key={feature.title} href={feature.href} className="block group">
                            <Card className="hover:border-primary/50 transition-all cursor-pointer h-full">
                                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                    <div className={`p-2 rounded-lg ${feature.bg} ${feature.color} group-hover:scale-110 transition-transform`}>
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                                            {feature.title}
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-sm">
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Sub-component for KPIs ---
function KpiCard({ title, value, icon: Icon, subtext, loading }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-24 mb-1" />
                ) : (
                    <div className="text-2xl font-bold">{value}</div>
                )}
                <p className="text-xs text-muted-foreground">{subtext}</p>
            </CardContent>
        </Card>
    );
}