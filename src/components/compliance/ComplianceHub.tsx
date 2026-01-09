"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

// UI Components
import { Button } from "@/components/ui/button";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";

// Existing Imports
import { RevolutionaryDateRangePicker } from '@/components/reports/RevolutionaryDateRangePicker';
import { RevolutionarySalesTaxDashboard } from './RevolutionarySalesTaxDashboard';
import { RevolutionaryComplianceDashboard } from './RevolutionaryComplianceDashboard';

// NEW: Import your Smart Tax Settings
import TaxSettings from './TaxSettings';

// --- Type Definitions ---
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

export interface ComplianceTask {
    id: string;
    name: string;
    due_date: string;
    status: 'Pending' | 'Completed' | 'Overdue';
    priority: 'High' | 'Medium' | 'Low';
}

interface ComplianceHubProps {
    taxSummary: TaxSummary;
    taxTransactions: TaxableTransaction[];
    tasks: ComplianceTask[];
    reportPeriod: string;
    businessId: string; // Added this to pass to TaxSettings
}

export function ComplianceHub({
    taxSummary,
    taxTransactions,
    tasks,
    reportPeriod,
    businessId
}: ComplianceHubProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [date, setDate] = useState<DateRange | undefined>(() => {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (from && to) {
            return { from: parseISO(from), to: parseISO(to) };
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
            {/* Main Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tax & Compliance Hub</h1>
                    <p className="text-muted-foreground">
                        An intelligent command center for managing tax obligations.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* ENTERPRISE SMART SETUP BUTTON */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2 border-slate-300 shadow-sm hover:bg-slate-50">
                                <Settings2 className="w-4 h-4 text-blue-600" />
                                Jurisdiction Setup
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Global Tax Jurisdictions</DialogTitle>
                            </DialogHeader>
                            {/* Pass businessId down so the rules are saved to the correct account */}
                            <TaxSettings businessId={businessId} />
                        </DialogContent>
                    </Dialog>

                    <RevolutionaryDateRangePicker date={date} setDate={setDate} />
                </div>
            </div>

            {/* Dashboards Grid */}
            <div className="grid gap-8 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <RevolutionarySalesTaxDashboard
                        summary={taxSummary}
                        transactions={taxTransactions}
                        reportPeriod={reportPeriod}
                    />
                </div>
                <div className="lg:col-span-2">
                    <RevolutionaryComplianceDashboard tasks={tasks} />
                </div>
            </div>
        </>
    );
}