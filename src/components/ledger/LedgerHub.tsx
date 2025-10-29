"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { RevolutionaryLedgerTable } from './RevolutionaryLedgerTable';
import { RevolutionaryDateRangePicker } from '@/components/reports/RevolutionaryDateRangePicker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// --- Accurate Type Definition based on your RevolutionaryLedgerTable.tsx ---
export interface LedgerEntry {
  id: string;
  date: string;
  account_name: string;
  account_type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

// --- Component Props Interface ---
interface LedgerHubProps {
    entries: LedgerEntry[];
}

export function LedgerHub({ entries }: LedgerHubProps) {
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
                    <h1 className="text-3xl font-bold tracking-tight">General Ledger Explorer</h1>
                    <p className="text-muted-foreground">
                        An interactive, drill-down view of all financial transactions.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <RevolutionaryDateRangePicker date={date} setDate={setDate} />
                    <Button>New Journal Entry</Button>
                </div>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>
                        Displaying all transactions for the selected period. Use the controls to sort, filter, and export.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Note: The prop is `data` as expected by RevolutionaryLedgerTable */}
                    <RevolutionaryLedgerTable data={entries} />
                </CardContent>
            </Card>
        </>
    );
}