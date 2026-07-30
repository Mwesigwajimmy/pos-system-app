'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
    AlertCircle,
    ArrowRight,
    ArrowRightLeft,
    Download,
    FileSpreadsheet,
    Loader2,
    Printer,
    Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useCopilot } from '@/context/CopilotContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const COLS = 'grid-cols-[minmax(0,1fr)_200px]';
const COLS_PCT = 'grid-cols-[minmax(0,1fr)_200px_120px]';

type LineVariant = 'item' | 'subtotal' | 'total';

function Line({
    label,
    note,
    amount,
    percent,
    showPercent,
    variant = 'item',
}: {
    label: string;
    note?: string;
    amount: string;
    percent?: string;
    showPercent: boolean;
    variant?: LineVariant;
}) {
    return (
        <div
            className={cn(
                'grid items-baseline gap-8 px-5',
                showPercent ? COLS_PCT : COLS,
                variant === 'item' && 'py-2.5 text-sm text-slate-600',
                variant === 'subtotal' &&
                    'py-3.5 mt-1 border-t border-slate-200 text-sm font-semibold text-slate-900',
                variant === 'total' &&
                    'py-4 mt-1 border-t-2 border-slate-900 text-base font-semibold text-slate-900',
            )}
        >
            <div className="flex items-baseline gap-3 min-w-0">
                <span className="truncate">{label}</span>
                {note ? <span className="text-xs font-normal text-slate-400">{note}</span> : null}
            </div>
            <div className="text-right tabular-nums">{amount}</div>
            {showPercent ? (
                <div className="text-right tabular-nums text-xs text-slate-400">{percent}</div>
            ) : null}
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="px-5 pt-8 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {children}
        </h2>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="px-6 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
        </div>
    );
}

