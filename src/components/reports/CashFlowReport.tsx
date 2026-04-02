'use client';

import React, { useState, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useCopilot } from '@/context/CopilotContext';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  Download, TrendingUp, TrendingDown, DollarSign, 
  ChevronDown, Filter, Trash2, X, Search, LayoutGrid,
  Loader2, RefreshCw, AlertCircle, FileText, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

// --- TYPES ---
export interface CashFlowData {
  section: 'Operating' | 'Investing' | 'Financing';
  line_item: string;
  amount: number;
  is_total?: boolean;
}

export default function CashFlowReportClient() {
  const supabase = createClient();
  const { businessId } = useCopilot();

  // --- REPORT CONTROLS STATE ---
  const [reportCurrency, setReportCurrency] = useState("USD");
  const [dateRange, setDateRange] = useState("this-month");
  const [statementType, setStatementType] = useState("all"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState("default");

  // --- DYNAMIC DATE LOGIC ---
  const { from, to } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'this-month': 
        return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'last-month':
        const lastM = subMonths(now, 1);
        return { from: format(startOfMonth(lastM), 'yyyy-MM-dd'), to: format(endOfMonth(lastM), 'yyyy-MM-dd') };
      case 'this-year':
        return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd') };
      default:
        return { from: '2020-01-01', to: format(now, 'yyyy-MM-dd') };
    }
  }, [dateRange]);

  // --- DATA FETCHING (SUPABASE RPC) ---
  const { data: serverData, isLoading, error, refetch } = useQuery({
    queryKey: ['cash-flow', from, to, businessId],
    queryFn: async () => {
        const { data, error } = await supabase.rpc('get_cash_flow_statement', {
            p_business_id: businessId,
            p_start_date: from,
            p_end_date: to
        });
        if (error) throw error;
        return data; 
    },
    enabled: !!businessId
  });

  // --- DYNAMIC CALCULATION ENGINE ---
  const tableRows = useMemo(() => {
    if (!serverData) return [];
    let rows: CashFlowData[] = [];
    
    // 1. Operating Section
    const opItems = serverData.operating || [];
    const opTotal = opItems.reduce((acc: number, curr: any) => acc + curr.amount, serverData.net_income_start || 0);
    
    rows.push({ section: 'Operating', line_item: 'Net Income (Starting Point)', amount: serverData.net_income_start });
    opItems.forEach((item: any) => rows.push({ ...item, section: 'Operating' }));
    rows.push({ section: 'Operating', line_item: 'Net Cash from Operating Activities', amount: opTotal, is_total: true });

    // 2. Investing Section
    const invItems = serverData.investing || [];
    const invTotal = invItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);
    invItems.forEach((item: any) => rows.push({ ...item, section: 'Investing' }));
    if (invItems.length > 0 || view === 'detailed') {
        rows.push({ section: 'Investing', line_item: 'Net Cash used in Investing', amount: invTotal, is_total: true });
    }

    // 3. Financing Section
    const finItems = serverData.financing || [];
    const finTotal = finItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);
    finItems.forEach((item: any) => rows.push({ ...item, section: 'Financing' }));
    if (finItems.length > 0 || view === 'detailed') {
        rows.push({ section: 'Financing', line_item: 'Net Cash from Financing', amount: finTotal, is_total: true });
    }
    
    // --- APPLY SEARCH & CATEGORY FILTERS ---
    return rows.filter(row => {
        const matchesSearch = row.line_item.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = statementType === 'all' || row.section.toLowerCase() === statementType.toLowerCase();
        return matchesSearch && matchesType;
    });
  }, [serverData, searchQuery, statementType, view]);

  const netChange = serverData?.net_change || 0;

  // --- DYNAMIC CURRENCY FORMATTER (No Hardcoding) ---
  const formatMoney = (val: number) => {
    const locales: Record<string, string> = { USD: 'en-US', UGX: 'en-UG', GBP: 'en-GB', EUR: 'de-DE' };
    return new Intl.NumberFormat(locales[reportCurrency] || 'en-US', { 
      style: 'currency', 
      currency: reportCurrency 
    }).format(val);
  };

  const handleExport = () => {
    try {
        const headers = ["Section", "Line Item", "Amount", "Currency"];
        const csvRows = tableRows.map(r => `"${r.section}","${r.line_item}",${r.amount},"${reportCurrency}"`);
        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CashFlow_${reportCurrency}_${from}_to_${to}.csv`;
        link.click();
        toast.success("Financial statement exported.");
    } catch (e) {
        toast.error("Export failed.");
    }
  };

  if (error) return (
    <div className="p-10 text-center space-y-4">
        <AlertCircle className="mx-auto text-red-500 w-10 h-10" />
        <h2 className="text-lg font-bold">Financial Data Sync Error</h2>
        <p className="text-slate-500">Could not retrieve the Cash Flow Statement for this business ID.</p>
        <Button onClick={() => refetch()}>Retry Connection</Button>
    </div>
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 animate-in fade-in duration-500">
      {/* --- BREADCRUMBS (Campfire Design) --- */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <LayoutGrid className="w-4 h-4" />
        <span>Accounting</span>
        <span>/</span>
        <span className="font-medium text-slate-900">Cash Flow Statement</span>
      </nav>

      <Card className="shadow-md border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
              <div>
                  <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Cash Flow Statement</CardTitle>
                  <CardDescription>
                    Direct reconciliation of cash position for: <span className="font-semibold text-primary">{from} to {to}</span>
                  </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-slate-200">Actions <ChevronDown className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => refetch()} className="border-slate-200">
                    <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
                </Button>
                <Button variant="default" onClick={handleExport} className="shadow-sm">
                    <Download className="mr-2 h-4 w-4"/> Export CSV
                </Button>
              </div>
          </div>

          {/* --- MAIN FILTER TOOLBAR (5-Column Grid) --- */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statement Type</label>
              <Select value={statementType} onValueChange={setStatementType}>
                <SelectTrigger className="bg-white border-green-500/40 ring-green-50">
                  <SelectValue placeholder="All Activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="operating">Operating Only</SelectItem>
                  <SelectItem value="investing">Investing Only</SelectItem>
                  <SelectItem value="financing">Financing Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filters</label>
              <div className="relative">
                <Input value="1 Applied" readOnly className="pr-8 bg-white" />
                <X className="absolute right-2 top-2.5 h-4 w-4 text-slate-400 cursor-pointer" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transaction View</label>
              <div className="flex gap-1">
                <Select value={view} onValueChange={setView}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Standard View</SelectItem>
                    <SelectItem value="detailed">Detailed View</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="shrink-0"><Filter className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="shrink-0"><Trash2 className="h-4 w-4 text-slate-200" /></Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Report Currency</label>
              <Select value={reportCurrency} onValueChange={setReportCurrency}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - Dollar</SelectItem>
                  <SelectItem value="UGX">UGX - Shilling</SelectItem>
                  <SelectItem value="GBP">GBP - Pound</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* --- SEARCH BAR & STATUS BADGES --- */}
          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 bg-slate-100 text-slate-700 border-slate-200 font-medium">
                Method: Indirect Adjustments <X className="ml-2 h-3 w-3 cursor-pointer" />
              </Badge>
              <Button variant="link" className="text-slate-400 text-xs p-0 h-auto no-underline">Clear all</Button>
            </div>
            <div className="w-72 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search description..." 
                className="pl-9 bg-white" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
            {isLoading ? (
                <div className="py-24 text-center">
                    <Loader2 className="animate-spin h-10 w-10 mx-auto text-blue-600 mb-4" />
                    <p className="text-slate-500 text-sm animate-pulse">Reconciling cash ledger accounts...</p>
                </div>
            ) : (
                <>
                <div className="rounded-md border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                        <TableHead className="w-[250px] font-bold text-slate-700">Section</TableHead>
                        <TableHead className="font-bold text-slate-700">Line Item Description</TableHead>
                        <TableHead className="text-right font-bold text-slate-700">Amount ({reportCurrency})</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableRows.map((row, idx) => (
                        <TableRow 
                          key={idx} 
                          className={cn(
                            "group transition-colors hover:bg-slate-50/30",
                            row.is_total && "bg-slate-50/80 font-bold border-t border-slate-200"
                          )}
                        >
                          <TableCell className="font-medium text-slate-400 text-[10px] uppercase tracking-widest">
                            {!row.is_total ? row.section : ""}
                          </TableCell>
                          <TableCell className={cn("text-slate-800 flex items-center gap-2", row.is_total && "text-slate-900")}>
                            {row.line_item}
                            {!row.is_total && <Settings className="w-3 h-3 text-slate-200 opacity-0 group-hover:opacity-100 cursor-pointer" />}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-mono",
                            row.amount < 0 ? 'text-red-600' : 'text-emerald-600',
                            row.is_total && "text-base underline underline-offset-4 decoration-double"
                          )}>
                            {formatMoney(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Grand Total Footer */}
                      <TableRow className="bg-slate-900 text-white hover:bg-slate-800 border-t-4 border-slate-300">
                        <TableCell className="font-bold flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-400"/> Summary
                        </TableCell>
                        <TableCell className="font-bold uppercase tracking-wider text-[10px]">
                            Net Change in Cash Position
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-lg">
                            {formatMoney(netChange)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Analysis Insight Footer */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3">
                   {netChange >= 0 ? (
                       <TrendingUp className="h-6 w-6 text-green-600 mt-1" />
                   ) : (
                       <TrendingDown className="h-6 w-6 text-red-600 mt-1" />
                   )}
                   <div>
                       <h4 className="font-semibold text-sm text-slate-900">Liquidity Position Insight</h4>
                       <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                          {netChange >= 0 
                              ? "The entity generated positive cash flow this period. This indicates high operational efficiency and the ability to cover short-term liabilities without external financing."
                              : "The entity experienced a net cash outflow. Please review the 'Investing' section to see if this is due to capital expenditure, or 'Operating' if core business is burning cash."}
                       </p>
                   </div>
                </div>
                </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}