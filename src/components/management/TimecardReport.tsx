'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface TimecardRow { full_name: string; total_seconds_worked: number; }

async function fetchTimecards(dateRange: DateRange): Promise<TimecardRow[]> {
    if (!dateRange.from || !dateRange.to) throw new Error("A valid date range is required.");
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_timecard_report', {
        p_start_date: dateRange.from.toISOString().split('T')[0],
        p_end_date: dateRange.to.toISOString().split('T')[0],
    });
    if (error) throw new Error(error.message);
    return data || [];
}

const formatSecondsToHMS = (seconds: number) => {
    if (!seconds) return "00:00:00";
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

export default function TimecardReport() {
    const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -6), to: new Date() });
    const { data, refetch, isLoading, isError, error } = useQuery({
        queryKey: ['timecards', date],
        queryFn: () => fetchTimecards(date!),
        enabled: false,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Employee Timecard Report</CardTitle>
                <CardDescription>Calculate total hours worked for each employee over a specific period.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <DatePickerWithRange date={date} setDate={setDate} />
                    <Button onClick={() => refetch()} disabled={isLoading}>
                        {isLoading ? "Generating..." : "Generate Report"}
                    </Button>
                </div>
                {isError && <p className="text-destructive">Error: {String(error)}</p>}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader><TableRow><TableHead>Employee Name</TableHead><TableHead className="text-right">Total Hours Worked (HH:MM:SS)</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={2} className="text-center h-24">Loading...</TableCell></TableRow>}
                            {!isLoading && !data && <TableRow><TableCell colSpan={2} className="text-center h-24">Generate a report to see results.</TableCell></TableRow>}
                            {data?.map(row => (
                                <TableRow key={row.full_name}>
                                    <TableCell>{row.full_name}</TableCell>
                                    <TableCell className="text-right font-mono">{formatSecondsToHMS(row.total_seconds_worked)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}