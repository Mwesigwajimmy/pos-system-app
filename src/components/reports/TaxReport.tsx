'use client';

import React, { useMemo, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Calendar, Scale, Landmark } from "lucide-react";
import { format } from "date-fns";

// FIX 1: Defined interfaces here and exported them (Removed import from page)
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
  total_output_tax: number;
  total_input_tax: number;
  net_liability: number;
}

interface TaxReportProps {
  data: TaxLineItem[];
  summaries: TaxSummary[];
  currentPeriod: string;
}

export default function TaxReportClient({ data, summaries, currentPeriod }: TaxReportProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('');

  // --- Helpers ---
  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handlePeriodChange = (monthsToSubtract: string) => {
    const date = new Date();
    date.setMonth(date.getMonth() - parseInt(monthsToSubtract));
    const param = date.toISOString().slice(0, 7); // YYYY-MM
    router.push(`?period=${param}-01`);
  };

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    return data.filter(row => 
      row.tax_name.toLowerCase().includes(filter.toLowerCase()) ||
      row.jurisdiction_code.toLowerCase().includes(filter.toLowerCase())
    ).sort((a,b) => b.type.localeCompare(a.type)); // Sort Output before Input
  }, [data, filter]);

  // --- Export Logic ---
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
    link.download = `tax_report_${currentPeriod.slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Summary Cards (KPIs per Currency) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaries.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardHeader>
              <CardTitle>No Tax Data</CardTitle>
              <CardDescription>No tax-related transactions found for this period.</CardDescription>
            </CardHeader>
          </Card>
        )}
        
        {summaries.map((summary) => (
          <Card key={summary.currency} className={summary.net_liability > 0 ? "border-l-4 border-l-orange-500" : "border-l-4 border-l-green-500"}>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-base">
                <span>Net Liability ({summary.currency})</span>
                <Landmark className="h-4 w-4 text-muted-foreground"/>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMoney(summary.net_liability, summary.currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.net_liability > 0 ? "Payable to Authority" : "Refundable / Credit"}
              </p>
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Collected (Sales)</span>
                  <span className="font-semibold text-slate-700">{formatMoney(summary.total_output_tax, summary.currency)}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-xs">Paid (Expenses)</span>
                  <span className="font-semibold text-slate-700">{formatMoney(summary.total_input_tax, summary.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input 
              placeholder="Filter by jurisdiction or tax name..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-8"
            />
          </div>
          
          <Select onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Current Month</SelectItem>
              <SelectItem value="1">Last Month</SelectItem>
              <SelectItem value="3">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* 3. Detailed Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
          <CardDescription>
            Line-item aggregation by tax authority and type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell colSpan={7} className="h-24 text-center">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Badge variant="outline">{row.jurisdiction_code}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{row.tax_name}</TableCell>
                      <TableCell>
                        <Badge 
                          className={row.type === 'Output' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}
                          variant="secondary"
                        >
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.rate_percentage}%</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatMoney(row.taxable_base, row.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatMoney(row.tax_amount, row.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatMoney(row.gross_amount, row.currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 text-xs text-muted-foreground border-t p-4">
          * Taxable Base excludes the tax amount. "Output" represents tax collected on sales. "Input" represents tax paid on expenses (potentially recoverable).
        </CardFooter>
      </Card>
    </div>
  );
}