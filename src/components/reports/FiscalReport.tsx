'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from '@/components/ui/card';
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, ChevronRight, Download, Calendar, Globe, Building2, 
  Printer, RefreshCw, Search, Info, ShieldCheck, FileText 
} from 'lucide-react';
import { toast } from 'sonner';

// --- Enterprise Types ---
export interface FiscalRow {
  id: string;
  label: string;
  description: string;
  value: number;
  currency: string;
  entity: string;
  country: string;
  period: string;
  isTotal: boolean;
}

interface Props {
  data: FiscalRow[];
  year: number;
  month: number;
  country: string;
  availableCountries: string[];
}

export default function FiscalReportClient({ data, year, month, country, availableCountries }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');

  // --- Navigation Logic with Loading State ---
  const updateParams = (newYear: number, newMonth: number, newCountry: string) => {
    startTransition(() => {
        router.push(`?year=${newYear}&month=${newMonth}&country=${newCountry}`, { scroll: false });
    });
  };

  const handleYearChange = (delta: number) => {
    updateParams(year + delta, month, country);
  };

  const handleRefresh = () => {
    startTransition(() => {
        router.refresh();
        toast.success("Data refreshed successfully");
    });
  };

  // --- Formatting Helpers ---
  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const currentDate = new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  // --- Filter Logic ---
  const filteredData = data.filter(row => 
    row.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Export Logic ---
  const handleExport = () => {
    try {
        const headers = ["ID", "Label", "Entity", "Jurisdiction", "Period", "Currency", "Value"];
        const csvRows = data.map(r => 
            `"${r.id}","${r.label}","${r.entity}","${r.country}","${r.period}","${r.currency}",${r.value}`
        );
        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const periodSuffix = month === 0 ? `${year}` : `${year}_${month.toString().padStart(2, '0')}`;
        link.download = `Fiscal_Report_${country.replace(/\s+/g, '_')}_${periodSuffix}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Export successful.");
    } catch (e) {
        toast.error("Export failed. Please try again.");
    }
  };

  // --- Print Logic ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 print:space-y-0">
        
        {/* HEADER SECTION (Hidden in Print) */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:hidden">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-blue-600"/>
                    Fiscal Position Report
                </h1>
                <p className="text-slate-500 mt-1">
                    Equity & Profit Analysis • <span className="font-semibold text-slate-800">{data[0]?.period || year}</span>
                </p>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full xl:w-auto">
                
                {/* REFRESH */}
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isPending} title="Refresh Data">
                    <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                </Button>

                {/* COUNTRY SELECTOR */}
                <Select value={country} onValueChange={(val) => updateParams(year, month, val)} disabled={isPending}>
                  <SelectTrigger className="w-[180px] h-10 bg-white">
                    <Globe className="mr-2 h-4 w-4 text-blue-600" />
                    <SelectValue placeholder="Jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="font-bold">Global Consolidated</SelectItem>
                    <div className="h-px bg-slate-100 my-1" />
                    {availableCountries.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* MONTH SELECTOR */}
                <Select value={month.toString()} onValueChange={(val) => updateParams(year, parseInt(val), country)} disabled={isPending}>
                  <SelectTrigger className="w-[160px] h-10 bg-white">
                    <Calendar className="mr-2 h-4 w-4 text-slate-500" />
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="font-bold">Full Year {year}</SelectItem>
                    <div className="h-px bg-slate-100 my-1" />
                    {[
                      "January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"
                    ].map((m, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* YEAR NAV */}
                <div className="flex items-center bg-slate-100 rounded-md border border-slate-200 h-10">
                    <Button variant="ghost" size="icon" className="h-full w-9 hover:bg-white" onClick={() => handleYearChange(-1)} disabled={isPending}>
                        <ChevronLeft className="h-4 w-4 text-slate-600"/>
                    </Button>
                    <span className="font-mono text-sm font-bold w-14 text-center text-slate-700">{year}</span>
                    <Button variant="ghost" size="icon" className="h-full w-9 hover:bg-white" onClick={() => handleYearChange(1)} disabled={isPending}>
                        <ChevronRight className="h-4 w-4 text-slate-600"/>
                    </Button>
                </div>

                <div className="h-6 w-px bg-slate-300 mx-2 hidden sm:block" />

                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4"/> Print
                </Button>

                <Button variant="default" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4"/> Export
                </Button>
            </div>
        </div>

        {/* REPORT CARD */}
        <Card className="shadow-lg border-slate-200 print:shadow-none print:border-none">
          <CardHeader className="border-b bg-slate-50/50 pb-4 print:pb-2">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
                        <Building2 className="h-5 w-5 text-blue-600"/>
                        {data[0]?.entity}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline" className="font-normal text-slate-600 bg-white">
                            {data[0]?.country}
                        </Badge>
                        <span className="text-slate-400">•</span>
                        <span>{data[0]?.currency} Reporting</span>
                    </CardDescription>
                </div>
                {/* Search (Client Side) */}
                <div className="relative w-64 hidden md:block print:hidden">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400"/>
                    <Input 
                        placeholder="Search line items..." 
                        className="pl-8 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-[400px] pl-6">Line Item</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right pr-6">Amount ({data[0]?.currency})</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredData.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                            No matching records found.
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredData.map((row) => (
                        <TableRow 
                            key={row.id} 
                            className={row.isTotal ? 'bg-blue-50/50 font-bold border-t-2 border-blue-100 hover:bg-blue-50' : 'hover:bg-slate-50/50'}
                        >
                            <TableCell className="pl-6">
                                <div className="flex items-center gap-2">
                                    <span className={row.isTotal ? "text-slate-900 text-lg" : "text-slate-700 font-medium"}>
                                        {row.label}
                                    </span>
                                    {/* Tooltip for Description */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-3.5 w-3.5 text-slate-400 cursor-help print:hidden"/>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-xs">
                                            <p>{row.description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${row.country === 'Global Consolidated' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                    {row.country}
                                </span>
                            </TableCell>
                            <TableCell className="text-slate-500 font-mono text-sm">
                                {row.period}
                            </TableCell>
                            <TableCell className={`text-right pr-6 font-mono ${row.isTotal ? 'text-lg text-blue-700' : 'text-base text-slate-900'}`}>
                                {formatMoney(row.value, row.currency)}
                            </TableCell>
                        </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </CardContent>

          {/* Legal Footer */}
          <CardFooter className="bg-slate-50 border-t p-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 print:text-[10px]">
            <div className="flex items-center gap-2 mb-2 md:mb-0">
                <ShieldCheck className="h-4 w-4 text-slate-400"/>
                <span>Generated via Enterprise ERP System. Valid for internal board review.</span>
            </div>
            <div className="font-mono">
                Report Generated: {currentDate}
            </div>
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}