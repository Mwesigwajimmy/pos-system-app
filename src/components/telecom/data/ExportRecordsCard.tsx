// src/components/telecom/data/ExportRecordsCard.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Calendar as CalendarIcon, Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrintableHistoryReport } from './PrintableHistoryReport'; // We will create this next

// This type must match the columns returned by your RPC function
interface TransactionRecord {
    created_at: string;
    agent_name: string;
    transaction_type: string;
    amount: number;
    customer_phone: string | null;
    notes: string | null;
}

export function ExportRecordsCard() {
    const supabase = createClient();
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ content: () => printRef.current });

    const { data: records, isLoading, refetch } = useQuery({
        queryKey: ['telecomExportRecords', dateRange],
        queryFn: async (): Promise<TransactionRecord[]> => {
            if (!dateRange?.from || !dateRange?.to) return [];
            const { data, error } = await supabase.rpc('get_telecom_transactions_by_date', {
                p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
                p_end_date: format(dateRange.to, 'yyyy-MM-dd'),
            });
            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: false, // Only run query when `refetch` is called
    });

    const handleDownloadCSV = () => {
        if (!records || records.length === 0) return;
        const headers = ['Date', 'Agent', 'Type', 'Amount', 'Customer Phone', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...records.map(r => [
                `"${format(new Date(r.created_at), 'yyyy-MM-dd HH:mm:ss')}"`,
                `"${r.agent_name}"`,
                `"${r.transaction_type}"`,
                r.amount,
                `"${r.customer_phone || ''}"`,
                `"${(r.notes || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `telecom_export_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full sm:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent>
                </Popover>
                <Button onClick={() => refetch()} disabled={isLoading || !dateRange?.from}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate Report
                </Button>
            </div>
            
            {records && records.length > 0 && (
                <div className="border-t pt-4 flex gap-2">
                    <Button onClick={handleDownloadCSV}><Download className="mr-2 h-4 w-4"/> Download as CSV</Button>
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Report</Button>
                </div>
            )}
            
            <div className="hidden">
                <PrintableHistoryReport ref={printRef} records={records || []} dateRange={dateRange} />
            </div>
        </div>
    );
}