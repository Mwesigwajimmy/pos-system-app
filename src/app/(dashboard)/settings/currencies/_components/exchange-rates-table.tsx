// src/app/(dashboard)/settings/currencies/_components/exchange-rates-table.tsx
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useExchangeRates } from '@/hooks/use-exchange-rates';

/**
 * Displays the list of exchange rates.
 * This component is responsible for fetching and rendering the data.
 * It handles its own loading, empty, and error states internally.
 */
export function ExchangeRatesTable() {
    const { data: rates, isLoading, isError } = useExchangeRates();

    if (isLoading) {
        return <ExchangeRatesTable.Skeleton />;
    }

    if (isError) {
        // The main ErrorBoundary in page.tsx will catch this and display a user-friendly message.
        throw new Error('Failed to fetch exchange rates. This will be caught by the Error Boundary.');
    }

    if (!rates || rates.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg text-center">
                <div>
                    <h3 className="text-xl font-semibold">No Exchange Rates Found</h3>
                    <p className="text-muted-foreground mt-2">Get started by adding your first exchange rate.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Currency</TableHead>
                        <TableHead className="text-right">Rate (to UGX)</TableHead>
                        <TableHead className="text-right">Effective Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rates.map(rate => (
                        <TableRow key={rate.id}>
                            <TableCell className="font-medium">{rate.currency_code}</TableCell>
                            <TableCell className="text-right">{new Intl.NumberFormat('en-US').format(rate.rate)}</TableCell>
                            <TableCell className="text-right">{format(new Date(rate.effective_date), 'dd MMM, yyyy')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

/**
 * Provides a skeleton loader for the table.
 * This gives a better visual indication of what is loading.
 */
ExchangeRatesTable.Skeleton = function TableSkeleton() {
    return (
        <div className="space-y-3 rounded-md border p-4">
             <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2 ml-auto" />
                <Skeleton className="h-5 w-1/2 ml-auto" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-4 mt-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            ))}
        </div>
    );
};