export default function IncomeStatementMaster() {
    const supabase = createClient();
    const { businessId, openCopilot } = useCopilot();

    const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [viewCurrency, setViewCurrency] = useState<'LOCAL' | 'USD'>('LOCAL');
    const [showPercent, setShowPercent] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['enterprise-pnl-v11', dateFrom, dateTo, businessId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_enterprise_pnl_v11', {
                p_business_id: businessId,
                p_start_date: dateFrom,
                p_end_date: dateTo,
            });
            if (error) throw error;
            return data;
        },
        enabled: !!businessId,
    });

    const currencyCode = data?.metadata?.currency || 'UGX';
    const displayCurrency = viewCurrency === 'LOCAL' ? currencyCode : 'USD';
    const totalRev = data?.summary?.rev || 1;

    const formatMoney = (val: number) => {
        const base = Number(val) || 0;
        const amount = viewCurrency === 'LOCAL' ? base : base / 3800;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: displayCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const bracket = (val: number) => `(${formatMoney(Math.abs(Number(val) || 0))})`;
    const getPct = (val: number) => ((Math.abs(Number(val) || 0) / totalRev) * 100).toFixed(1) + '%';

    const handleExportPDF = () => {
        if (!data) return;
        setIsExporting(true);
        try {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Income Statement', 14, 20);
            doc.setFontSize(10);
            doc.text(`${data.metadata.entity}`, 14, 28);
            doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 34);
            doc.text(`Currency: ${displayCurrency}`, 14, 40);

            autoTable(doc, {
                startY: 50,
                head: [['Line item', 'Amount', '% of revenue']],
                body: [
                    ['Revenue', formatMoney(data.summary.rev), '100.0%'],
                    ['Cost of sales', bracket(data.summary.cogs), getPct(data.summary.cogs)],
                    ['Gross profit', formatMoney(data.summary.gross_profit), getPct(data.summary.gross_profit)],
                    ['Operating expenses', bracket(data.summary.opex), getPct(data.summary.opex)],
                    ['EBITDA', formatMoney(data.summary.ebitda), getPct(data.summary.ebitda)],
                    ['Depreciation and amortisation', bracket(data.summary.da), getPct(data.summary.da)],
                    ['Finance costs', bracket(data.summary.interest), getPct(data.summary.interest)],
                    ['Other income', formatMoney(data.summary.other_inc), getPct(data.summary.other_inc)],
                    ['Profit before tax', formatMoney(data.summary.ebt), getPct(data.summary.ebt)],
                    ['Tax', bracket(data.summary.total_tax), getPct(data.summary.total_tax)],
                    ['Net profit', formatMoney(data.summary.net_income), getPct(data.summary.net_income)],
                ],
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
            });

            doc.save(`Income_Statement_${dateFrom}_${dateTo}.pdf`);
            toast.success('PDF downloaded');
        } catch (err) {
            toast.error('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportExcel = () => {
        if (!data) return;
        const wb = XLSX.utils.book_new();
        const wsData = [
            ['Income Statement'],
            [`${data?.metadata?.entity ?? ''}`],
            [`Period: ${dateFrom} to ${dateTo}`],
            [`Currency: ${displayCurrency}`],
            [],
            ['Line item', 'Amount', '% of revenue'],
            ['Revenue', data?.summary?.rev, '100.0%'],
            ['Cost of sales', -data?.summary?.cogs, getPct(data?.summary?.cogs)],
            ['Gross profit', data?.summary?.gross_profit, getPct(data?.summary?.gross_profit)],
            ['Operating expenses', -data?.summary?.opex, getPct(data?.summary?.opex)],
            ['EBITDA', data?.summary?.ebitda, getPct(data?.summary?.ebitda)],
            ['Depreciation and amortisation', -data?.summary?.da, getPct(data?.summary?.da)],
            ['Finance costs', -data?.summary?.interest, getPct(data?.summary?.interest)],
            ['Other income', data?.summary?.other_inc, getPct(data?.summary?.other_inc)],
            ['Profit before tax', data?.summary?.ebt, getPct(data?.summary?.ebt)],
            ['Tax', -data?.summary?.total_tax, getPct(data?.summary?.total_tax)],
            ['Net profit', data?.summary?.net_income, getPct(data?.summary?.net_income)],
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 34 }, { wch: 18 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Income Statement');
        XLSX.writeFile(wb, `Income_Statement_${dateFrom}_${dateTo}.xlsx`);
        toast.success('Spreadsheet downloaded');
    };

    if (error) {
        return (
            <div className="mx-auto my-24 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-500" />
                <h2 className="text-base font-semibold text-slate-900">Statement could not load</h2>
                <p className="mt-2 text-sm text-slate-500">{error.message}</p>
                <Button onClick={() => refetch()} className="mt-6 h-10 rounded-lg px-6">
                    Try again
                </Button>
            </div>
        );
    }

    const taxes: Array<{ label: string; value: number }> = data?.summary?.taxes ?? [];

    return (
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 xl:px-8">
            <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
                <div className="flex flex-wrap items-center gap-5">
                    <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-slate-500">From</Label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-9 w-40 rounded-lg border-slate-200 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-slate-500">To</Label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-9 w-40 rounded-lg border-slate-200 text-sm"
                        />
                    </div>
                    <div className="hidden h-6 w-px bg-slate-200 sm:block" />
                    <div className="flex items-center gap-2.5">
                        <Switch checked={showPercent} onCheckedChange={setShowPercent} />
                        <span className="text-xs font-medium text-slate-500">Show % of revenue</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setViewCurrency(viewCurrency === 'LOCAL' ? 'USD' : 'LOCAL')}
                        className="h-9 rounded-lg border-slate-200 px-3 text-xs font-medium"
                    >
                        <ArrowRightLeft size={14} className="mr-2 text-slate-400" />
                        {viewCurrency === 'LOCAL' ? 'USD' : currencyCode}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="h-9 rounded-lg border-slate-200 px-3 text-xs font-medium"
                    >
                        <Printer size={14} className="mr-2 text-slate-400" />
                        Print
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        className="h-9 rounded-lg border-slate-200 px-3 text-xs font-medium"
                    >
                        <FileSpreadsheet size={14} className="mr-2 text-slate-400" />
                        Excel
                    </Button>
                    <Button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
                    >
                        {isExporting ? (
                            <Loader2 size={14} className="mr-2 animate-spin" />
                        ) : (
                            <Download size={14} className="mr-2" />
                        )}
                        PDF
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-[640px] w-full rounded-xl" />
                </div>
            ) : (
                <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm print:border-0 print:shadow-none">
                    <CardHeader className="flex flex-col gap-6 border-b border-slate-200 px-8 py-7 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Income Statement</h1>
                            <p className="mt-1.5 text-sm text-slate-500">{data?.metadata?.entity}</p>
                            <p className="text-sm text-slate-500">
                                {dateFrom} to {dateTo}
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                                    Currency
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{displayCurrency}</p>
                            </div>
                            {data?.audit?.hash ? (
                                <Badge
                                    variant="secondary"
                                    className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-normal text-slate-500"
                                >
                                    {data.audit.hash.slice(0, 12)}
                                </Badge>
                            ) : null}
                        </div>
                    </CardHeader>

                    <div className="grid divide-y divide-slate-200 border-b border-slate-200 bg-slate-50/60 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 sm:divide-x">
                        <Metric label="Revenue" value={formatMoney(data?.summary?.rev)} />
                        <Metric label="Gross profit" value={formatMoney(data?.summary?.gross_profit)} />
                        <Metric label="EBITDA" value={formatMoney(data?.summary?.ebitda)} />
                        <Metric label="Net profit" value={formatMoney(data?.summary?.net_income)} />
                    </div>

                    <CardContent className="px-4 pb-10 pt-2 md:px-8">
                        <div
                            className={cn(
                                'grid gap-8 px-5 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400',
                                showPercent ? COLS_PCT : COLS,
                            )}
                        >
                            <span>Line item</span>
                            <span className="text-right">Amount</span>
                            {showPercent ? <span className="text-right">% of revenue</span> : null}
                        </div>

                        <div className="border-t border-slate-900" />

                        <SectionTitle>Revenue</SectionTitle>
                        <Line
                            label="Revenue"
                            amount={formatMoney(data?.summary?.rev)}
                            percent="100.0%"
                            showPercent={showPercent}
                        />
                        <Line
                            label="Cost of sales"
                            amount={bracket(data?.summary?.cogs)}
                            percent={getPct(data?.summary?.cogs)}
                            showPercent={showPercent}
                        />
                        <Line
                            label="Gross profit"
                            note={data?.ratios?.gross_margin ? `Margin ${data.ratios.gross_margin}%` : undefined}
                            amount={formatMoney(data?.summary?.gross_profit)}
                            percent={getPct(data?.summary?.gross_profit)}
                            showPercent={showPercent}
                            variant="subtotal"
                        />

                        <SectionTitle>Operating expenses</SectionTitle>
                        <Line
                            label="Operating expenses"
                            amount={bracket(data?.summary?.opex)}
                            percent={getPct(data?.summary?.opex)}
                            showPercent={showPercent}
                        />
                        <Line
                            label="EBITDA"
                            note={
                                data?.ratios?.operating_margin ? `Margin ${data.ratios.operating_margin}%` : undefined
                            }
                            amount={formatMoney(data?.summary?.ebitda)}
                            percent={getPct(data?.summary?.ebitda)}
                            showPercent={showPercent}
                            variant="subtotal"
                        />

                        <SectionTitle>Other charges and income</SectionTitle>
                        <Line
                            label="Depreciation and amortisation"
                            amount={bracket(data?.summary?.da)}
                            percent={getPct(data?.summary?.da)}
                            showPercent={showPercent}
                        />
                        <Line
                            label="Finance costs"
                            amount={bracket(data?.summary?.interest)}
                            percent={getPct(data?.summary?.interest)}
                            showPercent={showPercent}
                        />
                        <Line
                            label="Other income"
                            amount={formatMoney(data?.summary?.other_inc)}
                            percent={getPct(data?.summary?.other_inc)}
                            showPercent={showPercent}
                        />
                        <Line
                            label="Profit before tax"
                            amount={formatMoney(data?.summary?.ebt)}
                            percent={getPct(data?.summary?.ebt)}
                            showPercent={showPercent}
                            variant="subtotal"
                        />

                        <SectionTitle>Tax{data?.audit?.jurisdiction ? ` — ${data.audit.jurisdiction}` : ''}</SectionTitle>
                        {taxes.length > 0 ? (
                            taxes.map((t, i) => (
                                <Line
                                    key={i}
                                    label={t.label}
                                    amount={bracket(t.value)}
                                    percent={getPct(t.value)}
                                    showPercent={showPercent}
                                />
                            ))
                        ) : (
                            <div className="px-5 py-2.5 text-sm text-slate-400">No tax lines recorded</div>
                        )}
                        <Line
                            label="Total tax"
                            amount={bracket(data?.summary?.total_tax)}
                            percent={getPct(data?.summary?.total_tax)}
                            showPercent={showPercent}
                            variant="subtotal"
                        />

                        <div className="mt-4">
                            <Line
                                label="Net profit"
                                note={data?.ratios?.net_margin ? `Margin ${data.ratios.net_margin}%` : undefined}
                                amount={formatMoney(data?.summary?.net_income)}
                                percent={getPct(data?.summary?.net_income)}
                                showPercent={showPercent}
                                variant="total"
                            />
                        </div>
                    </CardContent>

                    <div className="border-t border-slate-200 bg-slate-50/60 px-8 py-5 print:hidden">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-500">Account detail</p>
                            <div className="flex flex-wrap gap-2">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="h-9 rounded-lg border-slate-200 bg-white px-4 text-xs font-medium"
                                        >
                                            <Search size={14} className="mr-2 text-slate-400" />
                                            View accounts
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent className="w-full p-0 sm:max-w-lg">
                                        <SheetHeader className="border-b border-slate-200 px-6 py-5">
                                            <SheetTitle className="text-base font-semibold text-slate-900">
                                                Account detail
                                            </SheetTitle>
                                        </SheetHeader>
                                        <div className="max-h-[calc(100vh-88px)] overflow-y-auto px-6 py-4">
                                            {data?.drill_down ? (
                                                <div className="divide-y divide-slate-100">
                                                    {Object.entries(data.drill_down).map(([name, val]) => (
                                                        <div
                                                            key={name}
                                                            className="flex items-center justify-between gap-6 py-3"
                                                        >
                                                            <span className="truncate text-sm text-slate-600">
                                                                {name}
                                                            </span>
                                                            <span className="tabular-nums text-sm font-medium text-slate-900">
                                                                {formatMoney(val as number)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="py-12 text-center text-sm text-slate-400">
                                                    No accounts to show
                                                </p>
                                            )}
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                <Button
                                    onClick={() => openCopilot()}
                                    className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
                                >
                                    Open Copilot
                                    <ArrowRight size={14} className="ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <CardFooter className="flex flex-col gap-2 border-t border-slate-200 px-8 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <span>Generated {format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
                        <span>{data?.metadata?.entity}</span>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}