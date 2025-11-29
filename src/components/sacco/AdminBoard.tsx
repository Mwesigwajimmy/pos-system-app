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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    Lock
} from "lucide-react";

interface AdminContext {
    tenantId: string;
}

interface SystemStatus {
    last_sync_at: string | null;
    pending_approvals_count: number;
    flagged_transactions_count: number;
    financial_period_open: boolean;
}

// --- API Interactions ---

// 1. Get System Health/Status
async function fetchSystemStatus(tenantId: string) {
    const db = createClient();
    const { data, error } = await db.rpc('get_sacco_system_status', { p_tenant_id: tenantId });
    if (error) throw error;
    return data as SystemStatus;
}

// 2. Trigger Ledger Sync (Usually triggers a background job)
async function syncLedger(tenantId: string) {
    const db = createClient();
    const { error } = await db.rpc('sync_general_ledger_erp', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
}

// 3. Generate Regulatory Report (Heavy operation)
async function generateRegulatoryReport(tenantId: string) {
    const db = createClient();
    const { data, error } = await db.rpc('generate_sasra_regulatory_report', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
    return data; // Returns report ID or URL
}

// 4. Run Batch KYC
async function runBatchKYC(tenantId: string) {
    const db = createClient();
    const { data, error } = await db.rpc('trigger_batch_kyc_check', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
    return data; // Returns count of processed
}

// 5. Year End Close (Dangerous Action)
async function processYearEnd(tenantId: string) {
    const db = createClient();
    const { error } = await db.rpc('process_financial_year_end', { p_tenant_id: tenantId });
    if (error) throw new Error(error.message);
}

export function AdminBoard({ tenantId }: { tenantId: string }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
    const [isCloseYearDialogOpen, setIsCloseYearDialogOpen] = useState(false);

    // Fetch Status
    const { data: status, isLoading: statusLoading } = useQuery({
        queryKey: ['admin-status', tenantId],
        queryFn: () => fetchSystemStatus(tenantId),
        refetchInterval: 30000 // Refresh every 30s
    });

    // Mutations
    const syncMutation = useMutation({
        mutationFn: () => syncLedger(tenantId),
        onSuccess: () => {
            toast.success("Ledger synchronization started successfully.");
            setIsSyncDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin-status', tenantId] });
        },
        onError: (e) => toast.error(`Sync Failed: ${e.message}`)
    });

    const reportMutation = useMutation({
        mutationFn: () => generateRegulatoryReport(tenantId),
        onSuccess: () => toast.success("Regulatory report generated and emailed to admins."),
        onError: (e) => toast.error(`Report Generation Failed: ${e.message}`)
    });

    const kycMutation = useMutation({
        mutationFn: () => runBatchKYC(tenantId),
        onSuccess: (count) => toast.success(`Batch check complete. ${count} profiles reviewed.`),
        onError: (e) => toast.error(e.message)
    });

    const yearEndMutation = useMutation({
        mutationFn: () => processYearEnd(tenantId),
        onSuccess: () => {
            toast.success("Financial Year Closed Successfully.");
            setIsCloseYearDialogOpen(false);
            window.location.reload(); // Force reload to reflect new period
        },
        onError: (e) => toast.error(`Critical Error: ${e.message}`)
    });

    return (
        <Card className="border-t-4 border-t-slate-900 shadow-md h-full flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-slate-900"/> Admin Control Board
                    </span>
                    {status?.financial_period_open && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full border border-green-200">
                            Period Open
                        </span>
                    )}
                </CardTitle>
                <CardDescription>Execute system-wide operations and compliance tasks.</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 flex-1">
                
                {/* System Health Status */}
                {statusLoading ? (
                    <div className="flex items-center justify-center p-4 bg-slate-50 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin mr-2"/> Checking system status...
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

                {/* Primary Actions */}
                <div className="grid gap-3">
                    
                    {/* Sync Ledger */}
                    <AlertDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start h-12" disabled={syncMutation.isPending}>
                                {syncMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <RefreshCw className="w-4 h-4 mr-2 text-blue-600"/>}
                                <div className="flex flex-col items-start">
                                    <span className="font-semibold text-sm">Sync with General Ledger</span>
                                    <span className="text-[10px] text-muted-foreground">Update balances & trial balance</span>
                                </div>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Synchronization</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will push all pending sub-ledger transactions to the General Ledger. The system may be slow during this process.
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

                    {/* Regulatory Report */}
                    <Button 
                        variant="outline" 
                        className="w-full justify-start h-12" 
                        onClick={() => reportMutation.mutate()}
                        disabled={reportMutation.isPending}
                    >
                        {reportMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <FileText className="w-4 h-4 mr-2 text-indigo-600"/>}
                        <div className="flex flex-col items-start">
                            <span className="font-semibold text-sm">Run Regulatory Report</span>
                            <span className="text-[10px] text-muted-foreground">Generate SASRA/Compliance XML</span>
                        </div>
                    </Button>

                    {/* Batch KYC */}
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start h-10 px-4 border border-transparent hover:bg-slate-100"
                        onClick={() => kycMutation.mutate()}
                        disabled={kycMutation.isPending}
                    >
                        <Users className="w-4 h-4 mr-2 text-slate-500"/>
                        Run Bulk KYC/AML Check
                    </Button>

                </div>

                {/* Critical Alerts / Shortcuts */}
                <div className="space-y-2 mt-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Attention Required</h4>
                    
                    <div 
                        className="flex items-center justify-between p-2 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                        onClick={() => router.push('/sacco/compliance')}
                    >
                        <div className="flex items-center text-sm">
                            <Activity className="w-4 h-4 mr-2 text-red-500"/>
                            Suspicious Transactions
                        </div>
                        {status && status.flagged_transactions_count > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {status.flagged_transactions_count}
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2 border-t bg-red-50/30">
                <AlertDialog open={isCloseYearDialogOpen} onOpenChange={setIsCloseYearDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full" disabled={yearEndMutation.isPending}>
                            {yearEndMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CalendarClock className="w-4 h-4 mr-2"/>}
                            Process Year-End Close
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5"/> Warning: Irreversible Action
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                                <p>You are about to close the current financial year. This action will:</p>
                                <ul className="list-disc pl-5 text-sm">
                                    <li>Lock all journals for the current period.</li>
                                    <li>Transfer Net Profit/Loss to Retained Earnings.</li>
                                    <li>Reset temporary accounts for the new year.</li>
                                </ul>
                                <p className="font-bold mt-2">Ensure all adjustments and dividends are posted before proceeding.</p>
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