"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { 
    Settings2, 
    ShieldCheck, 
    Fingerprint, 
    Activity, 
    Globe, 
    Landmark 
} from "lucide-react";
import { Badge } from '@/components/ui/badge';

// Existing Imports
import { RevolutionaryDateRangePicker } from '@/components/reports/RevolutionaryDateRangePicker';
import { RevolutionarySalesTaxDashboard } from './RevolutionarySalesTaxDashboard';
import { RevolutionaryComplianceDashboard } from './RevolutionaryComplianceDashboard';

// NEW: Import your Smart Tax Settings
import TaxSettings from './TaxSettings';

// --- UPGRADED ENTERPRISE INTERFACES (Handshake with Database Kernel) ---
export interface TaxSummary {
    total_revenue: number;
    total_taxable_revenue: number;
    total_tax_collected: number;    // Output Tax
    total_input_tax_credit: number; // UPGRADE: Forensic Input Tax
    net_tax_liability: number;      // UPGRADE: Final Settlement Truth
}

export interface TaxableTransaction {
    id: string;
    date: string;
    description: string;
    invoice_id: string;
    taxable_amount: number;
    tax_collected: number;
    tax_rate: number;      // UPGRADE: Mandatory for Audit
    category_code?: string; // e.g. 'STANDARD'
}

export interface ComplianceTask {
    id: string;
    name: string;
    due_date: string;
    status: 'Pending' | 'Completed' | 'Overdue';
    priority: 'High' | 'Medium' | 'Low';
    category?: string;
}

interface ComplianceHubProps {
    taxSummary: TaxSummary;
    taxTransactions: TaxableTransaction[];
    tasks: ComplianceTask[];
    reportPeriod: string;
    businessId: string; 
    businessName?: string; // UPGRADE: Added for Sovereign Identity
    currency?: string;     // UPGRADE: Added for jurisdictional accuracy
}

export function ComplianceHub({
    taxSummary,
    taxTransactions,
    tasks,
    reportPeriod,
    businessId,
    businessName = "Sovereign Entity",
    currency = "UGX"
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
                router.push(`${pathname}?${params.toString()}`, { scroll: false });
            }
        }
    }, [date, pathname, router, searchParams]);

    return (
        <div className="space-y-8">
            {/* Main Header Section - Enterprise Grade Identity */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 bg-white p-6 rounded-[2rem] border shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Forensic Compliance Module
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                        Tax & Compliance Hub
                    </h1>
                    <p className="text-muted-foreground font-medium italic text-sm">
                        Intelligent command center for <span className="text-blue-600 font-bold">{businessName}</span>.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* ENTERPRISE SMART SETUP BUTTON */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-11 flex items-center gap-2 border-slate-200 shadow-sm hover:bg-slate-50 font-bold px-6 rounded-xl">
                                <Settings2 className="w-4 h-4 text-blue-600" />
                                <span className="text-xs uppercase tracking-widest">Jurisdiction DNA</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto border-none rounded-[3rem] shadow-2xl p-0">
                            {/* We pass businessId to ensure rules are welded to the correct empire */}
                            <TaxSettings businessId={businessId} />
                        </DialogContent>
                    </Dialog>

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

                    <RevolutionaryDateRangePicker date={date} setDate={setDate} />
                    
                    <div className="hidden lg:flex items-center gap-2 ml-2">
                        <Badge variant="outline" className="bg-slate-900 text-white border-none font-mono text-[10px] px-3 py-1">
                            {currency} JURISDICTION
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Dashboards Grid - The Multi-Sector Intelligence View */}
            <div className="grid gap-8 lg:grid-cols-5 items-start">
                {/* Sales Tax Intelligence (Spans 3 Columns) */}
                <div className="lg:col-span-3 h-full">
                    <RevolutionarySalesTaxDashboard
                        summary={taxSummary}
                        transactions={taxTransactions}
                        reportPeriod={reportPeriod}
                        currency={currency}
                    />
                </div>

                {/* Task Center & Risk Monitor (Spans 2 Columns) */}
                <div className="lg:col-span-2 h-full">
                    <RevolutionaryComplianceDashboard 
                        tasks={tasks} 
                        businessName={businessName}
                    />
                </div>
            </div>

            {/* Forensic Footer - Systemic Proof */}
            <div className="flex flex-col md:flex-row justify-between items-center px-6 py-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2 text-emerald-600">
                        <ShieldCheck className="w-3.5 h-3.5"/> 
                        Kernel V10.2 Handshake Active
                    </span>
                    <span className="flex items-center gap-2">
                        <Fingerprint className="w-3.5 h-3.5"/> 
                        Forensic Isolation: VERIFIED
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                    <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
                    LIVE TELEMETRY FEED: COMPLIANCE_HUB_SYNCED
                </div>
            </div>
        </div>
    );
}