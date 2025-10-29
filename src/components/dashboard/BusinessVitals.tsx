// src/components/dashboard/BusinessVitals.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Users, CreditCard, Activity, ServerCrash } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardKPIs, useOverviewChartData, useRecentSales } from '@/hooks/useDashboardAnalytics';

// FIX: Define the expected KPI structure based on the usage (from Supabase get_dashboard_kpis)
interface DashboardKPIs {
    total_revenue: number | null | undefined;
    revenue_change_percent: number | null | undefined;
    total_subscriptions: number | null | undefined;
    subscriptions_change_percent: number | null | undefined;
    total_sales: number | null | undefined;
    sales_change_percent: number | null | undefined;
}
// Assuming the TanStack Query hooks return an object with 'data' which can be the type or undefined
// This interface represents the common return structure of the useQuery hook.
interface AnalyticsHookResult<T> {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
}


const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "0%";
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
};

const KPICard = ({ title, value, change, Icon, isLoading }: { title: string, value: string, change: string, Icon: React.ElementType, isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-1" />
                </>
            ) : (
                <>
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground">{change}</p>
                </>
            )}
        </CardContent>
    </Card>
);

// Define chart and sales types locally for completeness
interface OverviewChartData { name: string; total: number; }
interface RecentSale { name: string; email: string; amount: number | null | undefined; }

export default function BusinessVitals() {
  // FIX: Explicitly cast the result of the hooks to the correct type to resolve the 'does not exist on type {}' error.
  const { data: kpis, isLoading: kpisLoading, isError: kpisError } = useDashboardKPIs() as AnalyticsHookResult<DashboardKPIs>;
  const { data: chartData, isLoading: chartLoading, isError: chartError } = useOverviewChartData() as AnalyticsHookResult<OverviewChartData[]>;
  const { data: salesData, isLoading: salesLoading, isError: salesError } = useRecentSales() as AnalyticsHookResult<RecentSale[]>;

  if (kpisError || chartError || salesError) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-destructive bg-destructive/10 rounded-lg">
            <ServerCrash className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold">Could not load dashboard vitals.</h3>
            <p className="text-sm">An error occurred while fetching analytics data.</p>
        </div>
    );
  }

  const kpiCards = [
    { title: "Total Revenue", value: formatCurrency(kpis?.total_revenue), change: `${formatPercent(kpis?.revenue_change_percent)} from last month`, Icon: DollarSign },
    { title: "Subscriptions", value: `+${kpis?.total_subscriptions || 0}`, change: `${formatPercent(kpis?.subscriptions_change_percent)} from last month`, Icon: Users },
    { title: "Sales", value: `+${kpis?.total_sales || 0}`, change: `${formatPercent(kpis?.sales_change_percent)} from last month`, Icon: CreditCard },
    { title: "Active Now", value: "+573", change: "+201 since last hour", Icon: Activity }, // Note: Active Now is static for this example
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} isLoading={kpisLoading} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {chartLoading ? ( <Skeleton className="h-[350px] w-full" /> ) : (
              <ResponsiveContainer width="100%" height={350}>
                {/* NOTE: chartData is correctly optional chained implicitly by Recharts, or explicitly checked by loading state */}
                <BarChart data={chartData}> 
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <p className="text-sm text-muted-foreground">The latest transactions in your business.</p>
          </CardHeader>
          <CardContent>
            {salesLoading ? ( <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> ) : (
              <Table>
                  <TableHeader>
                      <TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                      {salesData?.map((sale, index) => (
                          <TableRow key={index}>
                              <TableCell>
                                  <div className="font-medium">{sale.name}</div>
                                  <div className="hidden text-sm text-muted-foreground md:inline">{sale.email}</div>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(sale.amount)}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}