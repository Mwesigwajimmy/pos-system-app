'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Loader2, Calculator, Download, CalendarRange, AlertTriangle } from "lucide-react";

const supabase = createClient();

interface TaxReportData {
  taxable_sales: number;
  tax_liability: number;
  payments_made: number;
  balance_due: number;
  report_generated_at: string;
}

// Enterprise Grade: Data fetching abstract
const fetchTaxReport = async (startDate: string, endDate: string) => {
  if (new Date(startDate) > new Date(endDate)) {
      throw new Error("Start date cannot be after end date.");
  }
  
  // Uses a Server-Side Postgres Function for accuracy
  const { data, error } = await supabase.rpc('generate_tax_report', { 
    p_start_date: startDate, 
    p_end_date: endDate,
    p_entity_id: 'ALL' // extensible for specific entity reporting
  });
  
  if (error) throw new Error(error.message);
  return data as TaxReportData;
};

export default function TaxReportGenerator() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [range, setRange] = useState({ 
    start: firstDay.toISOString().split('T')[0], 
    end: today.toISOString().split('T')[0] 
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['taxReport', range],
    queryFn: () => fetchTaxReport(range.start, range.end),
    enabled: false, // Wait for explicit user action
    retry: false
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(val);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600"/> Tax Liability Calculator
        </CardTitle>
        <CardDescription>Real-time VAT/GST liability estimation based on transaction ledger.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-end bg-slate-50 p-5 rounded-lg border">
            <div className="w-full space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                    <CalendarRange className="w-4 h-4"/> Start Date
                </label>
                <Input type="date" value={range.start} onChange={e => setRange(p => ({...p, start: e.target.value}))} className="bg-white"/>
            </div>
            <div className="w-full space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                    <CalendarRange className="w-4 h-4"/> End Date
                </label>
                <Input type="date" value={range.end} onChange={e => setRange(p => ({...p, end: e.target.value}))} className="bg-white"/>
            </div>
            <Button onClick={() => refetch()} disabled={isLoading} className="w-full lg:w-auto min-w-[140px] h-10">
                {isLoading ? <Loader2 className="mr-2 animate-spin w-4 h-4"/> : "Run Calculation"}
            </Button>
        </div>

        {/* Error State */}
        {isError && (
            <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
                <AlertTriangle className="w-5 h-5"/>
                <div className="text-sm">
                    <p className="font-semibold">Calculation Failed</p>
                    <p>{(error as Error).message}</p>
                </div>
            </div>
        )}

        {/* Results */}
        {data && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-5 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-sm text-gray-500 font-medium">Total Taxable Sales</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.taxable_sales)}</p>
                    </div>
                    <div className="p-5 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-sm text-gray-500 font-medium">Input Tax Credit</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(data.payments_made)}</p>
                    </div>
                    <div className="md:col-span-2 p-6 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Net Liability (Balance Due)</p>
                            <p className={`text-4xl font-bold mt-1 ${data.balance_due > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {formatCurrency(data.balance_due)}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">Generated: {new Date().toLocaleString()}</p>
                        </div>
                        <Button variant="secondary" className="w-full md:w-auto">
                            <Download className="mr-2 w-4 h-4"/> Export Official PDF
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}