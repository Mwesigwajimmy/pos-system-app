'use client';

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useCopilot } from '@/context/CopilotContext';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Decimal from 'decimal.js';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Download, FileText, Loader2, RefreshCw, AlertCircle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CashFlowData {
  section: 'Operating' | 'Investing' | 'Financing' | 'Taxation';
  line_item: string;
  amount: number;
  is_total?: boolean;
  is_tax?: boolean;
  transaction_id?: string;
  source_ledger?: string;
}

class CashFlowValidator {
  static sanitizeRawData(data: any): any {
    if (!data || data.status === 'FAILED') return null;
    return {
      ...data,
      operating: Array.isArray(data.operating) ? data.operating : [],
      investing: Array.isArray(data.investing) ? data.investing : [],
      financing: Array.isArray(data.financing) ? data.financing : [],
      taxes: Array.isArray(data.taxes) ? data.taxes : [],
      net_income_start: Number(data.net_income_start || 0),
      net_change: Number(data.net_change || 0)
    };
  }
}

class CashFlowCalculator {
  static calculateSectionTotal(items: any[]): string {
    let total = new Decimal(0);
    items.forEach(item => {
      try {
        total = total.plus(new Decimal(item.amount || 0));
      } catch (e) {}
    });
    return total.toFixed(2);
  }
}

