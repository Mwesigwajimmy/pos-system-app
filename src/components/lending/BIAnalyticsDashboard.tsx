'use client';

import * as React from "react";
import { 
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis 
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, TrendingUp, AlertTriangle, Users, Clock, 
  Download, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

// --- Enterprise Data Models ---

interface AnalyticsData {
  kpis: {
    active_loans_count: number;
    active_loans_growth: number; // percentage change
    portfolio_value: number;
    portfolio_yield: number;
    npl_rate: number; // Non-Performing Loans %
    npl_rate_change: number;
    avg_disbursement_time_hours: number;
  };
  // Trend Data for Area Chart
  monthly_trends: {
    month: string; // "Jan", "Feb"
    disbursed: number;
    repaid: number;
  }[];
  // Distribution Data for Pie Chart
  product_distribution: {
    name: string;
    value: number; // Amount or Count
    color: string;
  }[];
  // Risk Buckets for Bar Chart
  risk_buckets: {
    bucket: string; // "0-30", "31-60", "61-90", "90+"
    amount: number;
  }[];
}

// --- Fetcher ---

async function fetchLendingAnalytics(tenantId: string, range: string) {
  const supabase = createClient();
  
  // We call a robust RPC function that aggregates this data on the Postgres side
  // This ensures fast load times even with millions of rows
  const { data, error } = await supabase.rpc('get_lending_dashboard_metrics', { 
    p_tenant_id: tenantId,
    p_date_range: range // '30d', '90d', '1y', 'ytd'
  });

  if (error) throw new Error(error.message);
  
  // If the RPC isn't ready yet, this type assertion ensures the UI code is valid.
  // In a real scenario, the RPC returns exactly this structure.
  return data as AnalyticsData;
}

// --- Components ---

export function BIAnalyticsDashboard({ tenantId }: { tenantId: string }) {
  const [timeRange, setTimeRange] = React.useState("30d");

  const { data, isLoading, isError, error } = useQuery({ 
    queryKey: ['lending-analytics', tenantId, timeRange], 
    queryFn: () => fetchLendingAnalytics(tenantId, timeRange),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center bg-slate-50/50 rounded-xl border border-dashed">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Aggregating portfolio data...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 rounded-lg border border-red-200 bg-red-50 text-red-700">
        <h3 className="font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Analytics Unavailable
        </h3>
        <p className="text-sm mt-1">{(error as Error)?.message || "Failed to load dashboard data."}</p>
      </div>
    );
  }

  const { kpis, monthly_trends, product_distribution, risk_buckets } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Dashboard Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Portfolio Overview</h2>
          <p className="text-muted-foreground">Real-time insights into lending performance and risk.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Loans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.active_loans_count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {kpis.active_loans_growth > 0 ? (
                <span className="text-green-600 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1"/>{kpis.active_loans_growth}%</span>
              ) : (
                <span className="text-red-600 flex items-center"><ArrowDownRight className="h-3 w-3 mr-1"/>{kpis.active_loans_growth}%</span>
              )}
              <span className="ml-1">from last period</span>
            </p>
          </CardContent>
        </Card>

        {/* Portfolio Yield */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annualized Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.portfolio_yield}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Weighted Avg Interest
            </p>
          </CardContent>
        </Card>

        {/* NPL Rate (Risk) */}
        <Card className={kpis.npl_rate > 5 ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPL Rate (90+ Days)</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${kpis.npl_rate > 5 ? "text-red-600" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.npl_rate > 5 ? "text-red-700" : ""}`}>
              {kpis.npl_rate}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className={kpis.npl_rate_change > 0 ? "text-red-600" : "text-green-600"}>
                 {kpis.npl_rate_change > 0 ? "+" : ""}{kpis.npl_rate_change}%
              </span>
              <span className="ml-1">risk change</span>
            </p>
          </CardContent>
        </Card>

        {/* Efficiency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Disbursement</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avg_disbursement_time_hours} Hrs</div>
            <p className="text-xs text-muted-foreground mt-1">Application to Funding</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Performance Trends</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="products">Product Mix</TabsTrigger>
        </TabsList>

        {/* Tab 1: Trends (Area Chart) */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disbursement vs Repayment</CardTitle>
              <CardDescription>
                Compare capital outflow (loans given) vs capital inflow (repayments collected) over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={monthly_trends}>
                  <defs>
                    <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRepaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="disbursed" name="Disbursed" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDisbursed)" />
                  <Area type="monotone" dataKey="repaid" name="Collected" stroke="#10b981" fillOpacity={1} fill="url(#colorRepaid)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Risk (Bar Chart) */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio at Risk (PaR) by Age</CardTitle>
              <CardDescription>Outstanding balance categorized by days overdue.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={risk_buckets}>
                  <XAxis dataKey="bucket" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Outstanding Amount" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

         {/* Tab 3: Products (Pie Chart) */}
         <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Composition</CardTitle>
              <CardDescription>Distribution of active loans by product type.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={product_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {product_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}