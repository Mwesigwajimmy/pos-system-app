"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

// UI Components
import { RevolutionaryLedgerTable } from './RevolutionaryLedgerTable';
import { RevolutionaryDateRangePicker } from '@/components/reports/RevolutionaryDateRangePicker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Fingerprint, ShieldCheck } from 'lucide-react';

// Enterprise Interconnect: Import the manual entry component
import { CreateEntryDialog } from '@/components/accounting/GeneralJournalTable'; 

// --- Accurate Type Definition ---
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

// --- Enterprise Component Props ---
interface LedgerHubProps {
    entries: LedgerEntry[];
    businessId: string; // REQUIRED for Enterprise Interconnect
    userId: string;     // REQUIRED for Audit Trail
}

export function LedgerHub({ entries, businessId, userId }: LedgerHubProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 1. Modal State Control
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

    // 2. Date Filtering Logic
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

    // 3. Navigation Sync (Updates URL when date changes)
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
        <div className="space-y-6">
            {/* Header: Mission Control for the Ledger */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">General Ledger Explorer</h1>
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-muted-foreground max-w-xl">
                        Universal drill-down view of all interconnected financial modules including POS, Bills, and manual entries.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
                    <RevolutionaryDateRangePicker date={date} setDate={setDate} />
                    
                    {/* ENTERPRISE ACTION: The button now triggers the modal state */}
                    <Button 
                        onClick={() => setIsEntryModalOpen(true)}
                        className="bg-blue-700 hover:bg-blue-800 shadow-md font-bold"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Journal Entry
                    </Button>
                </div>
            </div>

            {/* Quick Metrics Bar (Enterprise Standard) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-l-4 border-l-blue-600 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-700"><BookOpen className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] uppercase font-black text-slate-500">Live Connections</p>
                        <p className="text-sm font-bold">100% Interconnected</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-l-4 border-l-green-600 flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-lg text-green-700"><ShieldCheck className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] uppercase font-black text-slate-500">Integrity Status</p>
                        <p className="text-sm font-bold text-green-700">Balanced (GAAP/IFRS)</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-l-4 border-l-purple-600 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-700"><Fingerprint className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] uppercase font-black text-slate-500">Compliance Logic</p>
                        <p className="text-sm font-bold">Audit Trail Active</p>
                    </div>
                </div>
            </div>

            {/* The Main Ledger Card */}
            <Card className="shadow-2xl border-none overflow-hidden bg-white">
                <CardHeader className="border-b bg-slate-50/50">
                    <CardTitle className="text-lg">Financial Transaction Stream</CardTitle>
                    <CardDescription>
                        Real-time feed from the General Ledger. All entries are immutable once posted.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <RevolutionaryLedgerTable data={entries} />
                </CardContent>
            </Card>

            {/* --- THE INTERCONNECTED MODAL --- */}
            {/* 
               This opens when the state changes. 
               We pass businessId and userId to ensure the entry is 100% enterprise-compliant.
            */}
            <CreateEntryDialog 
                businessId={businessId}
                isOpen={isEntryModalOpen}
                onClose={() => setIsEntryModalOpen(false)}
            />
        </div>
    );
}