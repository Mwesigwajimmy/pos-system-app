// src/components/compliance/ComplianceHub.tsx
"use client"; // This is the crucial directive that marks this as a Client Component.

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

// Assuming the date picker is in the reports component folder
import { RevolutionaryDateRangePicker } from '@/components/reports/RevolutionaryDateRangePicker';

// Import the dashboards and their required types from the same directory
import { RevolutionarySalesTaxDashboard } from './RevolutionarySalesTaxDashboard';
import { RevolutionaryComplianceDashboard } from './RevolutionaryComplianceDashboard';

// --- Type Definitions ---
// These are strictly matched to the requirements of RevolutionaryComplianceDashboard.tsx

export interface TaxSummary {
    total_revenue: number;
    total_taxable_revenue: number;
    total_tax_collected: number;
}

export interface TaxableTransaction {
    id: string;
    date: string;
    description: string;
    invoice_id: string;
    taxable_amount: number;
    tax_collected: number;
}

// **FINAL FIXED INTERFACE:** Now perfectly matches the ComplianceTask interface 
// inside RevolutionaryComplianceDashboard.tsx.
export interface ComplianceTask {
    id: string;
    name: string; // The dashboard uses 'name', not 'title'
    due_date: string;
    // Status and Priority are now a strict union of string literals
    status: 'Pending' | 'Completed' | 'Overdue';
    priority: 'High' | 'Medium' | 'Low';
    // Removed 'title' and 'description?' as they are not used by the target component
}


// --- Component Props Interface ---
// Defines the data this client component expects to receive from the server page.
interface ComplianceHubProps {
    taxSummary: TaxSummary;
    taxTransactions: TaxableTransaction[];
    tasks: ComplianceTask[];
    reportPeriod: string;
}

/**
 * A client-side wrapper component that manages the state for the compliance
 * dashboards, including the interactive date range picker. It updates the URL
 * to trigger server-side data refetching when the date range changes.
 */
export function ComplianceHub({
    taxSummary,
    taxTransactions,
    tasks,
    reportPeriod,
}: ComplianceHubProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize state from URL search parameters to ensure consistency
    // across page reloads and navigations.
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

    // This effect synchronizes the URL with the date picker's state.
    // When a user selects a new date range, this pushes the new dates
    // to the URL search parameters, which re-triggers the parent Server Component.
    useEffect(() => {
        // Only proceed if a valid date range is selected.
        if (date?.from && date?.to) {
            const params = new URLSearchParams(searchParams);
            const formattedFrom = format(date.from, 'yyyy-MM-dd');
            const formattedTo = format(date.to, 'yyyy-MM-dd');
            
            // Update only if the dates have actually changed to prevent an infinite loop.
            if (params.get('from') !== formattedFrom || params.get('to') !== formattedTo) {
                params.set('from', formattedFrom);
                params.set('to', formattedTo);
                
                // Use router.push to navigate to the new URL. Next.js will handle
                // the server-side re-render of the page with the new params.
                router.push(`${pathname}?${params.toString()}`);
            }
        }
    }, [date, pathname, router, searchParams]);

    return (
        <>
            {/* Main Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Tax & Compliance Hub</h1>
                    <p className="text-muted-foreground">
                        An intelligent command center for managing tax obligations and compliance deadlines.
                    </p>
                </div>
                
                {/* 
                  The RevolutionaryDateRangePicker now has its state managed here.
                  We pass the current 'date' and the 'setDate' function to it.
                */}
                <RevolutionaryDateRangePicker date={date} setDate={setDate} />
            </div>

            {/* Dashboards Grid */}
            <div className="grid gap-8 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    {/* The sales tax dashboard receives data fetched from the server. */}
                    <RevolutionarySalesTaxDashboard
                        summary={taxSummary}
                        transactions={taxTransactions}
                        reportPeriod={reportPeriod}
                    />
                </div>
                <div className="lg:col-span-2">
                    {/* The compliance dashboard receives its data similarly. */}
                    <RevolutionaryComplianceDashboard tasks={tasks} />
                </div>
            </div>
        </>
    );
}