const supabase = createClient();

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export default function CashFlowReportClient() {
  const { businessId } = useCopilot();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [businessCurrency, setBusinessCurrency] = useState<string>(searchParams.get('cur') || 'UGX');

  useEffect(() => {
    const resolveCurrency = async () => {
      if (!businessId) return;
      const { data } = await supabase
        .from('tenants')
        .select('currency_code')
        .eq('id', businessId)
        .single();

      if (data?.currency_code) {
        setBusinessCurrency(data.currency_code);
      }
    };
    resolveCurrency();
  }, [businessId]);

  const [searchQuery, setSearchQuery] = useState("");
  const dateRangeMode = searchParams.get('range') || "this-month";
  const customFrom = searchParams.get('from') || "";
  const customTo = searchParams.get('to') || "";
  const statementType = searchParams.get('type') || "all";

  const { from, to, label } = useMemo(() => {
    const now = new Date();

    if (dateRangeMode === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo, label: `${customFrom} to ${customTo}` };
    }

    switch (dateRangeMode) {
      case 'this-month':
        return {
          from: format(startOfMonth(now), 'yyyy-MM-dd'),
          to: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: format(now, 'MMMM yyyy')
        };
      case 'last-month':
        const lm = subMonths(now, 1);
        return { from: format(startOfMonth(lm), 'yyyy-MM-dd'), to: format(endOfMonth(lm), 'yyyy-MM-dd'), label: format(lm, 'MMMM yyyy') };
      case 'this-year':
        return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd'), label: format(now, 'yyyy') };
      default:
        return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd'), label: format(now, 'MMMM yyyy') };
    }
  }, [dateRangeMode, customFrom, customTo]);

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === 'range' && value !== 'custom') {
      params.delete('from');
      params.delete('to');
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  const { data: serverData, isLoading, error, refetch } = useQuery({
    queryKey: ['cash-flow', from, to, businessId, businessCurrency],
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc('get_cash_flow_statement_v2', {
        p_business_id: businessId,
        p_start_date: from,
        p_end_date: to,
        p_currency: businessCurrency
      });

      if (rpcError) throw new Error(rpcError.message);

      const sanitized = CashFlowValidator.sanitizeRawData(data);
      if (!sanitized) throw new Error(data?.error || "The ledger could not be loaded for this period.");

      return sanitized;
    },
    enabled: !!businessId && !!businessCurrency,
    retry: 2
  });

  const { tableRows, sectionTotals } = useMemo(() => {
    if (!serverData) return { tableRows: [], sectionTotals: { op: '0.00', inv: '0.00', fin: '0.00' } };

    const rows: CashFlowData[] = [];
    const d = serverData;

    rows.push({ section: 'Operating', line_item: 'Net income', amount: d.net_income_start });
    d.operating.forEach((i: any) => rows.push({ ...i, section: 'Operating' }));
    d.taxes.forEach((t: any) => rows.push({ section: 'Operating', line_item: t.line_item, amount: t.amount, is_tax: true }));

    const opTotal = CashFlowCalculator.calculateSectionTotal([{ amount: d.net_income_start }, ...d.operating, ...d.taxes]);
    rows.push({ section: 'Operating', line_item: 'Net cash from operating activities', amount: parseFloat(opTotal), is_total: true });

    d.investing.forEach((i: any) => rows.push({ ...i, section: 'Investing' }));
    const invTotal = CashFlowCalculator.calculateSectionTotal(d.investing);
    rows.push({ section: 'Investing', line_item: 'Net cash used in investing activities', amount: parseFloat(invTotal), is_total: true });

    d.financing.forEach((i: any) => rows.push({ ...i, section: 'Financing' }));
    const finTotal = CashFlowCalculator.calculateSectionTotal(d.financing);
    rows.push({ section: 'Financing', line_item: 'Net cash from financing activities', amount: parseFloat(finTotal), is_total: true });

    const term = searchQuery.trim().toLowerCase();
    const filtered = rows.filter(row => {
      const matchesSearch = (row.line_item || '').toLowerCase().includes(term);
      const matchesType = statementType === 'all' || row.section.toLowerCase() === statementType.toLowerCase();
      return matchesSearch && matchesType;
    });

    return { tableRows: filtered, sectionTotals: { op: opTotal, inv: invTotal, fin: finTotal } };
  }, [serverData, searchQuery, statementType]);

  const netChange = serverData?.net_change || 0;

  const formatMoney = (val: number) => {
    const amount = Number(val) || 0;
    const text = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: businessCurrency,
      minimumFractionDigits: businessCurrency === 'UGX' ? 0 : 2
    }).format(Math.abs(amount));
    return amount < 0 ? `(${text})` : text;
  };

  const exportCSV = () => {
    if (!tableRows.length) {
      toast.error("Nothing to export");
      return;
    }
    const headers = ["Section", "Line item", `Amount (${businessCurrency})`];
    const rows = tableRows.map(r => [r.section, r.line_item, r.amount]);
    rows.push(['', 'Net change in cash', netChange]);
    const escape = (cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escape).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.setAttribute("download", `Cash_Flow_${from}_${to}.csv`);
    link.click();
  };

  const exportPDF = () => {
    if (!tableRows.length) {
      toast.error("Nothing to export");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Cash Flow Statement", 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${label}`, 14, 28);
    doc.text(`Currency: ${businessCurrency}`, 14, 34);

    autoTable(doc, {
      startY: 44,
      head: [["Section", "Line item", `Amount (${businessCurrency})`]],
      body: [
        ...tableRows.map(r => [r.section, r.line_item, formatMoney(r.amount)]),
        ["", "Net change in cash", formatMoney(netChange)]
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 2: { halign: 'right' } }
    });

    doc.save(`Cash_Flow_${from}_${to}.pdf`);
    toast.success("PDF downloaded");
  };

  if (error) {
    return (
      <div className="mx-auto my-24 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-500" />
        <h2 className="text-base font-semibold text-slate-900">Statement could not load</h2>
        <p className="mt-2 text-sm text-slate-500">
          {error instanceof Error ? error.message : 'The ledger could not be reached.'}
        </p>
        <Button onClick={() => refetch()} className="mt-6 h-10 rounded-lg px-6">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  let lastSection: string | null = null;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-16 xl:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Cash Flow Statement</h1>
          <p className="mt-1.5 text-sm text-slate-500">{label} · {businessCurrency}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={exportPDF}
            className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
          >
            <FileText className="mr-2 h-4 w-4 text-slate-400" />
            PDF
          </Button>
          <Button
            onClick={exportCSV}
            className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Period</Label>
            <Select value={dateRangeMode} onValueChange={(v) => updateFilter('range', v)}>
              <SelectTrigger className="h-9 w-52 rounded-lg border-slate-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="this-month">This month</SelectItem>
                <SelectItem value="last-month">Last month</SelectItem>
                <SelectItem value="this-year">This year</SelectItem>
                <SelectItem value="custom">Custom dates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRangeMode === 'custom' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">From</Label>
                <Input
                  type="date"
                  className="h-9 w-40 rounded-lg border-slate-200 text-sm"
                  value={customFrom}
                  onChange={(e) => updateFilter('from', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">To</Label>
                <Input
                  type="date"
                  className="h-9 w-40 rounded-lg border-slate-200 text-sm"
                  value={customTo}
                  onChange={(e) => updateFilter('to', e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Section</Label>
            <Select value={statementType} onValueChange={(v) => updateFilter('type', v)}>
              <SelectTrigger className="h-9 w-52 rounded-lg border-slate-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all">All sections</SelectItem>
                <SelectItem value="operating">Operating</SelectItem>
                <SelectItem value="investing">Investing</SelectItem>
                <SelectItem value="financing">Financing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-500">Search</Label>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search line items"
              className="h-9 rounded-lg border-slate-200 pl-9 pr-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <X
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-4">
        <Metric label="Operating" value={formatMoney(Number(sectionTotals.op))} />
        <Metric label="Investing" value={formatMoney(Number(sectionTotals.inv))} />
        <Metric label="Financing" value={formatMoney(Number(sectionTotals.fin))} />
        <Metric label="Net change in cash" value={formatMoney(netChange)} />
      </div>

      <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900">Indirect method</h2>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-32 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
              <p className="mt-3 text-sm text-slate-400">Loading</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 hover:bg-transparent">
                    <TableHead className="h-11 px-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Line item
                    </TableHead>
                    <TableHead className="h-11 w-56 px-6 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Amount ({businessCurrency})
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-24 text-center text-sm text-slate-400">
                        No entries for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.map((row, idx) => {
                      const showSection = row.section !== lastSection;
                      lastSection = row.section;
                      return (
                        <React.Fragment key={idx}>
                          {showSection ? (
                            <TableRow className="border-0 hover:bg-transparent">
                              <TableCell
                                colSpan={2}
                                className="px-6 pb-2 pt-7 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                              >
                                {row.section}
                              </TableCell>
                            </TableRow>
                          ) : null}
                          <TableRow
                            className={cn(
                              "border-0 hover:bg-slate-50",
                              row.is_total && "hover:bg-transparent"
                            )}
                          >
                            <TableCell
                              className={cn(
                                "py-2.5 pl-10 pr-6 text-sm text-slate-600",
                                row.is_total && "border-t border-slate-200 py-3.5 pl-6 font-semibold text-slate-900"
                              )}
                            >
                              {row.line_item}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "px-6 py-2.5 text-right text-sm tabular-nums text-slate-700",
                                row.is_total && "border-t border-slate-200 py-3.5 font-semibold text-slate-900"
                              )}
                            >
                              {formatMoney(row.amount)}
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })
                  )}

                  <TableRow className="hover:bg-transparent">
                    <TableCell className="border-t-2 border-slate-900 px-6 py-4 text-sm font-semibold text-slate-900">
                      Net change in cash
                    </TableCell>
                    <TableCell className="border-t-2 border-slate-900 px-6 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatMoney(netChange)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}