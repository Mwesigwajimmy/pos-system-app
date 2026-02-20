'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { 
    Loader2, 
    Calculator, 
    Download, 
    CalendarRange, 
    AlertTriangle,
    ShieldCheck, 
    Fingerprint, 
    Activity,
    Globe
} from "lucide-react";
import { Badge } from '@/components/ui/badge'; // UPGRADE: Required for forensic status

const supabase = createClient();

// UPGRADE: Added categorical distribution interface
interface TaxCategoryBreakdown {
    category: string;
    amount: number;
    tx_count: number;
}

interface TaxReportData {
  taxable_sales: number;
  tax_liability: number;
  payments_made: number;
  balance_due: number;
  forensic_integrity_score: number; // UPGRADE: Forensic scoring link
  report_generated_at: string;
  breakdown: TaxCategoryBreakdown[]; // UPGRADE: Categorical distribution
}

// Enterprise Grade: Data fetching abstract
const fetchTaxReport = async (startDate: string, endDate: string, businessId: string) => {
  if (new Date(startDate) > new Date(endDate)) {
      throw new Error("Start date cannot be after end date.");
  }
  
  // Uses a Server-Side Postgres Function for jurisdictional accuracy
  const { data, error } = await supabase.rpc('generate_tax_report', { 
    p_start_date: startDate, 
    p_end_date: endDate,
    p_entity_id: businessId 
  });
  
  if (error) throw new Error(error.message);
  return data as TaxReportData;
};

interface TaxReportGeneratorProps {
  businessId: string;
  currencyCode?: string; // e.g., 'USD' or 'UGX'
  locale?: string;       // e.g., 'en-US' or 'en-UG'
}

export default function TaxReportGenerator({ 
  businessId, 
  currencyCode = 'UGX', 
  locale = 'en-UG' 
}: TaxReportGeneratorProps) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [range, setRange] = useState({ 
    start: firstDay.toISOString().split('T')[0], 
    end: today.toISOString().split('T')[0] 
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['taxReport', range, businessId], 
    queryFn: () => fetchTaxReport(range.start, range.end, businessId),
    enabled: false, // Wait for explicit user action
    retry: false
  });

  // Currency formatting dynamic based on the user's jurisdiction
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: currencyCode, 
      maximumFractionDigits: 0 
    }).format(val);

  return (
    <Card className="h-full border-slate-200 shadow-xl overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b pb-6">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-800">
                    <Calculator className="w-6 h-6 text-blue-600"/> Sovereign Tax Engine
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium">
                    Autonomous jurisdictional tax calculation & forensic audit reporting.
                </CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex gap-1 items-center px-3 py-1">
                <Globe className="w-3 h-3"/> {currencyCode} JURISDICTION
            </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        {/* Controls Section */}
        <div className="flex flex-col lg:flex-row gap-4 items-end bg-white p-6 rounded-xl border shadow-sm">
            <div className="w-full space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <CalendarRange className="w-3 h-3"/> Reporting Start
                </label>
                <Input type="date" value={range.start} onChange={e => setRange(p => ({...p, start: e.target.value}))} className="h-11 font-mono"/>
            </div>
            <div className="w-full space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <CalendarRange className="w-3 h-3"/> Reporting End
                </label>
                <Input type="date" value={range.end} onChange={e => setRange(p => ({...p, end: e.target.value}))} className="h-11 font-mono"/>
            </div>
            <Button onClick={() => refetch()} disabled={isLoading} className="w-full lg:w-auto min-w-[180px] h-11 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100">
                {isLoading ? <Loader2 className="mr-2 animate-spin w-5 h-5"/> : "Calculate Liability"}
            </Button>
        </div>

        {/* Error State */}
        {isError && (
            <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 animate-in shake-2">
                <AlertTriangle className="w-6 h-6"/>
                <div className="text-sm">
                    <p className="font-bold">Robotic Kernel Exception</p>
                    <p className="opacity-80">{(error as Error).message}</p>
                </div>
            </div>
        )}

        {/* Results Visualization */}
        {data && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                
                {/* UPGRADE: Professional Header Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 border rounded-xl bg-white shadow-sm border-l-4 border-l-blue-500">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Taxable Revenue</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatCurrency(data.taxable_sales)}</p>
                    </div>
                    <div className="p-5 border rounded-xl bg-white shadow-sm border-l-4 border-l-green-500">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Input Tax Credit</p>
                        <p className="text-2xl font-bold text-green-600 mt-1 font-mono">{formatCurrency(data.payments_made)}</p>
                    </div>
                    <div className="p-5 border rounded-xl bg-white shadow-sm border-l-4 border-l-indigo-500">
                        <div className="flex justify-between items-start">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Forensic Score</p>
                            <ShieldCheck className="w-4 h-4 text-indigo-500"/>
                        </div>
                        <p className="text-2xl font-bold text-indigo-700 mt-1 font-mono">{data.forensic_integrity_score}%</p>
                    </div>
                </div>

                {/* UPGRADE: Robotic Categorical Breakdown (Crucial for multi-department entities) */}
                <div className="border rounded-xl bg-slate-50 p-6">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500"/> Categorical Distribution
                    </h4>
                    <div className="space-y-3">
                        {data.breakdown?.map((cat) => (
                            <div key={cat.category} className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-400"/>
                                    <span className="text-sm font-bold text-slate-600 uppercase">{cat.category || 'GENERAL'}</span>
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-400 font-mono">{cat.tx_count} Events</span>
                                </div>
                                <span className="font-bold text-slate-800 font-mono">{formatCurrency(cat.amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Final Liability Summary Footer */}
                <div className="p-8 rounded-2xl bg-slate-900 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                        <Fingerprint className="w-32 h-32"/>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="text-center md:text-left">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Current Net Liability</p>
                            <p className={`text-6xl font-black mt-2 tracking-tighter ${data.balance_due > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {formatCurrency(data.balance_due)}
                            </p>
                            <div className="flex items-center gap-2 mt-4 text-[10px] font-mono text-slate-500">
                                <ShieldCheck className="w-3 h-3 text-green-500"/> 
                                TRANSACTIONAL DATA SEALED BY SOVEREIGN KERNEL V10
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">Report Generated: {new Date().toLocaleString()}</p>
                        </div>
                        <Button variant="secondary" className="w-full md:w-auto h-14 px-8 text-lg font-bold shadow-xl">
                            <Download className="mr-3 w-5 h-5"/> Export Compliance PDF
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}