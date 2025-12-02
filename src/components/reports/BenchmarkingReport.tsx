'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar as CalendarIcon, 
  BarChart3,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

// FIX 1: Defined interface here and exported it
export interface BenchmarkData {
  kpi: string;
  current_value: number;
  previous_value: number;
  variance_percent: number;
  unit: string;
  status: 'positive' | 'negative' | 'neutral';
}

interface Props {
  data: BenchmarkData[];
  reportDate: string;
}

export default function BenchmarkingReportClient({ data, reportDate }: Props) {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date(reportDate));

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      router.push(`?date=${format(newDate, 'yyyy-MM-dd')}`);
    }
  };

  const formatCurrency = (val: number, unit: string) => {
    if (unit === 'UGX') {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'UGX',
            maximumFractionDigits: 0
        }).format(val);
    }
    return val.toLocaleString();
  };

  return (
    <div className="space-y-6">
      
      {/* Header with Date Picker */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Performance Benchmarks</h1>
            <p className="text-slate-500 mt-1">
                Comparison against previous period (MoM) as of <span className="font-semibold text-slate-700">{format(new Date(reportDate), 'MMMM yyyy')}</span>.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal border-slate-300">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "MMMM yyyy") : <span>Pick Month</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
                </PopoverContent>
            </Popover>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="shadow-md border-slate-200">
        <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600"/>
                <CardTitle>Internal KPI Performance</CardTitle>
            </div>
            <CardDescription>
                Analysis of key operational metrics versus historical performance.
            </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-4 px-6 font-semibold text-slate-600">Metric</th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-600">Current Month</th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-600">Previous Month</th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-600">Variance</th>
                        <th className="text-center py-4 px-6 font-semibold text-slate-600">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 font-medium text-slate-800">{row.kpi}</td>
                            <td className="text-right py-4 px-6 font-mono text-slate-600">
                                {formatCurrency(row.current_value, row.unit)}
                            </td>
                            <td className="text-right py-4 px-6 font-mono text-slate-400">
                                {formatCurrency(row.previous_value, row.unit)}
                            </td>
                            <td className="text-right py-4 px-6">
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                                    row.variance_percent > 0 ? 'bg-green-100 text-green-700' : 
                                    row.variance_percent < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {row.variance_percent > 0 && "+"}
                                    {row.variance_percent.toFixed(1)}%
                                </div>
                            </td>
                            <td className="py-4 px-6">
                                <div className="flex items-center justify-center">
                                    {row.status === 'positive' && (
                                        <div className="flex items-center text-green-600 gap-1 text-xs font-medium bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                            <TrendingUp className="h-3 w-3" /> Growth
                                        </div>
                                    )}
                                    {row.status === 'negative' && (
                                        <div className="flex items-center text-red-600 gap-1 text-xs font-medium bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                            <TrendingDown className="h-3 w-3" /> Decline
                                        </div>
                                    )}
                                    {row.status === 'neutral' && (
                                        <div className="flex items-center text-slate-500 gap-1 text-xs font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                                            <Minus className="h-3 w-3" /> Stable
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </CardContent>
      </Card>

      {/* Insight Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
            <h3 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4"/> AI Analysis
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
                {data.find(d => d.kpi === 'Total Revenue')?.status === 'positive' 
                    ? "Revenue is trending upwards, suggesting effective sales strategies or seasonal demand. Continue current acquisition efforts."
                    : "Revenue contraction detected. Review marketing spend and customer retention metrics immediately."}
            </p>
        </div>
      </div>
    </div>
  );
}