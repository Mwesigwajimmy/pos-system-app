'use client';

/**
 * --- BBU1 SOVEREIGN REVENUE OVERVIEW CHART ---
 * VERSION: v11.0 OMEGA (REAL-TIME SALES AGGREGATION & MULTI-YEAR AUDIT WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Digital Commerce
 */

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { 
    Loader2, BarChart3, TrendingUp, Calendar, 
    Printer, Download, DollarSign, Sparkles, Activity 
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

// 1. STRICT TYPE DEFINITIONS
export interface MonthlySalesData {
  name: string; // e.g., "Jan", "Feb"
  total: number; // The aggregated revenue
}

interface OverviewChartProps {
  data?: MonthlySalesData[];
  currency?: string;
  year?: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function OverviewChart({ data: propData, currency: propCurrency, year: propYear }: OverviewChartProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(propYear || currentYear);

  // 1. DATA: Identity Context & Currency Resolution
  const { data: profile } = useQuery({
    queryKey: ['active_profile_overview_chart'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const activeCurrency = propCurrency || profile?.currency || 'UGX';
  const activeBusinessId = profile?.business_id;

  // 2. DATA: Real-Time Monthly Sales Query from Database
  const { data: liveMonthlyData, isLoading } = useQuery({
    queryKey: ['live_monthly_sales_chart', activeBusinessId, selectedYear],
    enabled: !propData && !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .eq('business_id', activeBusinessId)
        .gte('created_at', `${selectedYear}-01-01T00:00:00.000Z`)
        .lte('created_at', `${selectedYear}-12-31T23:59:59.999Z`);

      if (error) return MONTHS.map(m => ({ name: m, total: 0 }));

      const monthlyMap: Record<string, number> = {};
      MONTHS.forEach(m => monthlyMap[m] = 0);

      (data || []).forEach((s: any) => {
        const monthIndex = new Date(s.created_at).getMonth();
        const monthName = MONTHS[monthIndex];
        if (monthName) {
          monthlyMap[monthName] = (monthlyMap[monthName] || 0) + Number(s.total_amount || 0);
        }
      });

      return MONTHS.map(m => ({
        name: m,
        total: monthlyMap[m]
      })) as MonthlySalesData[];
    }
  });

  const chartData = useMemo(() => {
    return propData || liveMonthlyData || MONTHS.map(m => ({ name: m, total: 0 }));
  }, [propData, liveMonthlyData]);

  // COMPUTED METRICS
  const metrics = useMemo(() => {
    if (!chartData || chartData.length === 0) return { annualTotal: 0, avgMonthly: 0, peakMonth: 'N/A' };

    const annualTotal = chartData.reduce((acc, curr) => acc + curr.total, 0);
    const avgMonthly = Math.round(annualTotal / 12);
    
    let highest = 0;
    let peak = 'N/A';
    chartData.forEach(item => {
      if (item.total > highest) {
        highest = item.total;
        peak = item.name;
      }
    });

    return { annualTotal, avgMonthly, peakMonth: peak };
  }, [chartData]);

  // UTILITY: FORMAT AXIS TICKS
  const formatCurrencyAxis = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: activeCurrency,
      notation: "compact", 
      compactDisplay: "short" 
    }).format(value);

  // UTILITY: FORMAT TOOLTIP
  const formatTooltip = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: activeCurrency 
    }).format(value);

  // EXPORT ANNUAL REVENUE REPORT PDF
  const exportAnnualPdf = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text((profile?.business_name || "BBU1 ENTERPRISE").toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`ANNUAL FINANCIAL REVENUE PERFORMANCE REPORT (${selectedYear})`, 14, 27);
    doc.text(`Generated: ${new Date().toLocaleString()} | Currency: ${activeCurrency}`, 14, 33);
    doc.line(14, 36, 196, 36);

    autoTable(doc, {
      startY: 40,
      head: [['Annual Total Revenue', 'Average Monthly Inflow', 'Peak Performance Month']],
      body: [[
        `${activeCurrency} ${metrics.annualTotal.toLocaleString()}`,
        `${activeCurrency} ${metrics.avgMonthly.toLocaleString()}`,
        metrics.peakMonth
      ]],
      headStyles: { fillColor: [15, 23, 42] }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Month', 'Gross Revenue']],
      body: chartData.map(m => [
        m.name,
        `${activeCurrency} ${m.total.toLocaleString()}`
      ]),
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.save(`Annual_Revenue_Report_${selectedYear}.pdf`);
    toast.success("Annual Performance PDF Downloaded!");
  };

  return (
    <Card className="col-span-4 h-full border-slate-200 shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900 uppercase tracking-tight">
                        <BarChart3 className="h-6 w-6 text-blue-600"/>
                        Annual Revenue Overview
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-500">
                        Monthly aggregated financial performance and ledger trend analysis.
                    </CardDescription>
                </div>

                <div className="flex items-center gap-3">
                  {/* YEAR SELECTOR */}
                  <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger className="h-10 w-32 rounded-xl font-bold text-xs border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2026, 2025, 2024, 2023].map(y => (
                        <SelectItem key={y} value={String(y)} className="font-bold text-xs">Year {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={exportAnnualPdf} variant="outline" size="sm" className="h-10 px-4 border-slate-200 font-bold text-xs rounded-xl">
                    <Printer size={16} className="mr-1.5 text-blue-600" /> Export PDF
                  </Button>
                </div>
            </div>

            {/* PERFORMANCE KPI STRIP */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Inflow ({selectedYear})</span>
                <p className="text-lg font-black text-emerald-600 mt-0.5">{activeCurrency} {metrics.annualTotal.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Monthly Average</span>
                <p className="text-lg font-black text-blue-600 mt-0.5">{activeCurrency} {metrics.avgMonthly.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Peak Month</span>
                <p className="text-lg font-black text-purple-600 mt-0.5">{metrics.peakMonth}</p>
              </div>
            </div>
        </CardHeader>

        <CardContent className="p-8 pl-4">
            {isLoading ? (
                <div className="flex h-[350px] items-center justify-center gap-2 text-slate-400 font-bold text-xs uppercase">
                    <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
                    <span>Synchronizing Financial Ledger...</span>
                </div>
            ) : chartData.length === 0 ? (
                <div className="flex h-[350px] items-center justify-center text-slate-400 font-bold text-xs uppercase">
                    <p>No revenue data recorded for the year {selectedYear}.</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                        <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatCurrencyAxis}
                        />
                        <Tooltip 
                            cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="rounded-2xl border border-slate-100 bg-slate-900 p-4 shadow-2xl text-white">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">
                                                    Month
                                                </span>
                                                <span className="font-bold text-sm text-white">
                                                    {payload[0].payload.name} ({selectedYear})
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">
                                                    Gross Inflow
                                                </span>
                                                <span className="font-black text-emerald-400 text-sm">
                                                    {formatTooltip(payload[0].value as number)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="total"
                            fill="#2563eb"
                            radius={[8, 8, 0, 0]}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </CardContent>
    </Card>
  );
}