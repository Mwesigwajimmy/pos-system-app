'use client';

import * as React from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
    ShieldAlert, 
    RefreshCw, 
    FileText, 
    Users, 
    CalendarClock, 
    Activity, 
    Loader2,
    Lock,
    Settings
} from "lucide-react";

// --- Types ---
interface SystemStatus {
    last_sync_at: string | null;
    pending_approvals_count: number;
    flagged_transactions_count: number; // AML/Fraud flags
    financial_period_open: boolean;
    current_period: string; // e.g., "JAN-2025"
}

// --- API Interactions (Secure RPCs) ---

// 1. Get System Health/Status
async function fetchSystemStatus(tenantId: string) {
    const db = createClient();
    const { data, error } = await db.rpc('get_sacco_system_status', { p_tenant_id: tenantId });
    if (error) throw error;
    return data as SystemStatus;
}

// 2. Trigger Ledger Sync (Triggers ERP background job)
async function syncLedger(tenantId: string) {
    const db = createClient();
    // RPC ensures we don't sync if a sync is already in progress
    const { error } = await db.rpc('sync_general_ledger_erp', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
}

// 3. Generate Regulatory Report (SASRA/WOCCU Standards)
async function generateRegulatoryReport(tenantId: string) {
    const db = createClient();
    // Returns a job ID or download URL
    const { data, error } = await db.rpc('generate_regulatory_report', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
    return data; 
}

// 4. Run Batch KYC (Sanctions Screening)
async function runBatchKYC(tenantId: string) {
    const db = createClient();
    const { data, error } = await db.rpc('trigger_batch_kyc_check', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
    return data; // Returns count of profiles processed
}

// 5. Year End Close (Irreversible Financial Action)
async function processYearEnd(tenantId: string) {
    const db = createClient();
    // This RPC locks the period, calculates retained earnings, and resets nominal accounts
    const { error } = await db.rpc('process_financial_year_end', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
}

export default function AdminBoard({ tenantId }: { tenantId: string }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
    const [isCloseYearDialogOpen, setIsCloseYearDialogOpen] = useState(false);

    // 1. Live Status Query
    const { data: status, isLoading: statusLoading } = useQuery({
        queryKey: ['admin-status', tenantId],
        queryFn: () => fetchSystemStatus(tenantId),
        refetchInterval: 30000, // Poll every 30s for health checks
        staleTime: 10000
    });

    // 2. Mutations
    const syncMutation = useMutation({
        mutationFn: () => syncLedger(tenantId),
        onSuccess: () => {
            toast.success("Ledger synchronization started.");
            setIsSyncDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin-status', tenantId] });
            // Refresh dashboard analytics to reflect new ledger data
            queryClient.invalidateQueries({ queryKey: ['bi-dashboard', tenantId] });
        },
        onError: (e) => toast.error(`Sync Failed: ${e.message}`)
    });

    const reportMutation = useMutation({
        mutationFn: () => generateRegulatoryReport(tenantId),
        onSuccess: () => toast.success("Regulatory report generated and queued for email delivery."),
        onError: (e) => toast.error(`Report Generation Failed: ${e.message}`)
    });

    const kycMutation = useMutation({
        mutationFn: () => runBatchKYC(tenantId),
        onSuccess: (count) => toast.success(`Batch screening complete. ${count} members reviewed against watchlists.`),
        onError: (e) => toast.error(e.message)
    });

    const yearEndMutation = useMutation({
        mutationFn: () => processYearEnd(tenantId),
        onSuccess: () => {
            toast.success("Financial Year Closed Successfully.");
            setIsCloseYearDialogOpen(false);
            // Critical: Force reload to ensure no stale state remains from previous year
            window.location.reload(); 
        },
        onError: (e) => toast.error(`Critical Error: ${e.message}`)
    });

    return (
        <Card className="border-t-4 border-t-slate-900 shadow-md h-full flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base">
                        <Lock className="w-5 h-5 text-slate-900"/> Admin Controls
                    </span>
                    {/* Visual Indicator for Financial Period Status */}
                    {status && (
                        <span className={`text-[10px] px-2 py-1 rounded-full border font-medium uppercase ${
                            status.financial_period_open 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                            {status.financial_period_open ? `Period Open: ${status.current_period}` : 'Period Closed'}
                        </span>
                    )}
                </CardTitle>
                <CardDescription>Execute system-wide maintenance and compliance tasks.</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 flex-1">
                
                {/* System Health Status Widget */}
                {statusLoading ? (
                    <div className="flex items-center justify-center p-4 bg-slate-50 rounded-lg border border-dashed">
                        <Loader2 className="w-4 h-4 animate-spin mr-2 text-slate-400"/> 
                        <span className="text-xs text-slate-500">Checking system status...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-slate-50 p-3 rounded-lg border">
                        <div className="flex flex-col">
                            <span className="font-semibold text-slate-700">Last ERP Sync</span>
                            <span>{status?.last_sync_at ? format(new Date(status.last_sync_at), 'PP p') : 'Never'}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="font-semibold text-slate-700">Pending Approvals</span>
                            <span className={status?.pending_approvals_count ? "text-amber-600 font-bold" : ""}>
                                {status?.pending_approvals_count ?? 0}
                            </span>
                        </div>
                    </div>
                )}

                {/* Primary Operations List */}
                <div className="grid gap-3">
                    
                    {/* 1. Sync Ledger */}
                    <AlertDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start h-12 hover:bg-slate-50" disabled={syncMutation.isPending}>
                                {syncMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <RefreshCw className="w-4 h-4 mr-2 text-blue-600"/>}
                                <div className="flex flex-col items-start text-left">
                                    <span className="font-semibold text-sm text-slate-900">Sync General Ledger</span>
                                    <span className="text-[10px] text-muted-foreground">Post sub-ledger txns to GL</span>
                                </div>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Synchronization</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will push all pending member transactions to the General Ledger. 
                                    System performance may be impacted for ~30 seconds.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => { e.preventDefault(); syncMutation.mutate(); }}>
                                    Start Sync
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* 2. Regulatory Report */}
                    <Button 
                        variant="outline" 
                        className="w-full justify-start h-12 hover:bg-slate-50" 
                        onClick={() => reportMutation.mutate()}
                        disabled={reportMutation.isPending}
                    >
                        {reportMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <FileText className="w-4 h-4 mr-2 text-indigo-600"/>}
                        <div className="flex flex-col items-start text-left">
                            <span className="font-semibold text-sm text-slate-900">Regulatory Reporting</span>
                            <span className="text-[10px] text-muted-foreground">Generate SASRA/Compliance XML</span>
                        </div>
                    </Button>

                    {/* 3. Batch KYC */}
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start h-10 px-4 border border-dashed border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                        onClick={() => kycMutation.mutate()}
                        disabled={kycMutation.isPending}
                    >
                        <Users className="w-4 h-4 mr-2 text-slate-500"/>
                        <span className="text-sm text-slate-600">Run Batch KYC/AML Check</span>
                    </Button>

                </div>

                {/* Critical Alerts Section */}
                {status && status.flagged_transactions_count > 0 && (
                    <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-bottom-2">
                        <h4 className="text-[10px] font-bold uppercase text-red-600 tracking-wider flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3"/> Compliance Alerts
                        </h4>
                        
                        <div 
                            className="flex items-center justify-between p-2 rounded bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100 transition-colors"
                            onClick={() => router.push('/sacco/audit')}
                        >
                            <div className="flex items-center text-sm text-red-900 font-medium">
                                <Activity className="w-4 h-4 mr-2 text-red-500"/>
                                Suspicious Transactions
                            </div>
                            <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                                {status.flagged_transactions_count}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* Footer: Dangerous Actions */}
            <CardFooter className="pt-4 border-t bg-red-50/20 rounded-b-xl">
                <AlertDialog open={isCloseYearDialogOpen} onOpenChange={setIsCloseYearDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full shadow-sm" disabled={yearEndMutation.isPending}>
                            {yearEndMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CalendarClock className="w-4 h-4 mr-2"/>}
                            Process Year-End Close
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5"/> Warning: Irreversible Action
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-3">
                                <p>You are about to close the financial year <strong>{status?.current_period}</strong>.</p>
                                <div className="bg-red-50 p-3 rounded text-sm text-red-900 border border-red-100">
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Journals will be locked.</li>
                                        <li>Net Profit/Loss will transfer to Retained Earnings.</li>
                                        <li>Income/Expense accounts will reset to zero.</li>
                                    </ul>
                                </div>
                                <p className="font-bold text-sm">Have all adjustments and dividend declarations been posted?</p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={(e) => { e.preventDefault(); yearEndMutation.mutate(); }}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            >
                                Confirm Close Year
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}