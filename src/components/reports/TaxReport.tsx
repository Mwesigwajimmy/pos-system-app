'use client';

import React, { useMemo, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker"; 
import { DateRange } from "react-day-picker";
import { Download, Search, Landmark, CalendarRange, Filter, Globe2 } from "lucide-react";
import { format, parseISO } from "date-fns";

export interface TaxLineItem {
  id: string;
  jurisdiction_code: string;
  tax_name: string;
  type: 'Output' | 'Input';
  currency: string;
  rate_percentage: number;
  taxable_base: number;
  tax_amount: number;
  gross_amount: number;
  transaction_count: number;
}

export interface TaxSummary {
  currency: string;
  displayLabel?: string;
  total_output_tax: number;
  total_input_tax: number;
  net_liability: number;
}

interface TaxReportProps {
  data: TaxLineItem[];
  summaries: TaxSummary[];
  serializedDateRange: { from: string; to: string }; 
}

export default function TaxReportClient({ data, summaries, serializedDateRange }: TaxReportProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('');

  const dateRange = useMemo(() => ({
    from: parseISO(serializedDateRange.from),
    to: parseISO(serializedDateRange.to)
  }), [serializedDateRange]);

  // --- ENTERPRISE LOGIC: CONSOLIDATED TOTALS ---
  // This groups all jurisdictions by currency to show a "Company-Wide" total
  const consolidatedTotals = useMemo(() => {
    const totals = new Map<string, TaxSummary>();
    summaries.forEach(s => {
      if (!totals.has(s.currency)) {
        totals.set(s.currency, { ...s, displayLabel: `Company Total (${s.currency})` });
      } else {
        const existing = totals.get(s.currency)!;
        existing.total_output_tax += s.total_output_tax;
        existing.total_input_tax += s.total_input_tax;
        existing.net_liability += s.net_liability;
      }
    });
    return Array.from(totals.values());
  }, [summaries]);

  const handleDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const fromStr = format(range.from, 'yyyy-MM-dd');
      const toStr = format(range.to, 'yyyy-MM-dd');
      router.push(`?from=${fromStr}&to=${toStr}`);
    }
  };

  const formatMoney = (amount: number, currency: string) => {
    try {
      const cleanCode = currency.split(' ')[0].toUpperCase().substring(0, 3);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cleanCode,
        minimumFractionDigits: 2
      }).format(amount);
    } catch (e) {
      return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(row => 
      row.tax_name.toLowerCase().includes(filter.toLowerCase()) ||
      row.jurisdiction_code.toLowerCase().includes(filter.toLowerCase())
    ).sort((a,b) => b.type.localeCompare(a.type)); 
  }, [data, filter]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tax Liability Report</h1>
          <p className="text-slate-500 mt-1">
            Tax reporting for <span className="font-semibold text-slate-700">{format(dateRange.from, "MMM dd")}</span> - <span className="font-semibold text-slate-700">{format(dateRange.to, "MMM dd, yyyy")}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
           <DatePickerWithRange date={dateRange} setDate={handleDateChange} />
           <div className="relative w-full md:w-48">
             <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
             <Input placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 bg-slate-50"/>
           </div>
        </div>
      </div>
      
      {/* 2. CONSOLIDATED TOTALS (The New Feature) */}
      {consolidatedTotals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Globe2 className="h-4 w-4"/> Consolidated Enterprise Performance
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {consolidatedTotals.map((total) => (
              <Card key={`total-${total.currency}`} className="bg-slate-900 text-white border-none shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">Total Net Liability ({total.currency})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatMoney(total.net_liability, total.currency)}</div>
                  <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block uppercase">Total Output</span>
                      <span className="font-semibold">{formatMoney(total.total_output_tax, total.currency)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block uppercase">Total Input</span>
                      <span className="font-semibold">{formatMoney(total.total_input_tax, total.currency)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. Jurisdictional Breakdown Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Jurisdictional Breakdown</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <Card key={summary.displayLabel} className={`shadow-sm border-l-4 ${summary.net_liability > 0 ? "border-l-orange-500" : "border-l-green-500"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center text-sm">
                  <span>{summary.displayLabel}</span>
                  <Landmark className="h-4 w-4 text-muted-foreground"/>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.net_liability > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                  {formatMoney(summary.net_liability, summary.currency)}
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block uppercase">Output</span>
                    <span className="font-semibold text-slate-700">{formatMoney(summary.total_output_tax, summary.currency)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block uppercase">Input</span>
                    <span className="font-semibold text-slate-700">{formatMoney(summary.total_input_tax, summary.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 4. Detailed Data Table (Unchanged) */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-500"/> Detailed Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Tax Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Taxable Base</TableHead>
                  <TableHead className="text-right">Tax Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Badge variant="outline">{row.jurisdiction_code}</Badge></TableCell>
                    <TableCell className="font-medium">{row.tax_name}</TableCell>
                    <TableCell>
                      <Badge className={row.type === 'Output' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'} variant="secondary">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-500">{formatMoney(row.taxable_base, row.currency)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatMoney(row.tax_amount, row.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}