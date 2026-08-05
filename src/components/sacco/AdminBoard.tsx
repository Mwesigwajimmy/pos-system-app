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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
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
    ClipboardCheck
} from "lucide-react";

// --- Types ---
interface SystemStatus {
    last_sync_at: string | null;
    pending_approvals_count: number;
    pending_ledger_transactions_count?: number;
    flagged_transactions_count: number; // AML/Fraud flags
    financial_period_open: boolean;
    current_period: string; // e.g., "JAN-2025"
    compliance_contact_email?: string;
}

// --- API Interactions (Secure RPCs — unchanged; only new optional params appended) ---

// 1. Get System Health/Status
async function fetchSystemStatus(tenantId: string) {
    const db = createClient();
    const { data, error } = await db.rpc('get_sacco_system_status', { p_tenant_id: tenantId });
    if (error) throw error;
    return data as SystemStatus;
}

// 2. Trigger Ledger Sync (Triggers ERP background job)
async function syncLedger(tenantId: string, options: { scope: string }) {
    const db = createClient();
    // RPC ensures we don't sync if a sync is already in progress
    const { error } = await db.rpc('sync_general_ledger_erp', {
        p_tenant_id: tenantId,
        p_sync_scope: options.scope
    });
    if (error) throw new Error(error.message);
}

// 3. Generate Regulatory Report (SASRA/WOCCU Standards)
async function generateRegulatoryReport(tenantId: string, options: {
    periodStart: string;
    periodEnd: string;
    standard: string;
    outputFormat: string;
    includeComparative: boolean;
    deliveryEmail: string;
    ccEmails?: string;
}) {
    const db = createClient();
    // Returns a job ID or download URL
    const { data, error } = await db.rpc('generate_regulatory_report', {
        p_tenant_id: tenantId,
        p_period_start: options.periodStart,
        p_period_end: options.periodEnd,
        p_standard: options.standard,
        p_output_format: options.outputFormat,
        p_include_comparative: options.includeComparative,
        p_delivery_email: options.deliveryEmail,
        p_cc_emails: options.ccEmails || null
    });
    if (error) throw new Error(error.message);
    return data;
}

// 4. Run Batch KYC (Sanctions Screening)
async function runBatchKYC(tenantId: string, options: {
    scope: string;
    watchlist: string;
    rescreenCleared: boolean;
    notifyOnComplete: boolean;
}) {
    const db = createClient();
    const { data, error } = await db.rpc('trigger_batch_kyc_check', {
        p_tenant_id: tenantId,
        p_scope: options.scope,
        p_watchlist_source: options.watchlist,
        p_rescreen_cleared: options.rescreenCleared,
        p_notify_on_complete: options.notifyOnComplete
    });
    if (error) throw new Error(error.message);
    return data; // Returns count of profiles processed
}

// 5. Year End Close (Irreversible Financial Action)
async function processYearEnd(tenantId: string, options: {
    closingDate: string;
    notes: string;
    approvalReference: string;
}) {
    const db = createClient();
    // This RPC locks the period, calculates retained earnings, and resets nominal accounts
    const { error } = await db.rpc('process_financial_year_end', {
        p_tenant_id: tenantId,
        p_closing_date: options.closingDate,
        p_notes: options.notes,
        p_approval_reference: options.approvalReference
    });
    if (error) throw new Error(error.message);
}

