"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { RevolutionaryDateRangePicker } from './RevolutionaryDateRangePicker';
import { RevolutionaryProfitAndLossStatement } from './RevolutionaryProfitAndLossStatement';
import { RevolutionaryBalanceSheet } from './RevolutionaryBalanceSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Accurate Type Definitions based on your components ---
export interface ProfitAndLossRecord {
  category: 'Revenue' | 'Cost of Goods Sold' | 'Operating Expenses';
  account_name: string;
  amount: number;
}

export interface BalanceSheetRecord {
  category: 'Assets' | 'Liabilities' | 'Equity';
  sub_category: string;
  account_name: string;
  balance: number;
}

// --- Component Props Interface using the accurate types ---
interface FinanceHubProps {
    pnl: ProfitAndLossRecord[];
    bs: BalanceSheetRecord[];
    pnlPeriod: string;
    bsDate: string;
}

export function FinanceHub({
    pnl,
    bs,
    pnlPeriod,
    bsDate,
}: FinanceHubProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [date, setDate] = useState<DateRange | undefined>(() => {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (from && to) {
            return {
                from: parseISO(from),
                to: parseISO(to),
            };
        }
        return undefined;
    });

    useEffect(() => {
        if (date?.from && date?.to) {
            const params = new URLSearchParams(searchParams);
            const formattedFrom = format(date.from, 'yyyy-MM-dd');
            const formattedTo = format(date.to, 'yyyy-MM-dd');
            
            if (params.get('from') !== formattedFrom || params.get('to') !== formattedTo) {
                params.set('from', formattedFrom);
                params.set('to', formattedTo);
                router.push(`${pathname}?${params.toString()}`);
            }
        }
    }, [date, pathname, router, searchParams]);

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Financial Intelligence Hub</h1>
                    <p className="text-muted-foreground">
                        Generate, visualize, and drill down into key financial statements.
                    </p>
                </div>
                <RevolutionaryDateRangePicker date={date} setDate={setDate} />
            </div>

            <Tabs defaultValue="pnl" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
                    <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
                </TabsList>
                <TabsContent value="pnl">
                    <RevolutionaryProfitAndLossStatement data={pnl} reportPeriod={pnlPeriod} />
                </TabsContent>
                <TabsContent value="bs">
                    <RevolutionaryBalanceSheet data={bs} reportDate={bsDate} />
                </TabsContent>
            </Tabs>
        </>
    );
}