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
import { Download, Search, Landmark, CalendarRange, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";

// --- Enterprise Interfaces ---
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
  currency: string;      // Used for Intl formatting
  displayLabel?: string; // Used for UI display titles
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

  const handleDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const fromStr = format(range.from, 'yyyy-MM-dd');
      const toStr = format(range.to, 'yyyy-MM-dd');
      router.push(`?from=${fromStr}&to=${toStr}`);
    }
  };

  // --- ENTERPRISE DEFENSIVE FORMATTER ---
  // Prevents RangeError by cleaning the currency code and using a try-catch fallback
  const formatMoney = (amount: number, currency: string) => {
    try {
      const cleanCode = currency.split(' ')[0].toUpperCase().substring(0, 3);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cleanCode,
        minimumFractionDigits: 2
      }).format(amount);
    } catch (e) {
      // Return a plain formatted string if Intl fails to prevent app-wide crash
      return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(row => 
      row.tax_name.toLowerCase().includes(filter.toLowerCase()) ||
      row.jurisdiction_code.toLowerCase().includes(filter.toLowerCase())
    ).sort((a,b) => b.type.localeCompare(a.type)); 
  }, [data, filter]);

  const handleExport = () => {
    const headers = [
      "Jurisdiction", "Tax Name", "Type", "Currency", 
      "Rate", "Taxable Base", "Tax Amount", "Transaction Count"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredData.map(row => [
        row.jurisdiction_code,
        `"${row.tax_name}"`,
        row.type,
        row.currency,
        `${row.rate_percentage}%`,
        row.taxable_base.toFixed(2),
        row.tax_amount.toFixed(2),
        row.transaction_count
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tax_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tax Liability Report</h1>
          <p className="text-slate-500 mt-1">
            Tax collected vs paid for <span className="font-semibold text-slate-700">{format(dateRange.from, "MMM dd, yyyy")}</span> to <span className="font-semibold text-slate-700">{format(dateRange.to, "MMM dd, yyyy")}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
           <DatePickerWithRange date={dateRange} setDate={handleDateChange} />
           <div className="relative w-full md:w-48">
             <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
             <Input 
               placeholder="Filter taxes..." 
               value={filter} 
               onChange={e => setFilter(e.target.value)} 
               className="pl-8 bg-slate-50"
             />
           </div>
           <Button variant="outline" onClick={handleExport}>
             <Download className="mr-2 h-4 w-4" /> Export
           </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaries.length === 0 && (
          <Card className="col-span-full border-dashed bg-slate-50/50">
            <CardHeader className="text-center py-8">
              <CalendarRange className="mx-auto h-10 w-10 text-slate-300 mb-2"/>
              <CardTitle className="text-slate-500">No Tax Data Found</CardTitle>
              <CardDescription>Try selecting a different date range.</CardDescription>
            </CardHeader>
          </Card>
        )}
        
        {summaries.map((summary) => (
          <Card key={summary.currency + (summary.displayLabel || '')} className={`shadow-sm ${summary.net_liability > 0 ? "border-l-4 border-l-orange-500" : "border-l-4 border-l-green-500"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-base">
                <span>Net Liability ({summary.displayLabel || summary.currency})</span>
                <Landmark className="h-4 w-4 text-muted-foreground"/>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.net_liability > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                {formatMoney(summary.net_liability, summary.currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.net_liability > 0 ? "Payable to Authority" : "Refundable / Credit"}
              </p>
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Output (Sales)</span>
                  <span className="font-semibold text-slate-700">{formatMoney(summary.total_output_tax, summary.currency)}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Input (Expenses)</span>
                  <span className="font-semibold text-slate-700">{formatMoney(summary.total_input_tax, summary.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-500"/>
            Detailed Breakdown
          </CardTitle>
          <CardDescription>Line-item aggregation by tax authority.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Tax Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Taxable Base</TableHead>
                  <TableHead className="text-right">Tax Amount</TableHead>
                  <TableHead className="text-right">Gross Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No records found.</TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50">
                      <TableCell><Badge variant="outline" className="font-mono">{row.jurisdiction_code}</Badge></TableCell>
                      <TableCell className="font-medium text-slate-700">{row.tax_name}</TableCell>
                      <TableCell>
                        <Badge 
                          className={row.type === 'Output' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200'}
                          variant="secondary"
                        >{row.type}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">{row.rate_percentage}%</TableCell>
                      <TableCell className="text-right font-mono text-slate-500">{formatMoney(row.taxable_base, row.currency)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-900">{formatMoney(row.tax_amount, row.currency)}</TableCell>
                      <TableCell className="text-right font-mono text-slate-500">{formatMoney(row.gross_amount, row.currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 text-xs text-muted-foreground border-t p-4 flex justify-between">
            <span>* Taxable Base excludes the tax amount.</span>
            <span>Generated on {format(new Date(), 'PPP')}</span>
        </CardFooter>
      </Card>
    </div>
  );
}