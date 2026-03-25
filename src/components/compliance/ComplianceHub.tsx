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
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from "@/components/ui/card";
import { 
    Settings2, 
    ShieldCheck, 
    CheckCircle2,
    Activity, 
    Globe, 
    LayoutDashboard
} from "lucide-react";
import { Badge } from '@/components/ui/badge';

// Existing Imports
import { RevolutionaryDateRangePicker } from '@/components/reports/RevolutionaryDateRangePicker';
import { RevolutionarySalesTaxDashboard } from './RevolutionarySalesTaxDashboard';
import { RevolutionaryComplianceDashboard } from './RevolutionaryComplianceDashboard';
import TaxSettings from './TaxSettings';

// --- Interfaces ---
export interface TaxSummary {
    total_revenue: number;
    total_taxable_revenue: number;
    total_tax_collected: number;
    total_input_tax_credit: number;
    net_tax_liability: number;
}

export interface TaxableTransaction {
    id: string;
    date: string;
    description: string;
    invoice_id: string;
    taxable_amount: number;
    tax_collected: number;
    tax_rate: number;
    category_code?: string;
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
    businessName?: string;
    currency?: string;
}

export function ComplianceHub({
    taxSummary,
    taxTransactions,
    tasks,
    reportPeriod,
    businessId,
    businessName = "Business Entity",
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
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            
            {/* HEADER SECTION */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-wider mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Tax Compliance Management
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Tax & Compliance Hub
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Management portal for <span className="text-blue-600 font-semibold">{businessName}</span>
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-10 flex items-center gap-2 border-slate-200 hover:bg-slate-50 font-bold px-5 rounded-lg shadow-sm">
                                <Settings2 className="w-4 h-4 text-blue-600" />
                                <span className="text-xs uppercase tracking-tight">Tax Settings</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto border-none rounded-xl shadow-2xl p-0">
                            <TaxSettings businessId={businessId} />
                        </DialogContent>
                    </Dialog>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden lg:block" />

                    <RevolutionaryDateRangePicker date={date} setDate={setDate} />
                    
                    <div className="hidden xl:flex items-center gap-2 ml-2">
                        <Badge variant="secondary" className="bg-slate-900 text-white border-none font-mono text-[10px] px-3 py-1.5 rounded-md">
                            <Globe className="w-3 h-3 mr-2 text-blue-400" /> {currency} JURISDICTION
                        </Badge>
                    </div>
                </div>
            </div>

            {/* MAIN DASHBOARD GRID */}
            <div className="grid gap-6 lg:grid-cols-5 items-start">
                {/* Sales Tax Dashboard (Left) */}
                <div className="lg:col-span-3">
                    <RevolutionarySalesTaxDashboard
                        summary={taxSummary}
                        transactions={taxTransactions}
                        reportPeriod={reportPeriod}
                        currency={currency}
                    />
                </div>

                {/* Compliance & Tasks (Right) */}
                <div className="lg:col-span-2">
                    <RevolutionaryComplianceDashboard 
                        tasks={tasks} 
                        businessName={businessName}
                    />
                </div>
            </div>

            {/* SYSTEM STATUS FOOTER */}
            <div className="flex flex-col md:flex-row justify-between items-center px-6 py-4 bg-white border border-slate-200 rounded-xl text-[10px] font-semibold text-slate-400 uppercase tracking-widest shadow-sm">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5"/> 
                        System Status: Verified
                    </span>
                    <span className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-blue-500" /> 
                        Connection: Live Sync Active
                    </span>
                </div>
                <div className="flex items-center gap-4 mt-2 md:mt-0 text-slate-300">
                    <LayoutDashboard size={12} />
                    Protocol Version: 10.2
                </div>
            </div>
        </div>
    );
}