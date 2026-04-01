'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardContent, 
    CardDescription 
} from '@/components/ui/card';
import { 
    Table, 
    TableRow, 
    TableCell, 
    TableHeader, 
    TableHead, 
    TableBody, 
    TableFooter 
} from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    TrendingUp, 
    AlertCircle, 
    Activity, 
    ShieldCheck, 
    ArrowUpRight, 
    ArrowDownRight,
    FileDown,
    BarChart3
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Export Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BudgetVarianceRow {
  project_id: string;
  project_name: string;
  budgeted: number;
  actual: number;
}

/**
 * Data Access Layer
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
    currency = 'UGX',
    tenantName = "Organization"
}: { 
    businessId: string, 
    currency?: string,
    tenantName?: string
}) {
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['budgets-vs-actuals', businessId],
    queryFn: () => fetchBudgetVsActuals(businessId),
    enabled: !!businessId
  });

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

  const handleExportPDF = () => {
    if (!data) return;
    setIsExporting(true);
    try {
        const doc = new jsPDF();
        const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');

        // Header Branding
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text("BUDGET VARIANCE REPORT", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Entity: ${tenantName}`, 14, 30);
        doc.text(`Generated On: ${timestamp}`, 14, 35);

        // Summary Table
        autoTable(doc, {
            startY: 45,
            head: [['Total Budgeted', 'Total Actual', 'Net Variance', 'Utilization %']],
            body: [[
                formatCurrency(totals.totalBudget, currency),
                formatCurrency(totals.totalActual, currency),
                formatCurrency(totals.totalVariance, currency),
                `${totals.avgUtil.toFixed(1)}%`
            ]],
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] }
        });

        // Detailed Data
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 15,
            head: [['Project Name', 'Budget', 'Actual', 'Variance']],
            body: data.map(r => [
                r.project_name,
                formatCurrency(r.budgeted, currency),
                formatCurrency(r.actual, currency),
                formatCurrency(r.budgeted - r.actual, currency)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [51, 65, 85] }
        });

        doc.save(`Budget_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
        toast.success("Financial Report Downloaded");
    } catch (err) {
        toast.error("Failed to generate PDF");
    } finally {
        setIsExporting(false);
    }
  };

  if (isError) {
    return (
      <div className="p-12 text-center bg-red-50 border border-red-100 rounded-xl">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3"/>
        <p className="font-bold text-red-800">System Sync Failed</p>
        <p className="text-xs text-red-600 mt-1">{error instanceof Error ? error.message : 'Ledger error'}</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden rounded-xl bg-white animate-in fade-in duration-500">
      <CardHeader className="bg-slate-50/50 border-b p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                        <BarChart3 className="text-white w-5 h-5"/> 
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
                        Budget Performance Analysis
                    </CardTitle>
                </div>
                <CardDescription className="text-sm font-medium text-slate-500 ml-1">
                    Comparing project allocations against real-time ledger expenditures.
                </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
                <Button 
                    variant="outline" 
                    onClick={handleExportPDF} 
                    disabled={isExporting || isLoading}
                    className="h-10 border-slate-200 font-bold px-5 text-xs uppercase tracking-tight"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2 text-blue-600" />}
                    Download PDF
                </Button>
                <div className={cn(
                    "px-4 py-2 rounded-lg border flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider",
                    totals.totalVariance >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                )}>
                    {totals.totalVariance >= 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{totals.totalVariance >= 0 ? "Portfolio Optimal" : "Variance Alert"}</span>
                </div>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* KPI METRICS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-100 bg-white">
            <div className="p-6">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Total Approved Budget</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totals.totalBudget, currency)}</p>
            </div>
            <div className="p-6 border-x border-slate-50">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Total Actual Spent</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totals.totalActual, currency)}</p>
            </div>
            <div className="p-6">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Remaining Balance</p>
                <div className="flex items-center gap-2">
                    <p className={cn(
                        "text-2xl font-bold",
                        totals.totalVariance >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                        {totals.totalVariance > 0 ? '+' : ''}{formatCurrency(totals.totalVariance, currency)}
                    </p>
                    {totals.totalVariance >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />}
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="py-4 text-[10px] font-bold uppercase text-slate-500 pl-8 tracking-wider">Project Details</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 h-12">Allocated</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 h-12">Actual</TableHead>
                <TableHead className="text-center text-[10px] font-bold uppercase text-slate-500 w-[180px]">Utilization</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 pr-8 h-12">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recalculating...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-24 text-center text-slate-400 italic">
                    No active budget data found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((row) => {
                  const variance = row.budgeted - row.actual;
                  const isOverBudget = variance < 0;
                  const percentage = row.budgeted > 0 ? (row.actual / row.budgeted) * 100 : 0;
                  
                  return (
                    <TableRow key={row.project_id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm uppercase tracking-tight">{row.project_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase">{row.project_id.slice(0,8)}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right font-semibold text-slate-500 text-xs">
                        {formatCurrency(row.budgeted, currency)}
                      </TableCell>
                      
                      <TableCell className="text-right font-bold text-slate-900 text-xs">
                        {formatCurrency(row.actual, currency)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col gap-1.5 px-4">
                          <div className="flex justify-between items-end">
                            <span className={cn(
                                "text-[10px] font-bold font-mono",
                                percentage > 90 ? "text-red-600" : "text-blue-700"
                            )}>
                                {percentage.toFixed(1)}%
                            </span>
                            {percentage > 95 && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                          </div>
                          <Progress 
                            value={Math.min(percentage, 100)} 
                            className={cn(
                                "h-1.5 bg-slate-100",
                                percentage > 90 ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-600"
                            )} 
                          />
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right pr-8">
                        <Badge 
                          className={cn(
                            "px-2.5 py-0.5 font-bold shadow-none text-[10px]",
                            isOverBudget 
                                ? "bg-red-50 text-red-700 border-red-100" 
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          )}
                          variant="outline"
                        >
                          {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(variance), currency)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            
            {/* TOTALS FOOTER */}
            {!isLoading && data && data.length > 0 && (
                <TableFooter className="bg-slate-950 text-white border-none">
                    <TableRow className="hover:bg-transparent">
                        <TableCell className="pl-8 py-5 font-bold uppercase text-[10px] tracking-widest text-slate-400">Net Totals</TableCell>
                        <TableCell className="text-right font-bold text-xs">{formatCurrency(totals.totalBudget, currency)}</TableCell>
                        <TableCell className="text-right font-bold text-xs">{formatCurrency(totals.totalActual, currency)}</TableCell>
                        <TableCell className="px-8"><Progress value={totals.avgUtil} className="h-1 bg-slate-800 [&>div]:bg-blue-400" /></TableCell>
                        <TableCell className="text-right pr-8 font-bold text-base">
                            <span className={totals.totalVariance >= 0 ? "text-emerald-400" : "text-red-400"}>
                                {formatCurrency(totals.totalVariance, currency)}
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