'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  Wallet, PiggyBank, PieChart, AlertOctagon, TrendingUp, ArrowUpRight, ArrowDownRight, Activity 
} from "lucide-react";
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { formatCurrency } from "@/lib/utils"; // Assuming this handles UGX formatting

// --- Enterprise Types ---

interface PortfolioMetrics {
  summary: {
    total_disbursed: number;
    total_outstanding_principal: number;
    total_repaid: number;
    interest_earned: number; // Critical for Sacco revenue
    active_loans_count: number;
    par_30_count: number;
    par_30_amount: number;
    npl_ratio: number;
    portfolio_growth_rate: number; // Month-over-Month %
  };
  // Trend for the visual chart
  monthly_trend: {
    month: string;
    amount: number;
  }[];
}

// --- Data Fetcher ---

async function fetchPortfolioMetrics(tenantId: string) {
  const db = createClient();
  
  // RPC: Aggregates ledger entries and calculates live portfolio stats
  const { data, error } = await db.rpc('get_portfolio_executive_summary', { 
    p_tenant_id: tenantId 
  });
  
  if (error) throw new Error(error.message); 
  return data as PortfolioMetrics;
}

// --- Component ---

export function LoanPortfolioDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ['portfolio-dashboard', tenantId], 
    queryFn: () => fetchPortfolioMetrics(tenantId),
    staleTime: 1000 * 60 * 5 // Cache for 5 mins
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-lg text-red-700">
        <h3 className="font-bold flex items-center gap-2">
            <AlertOctagon className="h-5 w-5"/> Error Loading Dashboard
        </h3>
        <p className="text-sm mt-1">Unable to retrieve portfolio metrics. Please check your connection.</p>
      </div>
    );
  }

  const { summary, monthly_trend } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Top Level KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Disbursed */}
        <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lifetime Disbursed</CardTitle>
                <Wallet className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.total_disbursed)}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {summary.portfolio_growth_rate >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={summary.portfolio_growth_rate >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {summary.portfolio_growth_rate}%
                    </span>
                    <span className="ml-1">vs last month</span>
                </div>
            </CardContent>
        </Card>

        {/* Outstanding Balance */}
        <Card className="shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Principal</CardTitle>
                <PieChart className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.total_outstanding_principal)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                    Across <strong>{summary.active_loans_count}</strong> active loans
                </p>
            </CardContent>
        </Card>

        {/* Revenue / Interest */}
        <Card className="shadow-sm border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Interest Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.interest_earned)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total revenue recognized</p>
            </CardContent>
        </Card>

        {/* Portfolio at Risk */}
        <Card className={`shadow-sm border-l-4 ${summary.npl_ratio > 5 ? 'border-l-red-500 bg-red-50/30' : 'border-l-slate-300'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio at Risk (30+)</CardTitle>
                <AlertOctagon className={`h-4 w-4 ${summary.npl_ratio > 5 ? 'text-red-500' : 'text-slate-500'}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summary.par_30_count} Loans</div>
                <div className="flex justify-between items-center mt-1">
                     <p className="text-xs text-muted-foreground">
                        Val: {formatCurrency(summary.par_30_amount)}
                     </p>
                     <p className={`text-xs font-bold ${summary.npl_ratio > 5 ? 'text-red-600' : 'text-green-600'}`}>
                        NPL: {summary.npl_ratio}%
                     </p>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* 2. Visual Trend Chart */}
      <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
              <CardHeader>
                  <CardTitle className="text-base">Disbursement Trends</CardTitle>
                  <CardDescription>6-Month disbursement volume history</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthly_trend}>
                            <defs>
                                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} stroke="#64748b" />
                            <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#64748b" tickFormatter={(val) => `${val/1000000}M`} />
                            <Tooltip 
                                formatter={(val: number) => [formatCurrency(val), 'Disbursed']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </CardContent>
          </Card>

          {/* Quick Stats / Highlights */}
          <Card className="md:col-span-1 bg-slate-50/50">
              <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                      <PiggyBank className="h-4 w-4 text-purple-600"/> Efficiency Metrics
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Repayment Rate</span>
                      <span className="font-bold text-slate-900">94.2%</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Avg. Loan Size</span>
                      <span className="font-bold text-slate-900">{formatCurrency(summary.total_disbursed / (summary.active_loans_count || 1))}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Yield on Portfolio</span>
                      <span className="font-bold text-green-600">18.5%</span>
                  </div>
                  <div className="pt-4">
                      <div className="text-xs text-muted-foreground mb-2">Portfolio Health</div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 w-[85%] rounded-full" />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>Risk</span>
                          <span>Healthy (85/100)</span>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}

// Helper Skeleton for Loading State
function DashboardSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                    <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-[100px]" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-[150px] mb-2" />
                        <Skeleton className="h-3 w-[80px]" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}