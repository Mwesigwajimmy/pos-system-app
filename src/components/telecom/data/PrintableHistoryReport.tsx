// src/components/telecom/data/PrintableHistoryReport.tsx
'use client';

import React from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface TransactionRecord {
    created_at: string;
    agent_name: string;
    transaction_type: string;
    amount: number;
}

interface PrintableReportProps {
    records: TransactionRecord[];
    dateRange?: DateRange;
}

export const PrintableHistoryReport = React.forwardRef<HTMLDivElement, PrintableReportProps>(
    ({ records, dateRange }, ref) => {
        const total = records.reduce((sum, r) => sum + r.amount, 0);

        return (
            <div ref={ref} className="p-8 bg-white text-black">
                <h1 className="text-2xl font-bold">Telecom Transaction Report</h1>
                {dateRange?.from && (
                    <p className="mb-6">
                        Period: {format(dateRange.from, "LLL dd, y")}
                        {dateRange.to && ` - ${format(dateRange.to, "LLL dd, y")}`}
                    </p>
                )}
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Agent</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-right p-2">Amount (UGX)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((r, index) => (
                            <tr key={index} className="border-b">
                                <td className="p-2">{format(new Date(r.created_at), 'Pp')}</td>
                                <td className="p-2">{r.agent_name}</td>
                                <td className="p-2">{r.transaction_type}</td>
                                <td className="text-right p-2 font-mono">{r.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black font-bold">
                            <td colSpan={3} className="text-right p-2">Total Volume:</td>
                            <td className="text-right p-2 font-mono">{total.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    }
);
PrintableHistoryReport.displayName = 'PrintableHistoryReport';