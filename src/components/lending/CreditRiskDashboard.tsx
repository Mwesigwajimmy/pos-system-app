'use client';

import * as React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, ShieldAlert, TrendingDown, Activity, AlertTriangle, Info, AlertOctagon, Banknote 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

// --- Enterprise Risk Models ---

interface CreditRiskData {
  summary: {
    portfolio_health_score: number; // 0-100
    par_30: number; // Portfolio at Risk > 30 days (%)
    par_90: number; // Portfolio at Risk > 90 days (%)
    npl_ratio: number; // Non-Performing Loans (%)
    total_provisions: number; // Loan Loss Reserve required
    total_exposure: number; // Total Outstanding Principal
  };
  aging_analysis: {
    bucket: string; // 'Current', '1-30', '31-60', '61-90', '90+'
    amount: number;
    count: number;
  }[];
  concentration_risk: {
    sector: string; // e.g., 'Agriculture', 'Trade', 'Salary'
    amount: number;
  }[];
  watchlist: {
    loan_id: string;
    borrower_name: string;
    amount_overdue: number;
    days_past_due: number;
    collateral_coverage: number; // % covered
  }[];
}

// --- Fetcher ---

async function fetchCreditRisk(tenantId: string) {
  const db = createClient();
  // Enterprise RPC: Aggregates risk buckets, calculates provisions based on IFRS 9 or local regulation
  const { data, error } = await db.rpc('get_enterprise_risk_metrics', { p_tenant_id: tenantId });
  
  if (error) throw new Error(error.message);
  return data as CreditRiskData;
}

// --- Component ---

export function CreditRiskDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ['credit-risk', tenantId], 
    queryFn: () => fetchCreditRisk(tenantId),
    refetchInterval: 1000 * 60 * 15 // Refresh every 15 mins
  });

  if (isLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center bg-slate-50 border border-dashed rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <span className="text-muted-foreground text-sm">Calculating portfolio risk metrics...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-lg flex items-center gap-3 text-red-700">
        <AlertOctagon className="h-6 w-6" />
        <div>
          <h3 className="font-bold">Risk Calculation Failed</h3>
          <p className="text-sm">Unable to compute risk metrics. Check database connection or RPC logs.</p>
        </div>
      </div>
    );
  }

  const { summary, aging_analysis, concentration_risk, watchlist } = data;

  // Color Logic
  // Using child selector to target inner progress indicator
  const getScoreColor = (score: number) => 
    score >= 80 ? "[&>*]:!bg-green-600" : 
    score >= 60 ? "[&>*]:!bg-yellow-500" : 
    "[&>*]:!bg-red-600";
    
  const getParColor = (par: number) => par > 5 ? "text-red-600" : "text-slate-900";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Executive Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Health Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{summary.portfolio_health_score}/100</div>
                <span className="text-xs text-muted-foreground mb-1">Target: &gt;85</span>
            </div>
            <Progress 
              value={summary.portfolio_health_score} 
              className={`h-2 mt-2 ${getScoreColor(summary.portfolio_health_score)}`} 
            />
          </CardContent>
        </Card>

        {/* PaR 30 (Standard Metric) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PaR (&gt;30 Days)</CardTitle>
            <ShieldAlert className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getParColor(summary.par_30)}`}>
                {summary.par_30.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                Exposure: {formatCurrency((summary.total_exposure * summary.par_30) / 100)}
            </p>
          </CardContent>
        </Card>

        {/* NPL Ratio (Hard Default) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPL Ratio (&gt;90 Days)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.npl_ratio.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Regulatory Limit: 5.0%</p>
          </CardContent>
        </Card>

        {/* Loan Loss Provisions */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Required Provisions</CardTitle>
            <Banknote className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.total_provisions)}</div>
            <p className="text-xs text-muted-foreground mt-1">Capital set aside for loss</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 2. Aging Analysis Chart */}
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Aging Analysis</CardTitle>
                <CardDescription>Loan volume by overdue status buckets</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aging_analysis} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="bucket" type="category" width={80} tick={{fontSize: 12}} />
                            <Tooltip formatter={(val: number) => formatCurrency(val)} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={30}>
                                {aging_analysis.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={
                                        entry.bucket === 'Current' ? '#10b981' : 
                                        entry.bucket.includes('90+') ? '#dc2626' : 
                                        '#f59e0b'
                                    } />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>

        {/* 3. Concentration Risk */}
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Concentration Risk</CardTitle>
                <CardDescription>Portfolio exposure by sector/product</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={concentration_risk} 
                                dataKey="amount" 
                                nameKey="sector" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={80} 
                                // FIX: Use 'name' property which is automatically mapped from 'sector' by nameKey
                                label={({ name }) => name}
                            >
                                {concentration_risk.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#0f172a', '#334155', '#475569', '#64748b'][index % 4]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* 4. High Risk Watchlist Table */}
      <Card>
          <CardHeader>
              <div className="flex items-center justify-between">
                  <div>
                      <CardTitle className="text-red-700 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" /> High Risk Watchlist
                      </CardTitle>
                      <CardDescription>Top exposures requiring immediate mitigation actions</CardDescription>
                  </div>
              </div>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Loan ID</TableHead>
                          <TableHead>Borrower</TableHead>
                          <TableHead className="text-right">Amount Overdue</TableHead>
                          <TableHead className="text-center">DPD</TableHead>
                          <TableHead className="text-center">Collateral Coverage</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {watchlist.map((item) => (
                          <TableRow key={item.loan_id}>
                              <TableCell className="font-mono text-xs">{item.loan_id.slice(0,8)}</TableCell>
                              <TableCell className="font-medium">{item.borrower_name}</TableCell>
                              <TableCell className="text-right font-bold text-red-600">
                                  {formatCurrency(item.amount_overdue)}
                              </TableCell>
                              <TableCell className="text-center">
                                  <Badge variant="destructive">{item.days_past_due}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                  <div className={`text-sm font-medium ${item.collateral_coverage < 100 ? 'text-red-600' : 'text-green-600'}`}>
                                      {item.collateral_coverage}%
                                  </div>
                              </TableCell>
                              <TableCell className="text-right">
                                  <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                                      View Details
                                  </Badge>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
    </div>
  );
}