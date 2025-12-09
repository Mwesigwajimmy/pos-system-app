'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, Users, Wallet, CreditCard, 
  AlertTriangle, FileText, Plus, ChevronRight, Activity, TrendingUp 
} from "lucide-react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

// --- Enterprise Types ---

interface DashboardMetrics {
  summary: {
    active_loans: number;
    active_borrowers: number;
    total_outstanding: number;
    portfolio_yield: number;
    par_30_ratio: number; // Portfolio at Risk > 30 days
    monthly_growth: number;
  };
  chart_data: {
    date: string;
    disbursed: number;
    repaid: number;
  }[];
  pending_tasks: {
    applications_review: number;
    kyc_pending: number;
    loans_overdue_today: number;
  };
  recent_activity: {
    id: string;
    type: 'DISBURSEMENT' | 'REPAYMENT' | 'APPROVAL';
    description: string;
    amount: number;
    created_at: string;
  }[];
}

// --- Fetcher ---

async function fetchDashboardData(tenantId: string) {
  const supabase = createClient();
  
  // Real Enterprise: This would be a highly optimized Materialized View or RPC
  // that aggregates data from 5+ tables instantly.
  const { data, error } = await supabase.rpc('get_lending_executive_summary', { 
    p_tenant_id: tenantId 
  });

  if (error) throw new Error(error.message);
  return data as DashboardMetrics;
}

// --- Component ---

export function LendingDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ['lending-dashboard', tenantId], 
    queryFn: () => fetchDashboardData(tenantId),
    refetchInterval: 1000 * 60 * 5 // Refresh every 5 mins
  });

  if (isLoading) return <DashboardSkeleton />;
  
  if (isError || !data) return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5"/> System Error</h3>
      <p>Failed to load dashboard metrics. Please check network connection.</p>
    </div>
  );

  const { summary, chart_data, pending_tasks, recent_activity } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_outstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              {summary.monthly_growth >= 0 ? 
                <ArrowUpRight className="h-3 w-3 text-green-600 mr-1"/> : 
                <ArrowDownRight className="h-3 w-3 text-red-600 mr-1"/>
              }
              <span className={summary.monthly_growth >= 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(summary.monthly_growth)}%
              </span>
              <span className="ml-1">vs last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Borrowers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.active_borrowers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {summary.active_loans} active loans
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.portfolio_yield}%</div>
            <p className="text-xs text-muted-foreground mt-1">Weighted Avg. Return</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-l-4 ${summary.par_30_ratio > 5 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk (PaR 30+)</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${summary.par_30_ratio > 5 ? 'text-red-500' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.par_30_ratio}%</div>
            <p className="text-xs text-muted-foreground mt-1">Portfolio at Risk</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        
        {/* 2. Main Chart (Left 4/7) */}
        <Card className="md:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Disbursement vs Repayment flow (Last 6 Months)</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRepaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `${val/1000000}M`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Area type="monotone" dataKey="disbursed" stroke="#2563eb" fillOpacity={1} fill="url(#colorDisbursed)" />
                  <Area type="monotone" dataKey="repaid" stroke="#16a34a" fillOpacity={1} fill="url(#colorRepaid)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. Action Center (Right 3/7) */}
        <div className="md:col-span-3 space-y-6">
          
          {/* Operational Queue */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Action Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/lending/applications" className="flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-full"><FileText className="h-4 w-4 text-blue-600"/></div>
                  <span className="font-medium text-sm">Pending Applications</span>
                </div>
                <Badge className="bg-blue-600">{pending_tasks.applications_review}</Badge>
              </Link>
              
              <Link href="/lending/kyc" className="flex items-center justify-between p-3 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-full"><Users className="h-4 w-4 text-amber-600"/></div>
                  <span className="font-medium text-sm">KYC Reviews</span>
                </div>
                <Badge className="bg-amber-600">{pending_tasks.kyc_pending}</Badge>
              </Link>

              <Link href="/lending/collections" className="flex items-center justify-between p-3 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-full"><AlertTriangle className="h-4 w-4 text-red-600"/></div>
                  <span className="font-medium text-sm">Overdue Today</span>
                </div>
                <Badge className="bg-red-600">{pending_tasks.loans_overdue_today}</Badge>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Shortcuts */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-3 flex flex-col gap-2" asChild>
                <Link href="/lending/applications/new">
                  <Plus className="h-5 w-5"/>
                  <span>New Loan</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex flex-col gap-2" asChild>
                <Link href="/lending/products">
                  <CreditCard className="h-5 w-5"/>
                  <span>Products</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Recent Activity Feed */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recent_activity.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity recorded.</p>
            ) : (
              recent_activity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'DISBURSEMENT' ? 'bg-blue-100 text-blue-600' : 
                      activity.type === 'REPAYMENT' ? 'bg-green-100 text-green-600' : 
                      'bg-slate-100 text-slate-600'
                    }`}>
                      <Activity className="h-4 w-4"/>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-medium">
                    {formatCurrency(activity.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-4 border-t flex justify-center">
             <Button variant="ghost" size="sm" asChild>
                <Link href="/lending/audit" className="flex items-center">
                  View Full Audit Log <ChevronRight className="ml-1 h-4 w-4"/>
                </Link>
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-7">
        <Skeleton className="md:col-span-4 h-[350px] rounded-xl" />
        <div className="md:col-span-3 space-y-6">
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}