export default function AdminBoard({ tenantId }: { tenantId: string }) {
    const queryClient = useQueryClient();
    const router = useRouter();

    // --- Dialog open state ---
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [isKycDialogOpen, setIsKycDialogOpen] = useState(false);
    const [isCloseYearDialogOpen, setIsCloseYearDialogOpen] = useState(false);

    // --- Form state: Sync Ledger ---
    const [syncScope, setSyncScope] = useState("incremental");
    const [syncConfirmReviewed, setSyncConfirmReviewed] = useState(false);

    // --- Form state: Regulatory Report ---
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const [reportPeriodStart, setReportPeriodStart] = useState(todayStr);
    const [reportPeriodEnd, setReportPeriodEnd] = useState(todayStr);
    const [reportStandard, setReportStandard] = useState("sasra");
    const [reportFormat, setReportFormat] = useState("pdf");
    const [reportIncludeComparative, setReportIncludeComparative] = useState(true);
    const [reportDeliveryEmail, setReportDeliveryEmail] = useState("");
    const [reportCcEmails, setReportCcEmails] = useState("");

    // --- Form state: Batch KYC ---
    const [kycScope, setKycScope] = useState("new");
    const [kycWatchlist, setKycWatchlist] = useState("all");
    const [kycRescreenCleared, setKycRescreenCleared] = useState(false);
    const [kycNotifyOnComplete, setKycNotifyOnComplete] = useState(true);

    // --- Form state: Year-End Close ---
    const [closingDate, setClosingDate] = useState(todayStr);
    const [adjustmentsPosted, setAdjustmentsPosted] = useState(false);
    const [dividendsPosted, setDividendsPosted] = useState(false);
    const [reconciliationsComplete, setReconciliationsComplete] = useState(false);
    const [approvalReference, setApprovalReference] = useState("");
    const [yearEndNotes, setYearEndNotes] = useState("");
    const [yearEndConfirmText, setYearEndConfirmText] = useState("");

    // 1. Live Status Query
    const { data: status, isLoading: statusLoading } = useQuery({
        queryKey: ['admin-status', tenantId],
        queryFn: () => fetchSystemStatus(tenantId),
        refetchInterval: 30000, // Poll every 30s for health checks
        staleTime: 10000
    });

    // Prefill delivery email from status once it's available
    React.useEffect(() => {
        if (status?.compliance_contact_email && !reportDeliveryEmail) {
            setReportDeliveryEmail(status.compliance_contact_email);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status?.compliance_contact_email]);

    // 2. Mutations
    const syncMutation = useMutation({
        mutationFn: () => syncLedger(tenantId, { scope: syncScope }),
        onSuccess: () => {
            toast.success("Ledger synchronization started.");
            setIsSyncDialogOpen(false);
            setSyncConfirmReviewed(false);
            queryClient.invalidateQueries({ queryKey: ['admin-status', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['bi-dashboard', tenantId] });
        },
        onError: (e) => toast.error(`Sync Failed: ${e.message}`)
    });

    const reportMutation = useMutation({
        mutationFn: () => generateRegulatoryReport(tenantId, {
            periodStart: reportPeriodStart,
            periodEnd: reportPeriodEnd,
            standard: reportStandard,
            outputFormat: reportFormat,
            includeComparative: reportIncludeComparative,
            deliveryEmail: reportDeliveryEmail,
            ccEmails: reportCcEmails
        }),
        onSuccess: () => {
            toast.success("Regulatory report generated and queued for email delivery.");
            setIsReportDialogOpen(false);
        },
        onError: (e) => toast.error(`Report Generation Failed: ${e.message}`)
    });

    const kycMutation = useMutation({
        mutationFn: () => runBatchKYC(tenantId, {
            scope: kycScope,
            watchlist: kycWatchlist,
            rescreenCleared: kycRescreenCleared,
            notifyOnComplete: kycNotifyOnComplete
        }),
        onSuccess: (count) => {
            toast.success(`Batch screening complete. ${count} members reviewed against watchlists.`);
            setIsKycDialogOpen(false);
        },
        onError: (e) => toast.error(e.message)
    });

    const yearEndMutation = useMutation({
        mutationFn: () => processYearEnd(tenantId, {
            closingDate,
            notes: yearEndNotes,
            approvalReference
        }),
        onSuccess: () => {
            toast.success("Financial Year Closed Successfully.");
            setIsCloseYearDialogOpen(false);
            // Critical: Force reload to ensure no stale state remains from previous year
            window.location.reload();
        },
        onError: (e) => toast.error(`Critical Error: ${e.message}`)
    });

    const yearEndChecklistComplete = adjustmentsPosted && dividendsPosted && reconciliationsComplete;
    const yearEndConfirmValid = yearEndConfirmText.trim().toUpperCase() === "CLOSE YEAR";
    const canCloseYear =
        yearEndChecklistComplete &&
        yearEndConfirmValid &&
        approvalReference.trim().length > 0 &&
        !yearEndMutation.isPending;

    return (
        <Card className="flex h-full flex-col border-t-4 border-t-slate-900 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span className="flex items-center gap-2">
                        <Lock className="h-4.5 w-4.5 text-slate-900" /> Admin Controls
                    </span>
                    {status && (
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase leading-none ${
                            status.financial_period_open
                                ? 'border-green-200 bg-green-100 text-green-700'
                                : 'border-red-200 bg-red-100 text-red-700'
                        }`}>
                            {status.financial_period_open ? `Period Open · ${status.current_period}` : 'Period Closed'}
                        </span>
                    )}
                </CardTitle>
                <CardDescription className="text-xs">
                    Execute system-wide maintenance and compliance tasks.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 pt-0">

                {/* System Health Status Widget */}
                {statusLoading ? (
                    <div className="flex items-center justify-center rounded-lg border border-dashed p-3 bg-slate-50">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-500">Checking system status…</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-slate-50 p-3 text-xs text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-700">Last ERP Sync</span>
                            <span>{status?.last_sync_at ? format(new Date(status.last_sync_at), 'PP p') : 'Never'}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-700">Pending Approvals</span>
                            <span className={status?.pending_approvals_count ? "font-bold text-amber-600" : ""}>
                                {status?.pending_approvals_count ?? 0}
                            </span>
                        </div>
                    </div>
                )}

                {/* Primary Operations List */}
                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Operations
                    </h4>

                    <div className="grid gap-2">

                        {/* 1. Sync Ledger */}
                        <AlertDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="h-12 w-full justify-start hover:bg-slate-50" disabled={syncMutation.isPending}>
                                    {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4 shrink-0 text-blue-600" />}
                                    <span className="flex min-w-0 flex-col items-start text-left">
                                        <span className="text-sm font-semibold text-slate-900">Sync General Ledger</span>
                                        <span className="text-[10px] text-muted-foreground">Post sub-ledger txns to GL</span>
                                    </span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Synchronization</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will push pending member transactions to the General Ledger.
                                        System performance may be impacted for ~30 seconds.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>

                                <div className="space-y-4 py-2">
                                    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-slate-50 p-3 text-xs">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold text-slate-700">Last Sync</span>
                                            <span className="text-slate-600">
                                                {status?.last_sync_at ? format(new Date(status.last_sync_at), 'PP p') : 'Never'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold text-slate-700">Pending Transactions</span>
                                            <span className="text-slate-600">
                                                {status?.pending_ledger_transactions_count ?? '—'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="sync-scope">Sync Scope</Label>
                                        <Select value={syncScope} onValueChange={setSyncScope}>
                                            <SelectTrigger id="sync-scope">
                                                <SelectValue placeholder="Select scope" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="incremental">Incremental (since last sync)</SelectItem>
                                                <SelectItem value="full">Full Resync</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            id="sync-confirm"
                                            checked={syncConfirmReviewed}
                                            onCheckedChange={(v) => setSyncConfirmReviewed(v === true)}
                                        />
                                        <Label htmlFor="sync-confirm" className="text-sm font-normal leading-snug">
                                            I confirm pending approvals have been reviewed before posting to the GL.
                                        </Label>
                                    </div>
                                </div>

                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setSyncConfirmReviewed(false)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={!syncConfirmReviewed || syncMutation.isPending}
                                        onClick={(e) => { e.preventDefault(); syncMutation.mutate(); }}
                                    >
                                        Start Sync
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {/* 2. Regulatory Report */}
                        <AlertDialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="h-12 w-full justify-start hover:bg-slate-50" disabled={reportMutation.isPending}>
                                    {reportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <FileText className="mr-2 h-4 w-4 shrink-0 text-indigo-600" />}
                                    <span className="flex min-w-0 flex-col items-start text-left">
                                        <span className="text-sm font-semibold text-slate-900">Regulatory Reporting</span>
                                        <span className="text-[10px] text-muted-foreground">Generate SASRA/WOCCU compliance report</span>
                                    </span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Generate Regulatory Report</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Select the reporting period and standard. The report will be generated and emailed to the address below.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>

                                <div className="space-y-4 py-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="report-start">Period Start</Label>
                                            <Input
                                                id="report-start"
                                                type="date"
                                                value={reportPeriodStart}
                                                onChange={(e) => setReportPeriodStart(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="report-end">Period End</Label>
                                            <Input
                                                id="report-end"
                                                type="date"
                                                value={reportPeriodEnd}
                                                onChange={(e) => setReportPeriodEnd(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="report-standard">Reporting Standard</Label>
                                            <Select value={reportStandard} onValueChange={setReportStandard}>
                                                <SelectTrigger id="report-standard">
                                                    <SelectValue placeholder="Select standard" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sasra">SASRA</SelectItem>
                                                    <SelectItem value="woccu">WOCCU</SelectItem>
                                                    <SelectItem value="both">SASRA & WOCCU</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="report-format">Output Format</Label>
                                            <Select value={reportFormat} onValueChange={setReportFormat}>
                                                <SelectTrigger id="report-format">
                                                    <SelectValue placeholder="Select format" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pdf">PDF</SelectItem>
                                                    <SelectItem value="xml">XML</SelectItem>
                                                    <SelectItem value="both">PDF & XML</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="report-email">Delivery Email</Label>
                                        <Input
                                            id="report-email"
                                            type="email"
                                            placeholder="compliance@yoursacco.co.ug"
                                            value={reportDeliveryEmail}
                                            onChange={(e) => setReportDeliveryEmail(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="report-cc">CC Recipients (optional)</Label>
                                        <Input
                                            id="report-cc"
                                            type="text"
                                            placeholder="board@yoursacco.co.ug, treasurer@yoursacco.co.ug"
                                            value={reportCcEmails}
                                            onChange={(e) => setReportCcEmails(e.target.value)}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Separate multiple addresses with commas.</p>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            id="report-comparative"
                                            checked={reportIncludeComparative}
                                            onCheckedChange={(v) => setReportIncludeComparative(v === true)}
                                        />
                                        <Label htmlFor="report-comparative" className="text-sm font-normal leading-snug">
                                            Include comparative figures from the prior period.
                                        </Label>
                                    </div>
                                </div>

                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={!reportDeliveryEmail || !reportPeriodStart || !reportPeriodEnd || reportMutation.isPending}
                                        onClick={(e) => { e.preventDefault(); reportMutation.mutate(); }}
                                    >
                                        Generate Report
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {/* 3. Batch KYC */}
                        <AlertDialog open={isKycDialogOpen} onOpenChange={setIsKycDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="h-12 w-full justify-start hover:bg-slate-50" disabled={kycMutation.isPending}>
                                    {kycMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Users className="mr-2 h-4 w-4 shrink-0 text-slate-500" />}
                                    <span className="flex min-w-0 flex-col items-start text-left">
                                        <span className="text-sm font-semibold text-slate-900">Run Batch KYC/AML Check</span>
                                        <span className="text-[10px] text-muted-foreground">Screen members against sanctions watchlists</span>
                                    </span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Run Batch KYC / AML Screening</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Choose which members to screen and against which watchlist source.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>

                                <div className="space-y-4 py-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="kyc-scope">Screening Scope</Label>
                                        <Select value={kycScope} onValueChange={setKycScope}>
                                            <SelectTrigger id="kyc-scope">
                                                <SelectValue placeholder="Select scope" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="new">New Members Only</SelectItem>
                                                <SelectItem value="flagged">Previously Flagged Members</SelectItem>
                                                <SelectItem value="all">All Members</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="kyc-watchlist">Watchlist Source</Label>
                                        <Select value={kycWatchlist} onValueChange={setKycWatchlist}>
                                            <SelectTrigger id="kyc-watchlist">
                                                <SelectValue placeholder="Select watchlist" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ofac">OFAC Sanctions List</SelectItem>
                                                <SelectItem value="un">UN Consolidated List</SelectItem>
                                                <SelectItem value="local">Local Regulator List</SelectItem>
                                                <SelectItem value="all">All Sources</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            id="kyc-rescreen"
                                            checked={kycRescreenCleared}
                                            onCheckedChange={(v) => setKycRescreenCleared(v === true)}
                                        />
                                        <Label htmlFor="kyc-rescreen" className="text-sm font-normal leading-snug">
                                            Re-screen members already cleared in a previous run.
                                        </Label>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            id="kyc-notify"
                                            checked={kycNotifyOnComplete}
                                            onCheckedChange={(v) => setKycNotifyOnComplete(v === true)}
                                        />
                                        <Label htmlFor="kyc-notify" className="text-sm font-normal leading-snug">
                                            Notify the Compliance Officer by email when screening completes.
                                        </Label>
                                    </div>
                                </div>

                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={kycMutation.isPending}
                                        onClick={(e) => { e.preventDefault(); kycMutation.mutate(); }}
                                    >
                                        Run Screening
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Critical Alerts Section */}
                {status && status.flagged_transactions_count > 0 && (
                    <div className="space-y-2">
                        <h4 className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
                            <ShieldAlert className="h-3 w-3" /> Compliance Alerts
                        </h4>

                        <div
                            className="flex cursor-pointer items-center justify-between rounded border border-red-100 bg-red-50 p-2.5 transition-colors hover:bg-red-100"
                            onClick={() => router.push('/sacco/audit')}
                        >
                            <span className="flex items-center text-sm font-medium text-red-900">
                                <Activity className="mr-2 h-4 w-4 text-red-500" />
                                Suspicious Transactions
                            </span>
                            <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold text-red-800 shadow-sm">
                                {status.flagged_transactions_count}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* Footer: Dangerous Actions */}
            <CardFooter className="rounded-b-xl border-t bg-red-50/20 pt-3">
                <AlertDialog open={isCloseYearDialogOpen} onOpenChange={setIsCloseYearDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full shadow-sm" disabled={yearEndMutation.isPending}>
                            {yearEndMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
                            Process Year-End Close
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                <ShieldAlert className="h-5 w-5" /> Warning: Irreversible Action
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-3">
                                    <p>
                                        You are about to close the financial year{" "}
                                        <strong className="text-slate-900">{status?.current_period}</strong>.
                                    </p>
                                    <ul className="list-disc space-y-1 rounded border border-red-100 bg-red-50 p-3 pl-5 text-sm text-red-900">
                                        <li>Journals will be locked.</li>
                                        <li>Net Profit/Loss will transfer to Retained Earnings.</li>
                                        <li>Income/Expense accounts will reset to zero.</li>
                                    </ul>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="space-y-4 py-1">
                            <div className="space-y-1.5">
                                <Label htmlFor="closing-date">Closing Date</Label>
                                <Input
                                    id="closing-date"
                                    type="date"
                                    value={closingDate}
                                    onChange={(e) => setClosingDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="approval-reference" className="flex items-center gap-1.5">
                                    <ClipboardCheck className="h-3.5 w-3.5 text-slate-500" />
                                    Board Approval / Resolution Reference
                                </Label>
                                <Input
                                    id="approval-reference"
                                    placeholder="e.g., BR-2026-014"
                                    value={approvalReference}
                                    onChange={(e) => setApprovalReference(e.target.value)}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Required for the audit trail — enter the board resolution or minute reference authorizing this close.
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-2.5">
                                <p className="text-sm font-semibold text-slate-900">Pre-close checklist</p>

                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="yec-adjustments"
                                        checked={adjustmentsPosted}
                                        onCheckedChange={(v) => setAdjustmentsPosted(v === true)}
                                    />
                                    <Label htmlFor="yec-adjustments" className="text-sm font-normal leading-snug">
                                        All adjusting journal entries have been posted.
                                    </Label>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="yec-dividends"
                                        checked={dividendsPosted}
                                        onCheckedChange={(v) => setDividendsPosted(v === true)}
                                    />
                                    <Label htmlFor="yec-dividends" className="text-sm font-normal leading-snug">
                                        Dividend declarations have been posted.
                                    </Label>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="yec-reconciliations"
                                        checked={reconciliationsComplete}
                                        onCheckedChange={(v) => setReconciliationsComplete(v === true)}
                                    />
                                    <Label htmlFor="yec-reconciliations" className="text-sm font-normal leading-snug">
                                        All bank reconciliations for the period are complete.
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="yec-notes">Notes (optional)</Label>
                                <Textarea
                                    id="yec-notes"
                                    placeholder="Any context worth recording for the audit trail..."
                                    value={yearEndNotes}
                                    onChange={(e) => setYearEndNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="yec-confirm">
                                    Type <strong>CLOSE YEAR</strong> to confirm
                                </Label>
                                <Input
                                    id="yec-confirm"
                                    placeholder="CLOSE YEAR"
                                    value={yearEndConfirmText}
                                    onChange={(e) => setYearEndConfirmText(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel
                                onClick={() => {
                                    setYearEndConfirmText("");
                                }}
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => { e.preventDefault(); yearEndMutation.mutate(); }}
                                disabled={!canCloseYear}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50"
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