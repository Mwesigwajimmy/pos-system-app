'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Download, Calendar as CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner"; 

// FIX 1: Defined interface here and exported it (Removed import from page)
export interface TrialBalanceRow {
  account_name: string;
  account_type: string;
  currency_code: string;
  total_debit: number;
  total_credit: number;
  net_balance: number;
}

interface Props {
    initialData: TrialBalanceRow[];
    reportDate: string;
}

export default function TrialBalanceReportClient({ initialData, reportDate }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date(reportDate));
  
  // 1. Fully Robust Grouping Logic
  const groupedData = useMemo(() => {
    const groups: Record<string, TrialBalanceRow[]> = {};
    if (!initialData || initialData.length === 0) return {};
    
    initialData.forEach(row => {
      const currency = row.currency_code || 'UGX'; // Fallback for data integrity
      if (!groups[currency]) groups[currency] = [];
      groups[currency].push(row);
    });
    return groups;
  }, [initialData]);

  // Extract available currencies
  const currencies = useMemo(() => Object.keys(groupedData).sort(), [groupedData]);
  
  // 2. Active State Management (No shortcuts/brevity)
  // We initialize with the first currency, but we track it explicitly for exports
  const [activeCurrency, setActiveCurrency] = useState<string>(currencies[0] || 'UGX');

  // Update active currency if data changes and current selection is invalid
  useEffect(() => {
    if (currencies.length > 0 && !currencies.includes(activeCurrency)) {
        setActiveCurrency(currencies[0]);
    }
  }, [currencies, activeCurrency]);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      // Trigger Server Re-fetch
      router.push(`?date=${format(newDate, 'yyyy-MM-dd')}`);
    }
  };

  // 3. Export Logic (Robust)
  const handleExport = () => {
    if (!activeCurrency || !groupedData[activeCurrency]) {
        toast.error("No data available to export for the current view.");
        return;
    }

    try {
        const rows = groupedData[activeCurrency];
        
        // CSV Header
        const headers = ["Account Name", "Account Type", "Currency", "Total Debit", "Total Credit", "Net Balance"];
        
        // CSV Rows
        const csvRows = rows.map(r => {
            // Escape quotes in names to prevent CSV breakage
            const safeName = r.account_name.replace(/"/g, '""');
            return `"${safeName}","${r.account_type}","${r.currency_code}",${r.total_debit},${r.total_credit},${r.net_balance}`;
        });

        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `TrialBalance_${activeCurrency}_${reportDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`Successfully exported ${activeCurrency} ledger.`);
    } catch (e) {
        console.error(e);
        toast.error("Export failed due to a browser error.");
    }
  };

  return (
    <Card className="w-full shadow-md border-slate-200">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Trial Balance</CardTitle>
            <CardDescription>
              Double-entry ledger validation as of <span className="font-semibold text-primary">{format(new Date(reportDate), 'MMMM dd, yyyy')}</span>.
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal border-slate-300">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick closing date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input 
                    placeholder="Filter accounts by name or type..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8"
                />
            </div>
            {/* Export Button uses activeCurrency state specifically */}
            <Button variant="outline" onClick={handleExport} disabled={currencies.length === 0}>
                <Download className="mr-2 h-4 w-4" /> 
                Export {activeCurrency} View
            </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {currencies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                No ledger entries found for this period.
            </div>
        ) : (
            <Tabs 
                value={activeCurrency} 
                onValueChange={(val) => setActiveCurrency(val)} 
                className="w-full"
            >
            <TabsList className="mb-4">
                {currencies.map(c => (
                    <TabsTrigger key={c} value={c} className="min-w-[80px]">
                        {c}
                    </TabsTrigger>
                ))}
            </TabsList>

            {currencies.map(currency => {
                const rows = groupedData[currency] || [];
                // Client-side filtering logic
                const filteredRows = rows.filter(r => 
                    r.account_name.toLowerCase().includes(filter.toLowerCase()) ||
                    r.account_type.toLowerCase().includes(filter.toLowerCase())
                );
                
                const totalDebit = filteredRows.reduce((sum, r) => sum + r.total_debit, 0);
                const totalCredit = filteredRows.reduce((sum, r) => sum + r.total_credit, 0);
                const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

                return (
                <TabsContent key={currency} value={currency} className="space-y-4">
                    <div className="rounded-md border border-slate-200">
                    <ScrollArea className="h-[600px]">
                        <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                            <TableHead className="w-[300px]">Account Name</TableHead>
                            <TableHead>Account Type</TableHead>
                            <TableHead className="text-right">Total Debit</TableHead>
                            <TableHead className="text-right">Total Credit</TableHead>
                            <TableHead className="text-right">Net Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRows.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No accounts match your filter.</TableCell></TableRow>
                            ) : (
                            filteredRows.map((row, i) => (
                                <TableRow key={`${currency}-${i}`} className="hover:bg-slate-50">
                                <TableCell className="font-semibold text-slate-700">{row.account_name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={
                                        row.account_type === 'Asset' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        row.account_type === 'Liability' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        row.account_type === 'Equity' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        'bg-slate-100'
                                    }>
                                        {row.account_type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-slate-600">
                                    {row.total_debit > 0 ? row.total_debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-slate-600">
                                    {row.total_credit > 0 ? row.total_credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                                </TableCell>
                                <TableCell className={`text-right font-mono font-bold ${row.net_balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                    {row.net_balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </TableCell>
                                </TableRow>
                            ))
                            )}
                        </TableBody>
                        <TableFooter className="bg-slate-100 font-bold border-t-2 border-slate-300">
                            <TableRow>
                            <TableCell colSpan={2}>Grand Totals ({currency})</TableCell>
                            <TableCell className="text-right text-slate-800">{totalDebit.toLocaleString(undefined, {style:'currency', currency})}</TableCell>
                            <TableCell className="text-right text-slate-800">{totalCredit.toLocaleString(undefined, {style:'currency', currency})}</TableCell>
                            <TableCell className="text-right">
                                {isBalanced ? (
                                <div className="flex items-center justify-end gap-2 text-green-700 bg-green-100 px-2 py-1 rounded w-fit ml-auto">
                                    <span>✓ Balanced</span>
                                </div>
                                ) : (
                                <div className="flex items-center justify-end gap-2 text-red-700 bg-red-100 px-2 py-1 rounded w-fit ml-auto">
                                    <span>⚠ Out of Balance: {(totalDebit - totalCredit).toFixed(2)}</span>
                                </div>
                                )}
                            </TableCell>
                            </TableRow>
                        </TableFooter>
                        </Table>
                    </ScrollArea>
                    </div>
                </TabsContent>
                );
            })}
            </Tabs>
        )}
      </CardContent>
    </Card>
  );
}