'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableRow, TableCell, TableHeader, TableHead, TableBody, TableFooter } from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, 
    TrendingUp, 
    AlertTriangle, 
    Activity, 
    ShieldCheck, 
    ArrowUpRight, 
    ArrowDownRight 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn, formatCurrency } from '@/lib/utils';

interface BudgetVarianceRow {
  project_id: string;
  project_name: string;
  budgeted: number;
  actual: number;
}

/**
 * Enterprise Data Access Layer
 * Uses PostgREST RPC for high-performance server-side aggregation
 */
async function fetchBudgetVsActuals(businessId: string): Promise<BudgetVarianceRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_budget_vs_actuals', { 
    p_business_id: businessId 
  });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export default function BudgetVsActualsReport({ 
    businessId, 
    currency = 'USD' 
}: { 
    businessId: string, 
    currency?: string 
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['budgets-vs-actuals', businessId],
    queryFn: () => fetchBudgetVsActuals(businessId),
    enabled: !!businessId
  });

  // 1. Portfolio-Level Aggregation Logic
  const totals = useMemo(() => {
    if (!data) return { totalBudget: 0, totalActual: 0, totalVariance: 0, avgUtil: 0 };
    const budget = data.reduce((s, r) => s + r.budgeted, 0);
    const actual = data.reduce((s, r) => s + r.actual, 0);
    return {
        totalBudget: budget,
        totalActual: actual,
        totalVariance: budget - actual,
        avgUtil: budget > 0 ? (actual / budget) * 100 : 0
    };
  }, [data]);

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50/50 shadow-none border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-red-600 gap-3">
          <AlertTriangle className="w-10 h-10"/>
          <div className="text-center">
            <p className="font-black uppercase text-sm tracking-tighter">Ledger Sync Failed</p>
            <p className="text-xs font-medium opacity-80">{error instanceof Error ? error.message : 'Database interconnect error'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-none shadow-2xl rounded-2xl overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b pb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2 text-xl font-black">
                        <Activity className="w-5 h-5 text-cyan-600"/> Variance Analysis Engine
                    </CardTitle>
                    <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 border-cyan-200">v3.5 Interconnect</Badge>
                </div>
                <CardDescription className="font-medium">
                    Critical path monitoring: Real-time delta detection across project capital.
                </CardDescription>
            </div>
            {/* Real-time Status Indicator */}
            <div className={cn(
                "px-4 py-2 rounded-xl border flex items-center gap-2 transition-all",
                totals.totalVariance >= 0 ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
            )}>
                {totals.totalVariance >= 0 ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {totals.totalVariance >= 0 ? "Portfolio Healthy" : "Capital Breach Detected"}
                </span>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* EXECUTIVE ANALYTICS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-b divide-x divide-slate-100 bg-white">
            <div className="p-6">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Approved Ceiling</p>
                <p className="text-2xl font-black font-mono">{formatCurrency(totals.totalBudget, currency)}</p>
            </div>
            <div className="p-6">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Liquidated Capital</p>
                <p className="text-2xl font-black font-mono">{formatCurrency(totals.totalActual, currency)}</p>
            </div>
            <div className="p-6">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Portfolio Delta</p>
                <div className="flex items-center gap-2">
                    <p className={cn(
                        "text-2xl font-black font-mono",
                        totals.totalVariance >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        {totals.totalVariance > 0 ? '+' : ''}{formatCurrency(totals.totalVariance, currency)}
                    </p>
                    {totals.totalVariance >= 0 ? <ArrowUpRight className="w-5 h-5 text-green-500" /> : <ArrowDownRight className="w-5 h-5 text-red-500" />}
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-none">
                <TableHead className="py-4 text-[10px] font-black uppercase text-slate-500 pl-6">Project Metadata</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase text-slate-500">Capital Plan</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase text-slate-500">Ledger Actual</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase text-slate-500 w-[180px]">Consumption</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 pr-6">Variance Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-10 w-10 animate-spin text-cyan-600"/>
                        <span className="text-xs font-bold text-slate-400">Recalculating Ledger Diffs...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-24 text-center text-slate-400 italic font-medium">
                    No active capital deployment data discovered for this tenant.
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((row) => {
                  const variance = row.budgeted - row.actual;
                  const isOverBudget = variance < 0;
                  const percentage = row.budgeted > 0 ? (row.actual / row.budgeted) * 100 : 0;
                  
                  return (
                    <TableRow key={row.project_id} className="hover:bg-slate-50 transition-colors border-slate-100">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900">{row.project_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{row.project_id.slice(0,8)}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right font-mono font-medium text-slate-500">
                        {formatCurrency(row.budgeted, currency)}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono font-black text-slate-900">
                        {formatCurrency(row.actual, currency)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col gap-1.5 px-4">
                          <div className="flex justify-between items-end">
                            <span className={cn(
                                "text-[10px] font-black font-mono",
                                percentage > 90 ? "text-red-600" : "text-cyan-700"
                            )}>
                                {percentage.toFixed(1)}%
                            </span>
                            {percentage > 95 && <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />}
                          </div>
                          <Progress 
                            value={Math.min(percentage, 100)} 
                            className={cn(
                                "h-1.5 bg-slate-100",
                                percentage > 90 ? "[&>div]:bg-red-500" : "[&>div]:bg-cyan-600"
                            )} 
                          />
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right pr-6">
                        <Badge 
                          className={cn(
                            "px-3 py-1 font-mono font-bold shadow-sm",
                            isOverBudget 
                                ? "bg-red-50 text-red-700 border-red-200" 
                                : "bg-green-50 text-green-700 border-green-200"
                          )}
                        >
                          {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(variance), currency)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {/* ENTERPRISE FOOTER TOTALS */}
            {!isLoading && data && data.length > 0 && (
                <TableFooter className="bg-slate-900 hover:bg-slate-900 border-none">
                    <TableRow className="text-white hover:bg-transparent">
                        <TableCell className="pl-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Comprehensive Totals</TableCell>
                        <TableCell className="text-right font-mono font-bold">{formatCurrency(totals.totalBudget, currency)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{formatCurrency(totals.totalActual, currency)}</TableCell>
                        <TableCell className="px-8"><Progress value={totals.avgUtil} className="h-1 bg-slate-700 [&>div]:bg-white" /></TableCell>
                        <TableCell className="text-right pr-6 font-mono font-black text-lg">
                            <span className={totals.totalVariance >= 0 ? "text-green-400" : "text-red-400"}>
                                {totals.totalVariance > 0 ? '+' : ''}{formatCurrency(totals.totalVariance, currency)}
                            </span>
                        </TableCell>
                    </TableRow>
                </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}