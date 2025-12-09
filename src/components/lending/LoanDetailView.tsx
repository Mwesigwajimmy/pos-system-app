'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, CheckCircle2, Banknote, FileText, ShieldCheck, 
  History, AlertTriangle, Download, XCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
// Ensure this dialog is also enterprise-grade (separate file)
import RecordPaymentDialog from './RecordPaymentDialog'; 

// --- Enterprise Types ---

type LoanStatus = 'Pending' | 'Review' | 'Approved' | 'Active' | 'Defaulted' | 'Completed' | 'Rejected';

interface LoanDetails {
    application: { 
        id: number; 
        application_no: string; 
        status: LoanStatus; 
        principal_amount: number; 
        approval_date: string | null;
        disbursement_date: string | null;
    };
    borrower: { 
        id: string;
        full_name: string; 
        email: string;
        phone_number: string;
    };
    product: { 
        name: string; 
        interest_rate: number;
        interest_type: 'Flat' | 'Reducing';
    };
    balance_due: number; // Calculated from ledger view
}

interface RepaymentSchedule {
    id: number;
    payment_number: number;
    due_date: string;
    total_due: number;
    principal_component: number;
    interest_component: number;
    status: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
}

interface PaymentTransaction {
    id: string;
    transaction_ref: string;
    payment_date: string;
    amount: number;
    method: string;
    recorded_by: string;
}

interface Collateral {
    id: string;
    type: string;
    description: string;
    valuation: number;
    status: 'Pledged' | 'Released' | 'Seized';
}

// --- Fetchers ---

async function fetchLoanDetails(applicationId: number) {
    const supabase = createClient();
    
    // Complex query joining multiple tables/views
    // Note: Relations (borrower, product) often return as arrays from Supabase/PostgREST
    const { data, error } = await supabase
        .from('loan_applications')
        .select(`
            id, application_no, status, principal_amount, approval_date, disbursement_date,
            borrower:profiles!inner(id, full_name, email, phone_number),
            product:loan_products(name, interest_rate, interest_type),
            balance:loan_balances(current_balance)
        `)
        .eq('id', applicationId)
        .single();

    if (error) throw new Error(error.message);

    // FIX: Unwrap arrays if Supabase returns relations as arrays
    // We check if it is an array and take the first item, otherwise use it as is.
    const borrowerData = Array.isArray(data.borrower) ? data.borrower[0] : data.borrower;
    const productData = Array.isArray(data.product) ? data.product[0] : data.product;

    return {
        application: {
            id: data.id,
            application_no: data.application_no,
            status: data.status,
            principal_amount: data.principal_amount,
            approval_date: data.approval_date,
            disbursement_date: data.disbursement_date
        },
        borrower: borrowerData,
        product: productData,
        balance_due: data.balance?.[0]?.current_balance || 0
    } as LoanDetails;
}

async function fetchRepaymentSchedule(applicationId: number) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('repayment_schedules')
        .select('*')
        .eq('loan_application_id', applicationId)
        .order('payment_number', { ascending: true });
        
    if (error) throw new Error(error.message);
    return data as RepaymentSchedule[];
}

async function fetchPaymentHistory(applicationId: number) {
     const supabase = createClient();
     const { data, error } = await supabase
        .from('loan_payments')
        .select('*')
        .eq('loan_application_id', applicationId)
        .order('payment_date', { ascending: false });
        
     if(error) throw error;
     return data as PaymentTransaction[];
}

async function fetchCollateral(applicationId: number) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('loan_collateral')
        .select('*')
        .eq('loan_application_id', applicationId);

    if (error) throw error;
    return data as Collateral[];
}

// --- Mutators (RPCs for Transaction Safety) ---

async function updateLoanStatus({ id, status, notes }: { id: number, status: string, notes?: string }) {
    const supabase = createClient();
    // RPC handles audit logging and timestamping on the server
    const { error } = await supabase.rpc('update_loan_status', { 
        p_loan_id: id, 
        p_status: status,
        p_notes: notes 
    });
    if (error) throw new Error(error.message);
}

async function disburseLoan(id: number) {
    const supabase = createClient();
    // Disbursement is complex: Creates ledger entries, schedule, and triggers money movement
    const { error } = await supabase.rpc('process_loan_disbursement', { p_loan_id: id });
    if (error) throw new Error(error.message);
}

// --- Component ---

export default function LoanDetailView({ applicationId }: { applicationId: number }) {
    const queryClient = useQueryClient();

    // 1. Parallel Data Fetching
    const { data: details, isLoading } = useQuery({ 
        queryKey: ['loanDetails', applicationId], 
        queryFn: () => fetchLoanDetails(applicationId) 
    });

    const { data: schedule, isLoading: loadingSchedule } = useQuery({
        queryKey: ['repaymentSchedule', applicationId],
        queryFn: () => fetchRepaymentSchedule(applicationId),
        enabled: !!details && ['Active', 'Completed', 'Defaulted'].includes(details.application.status),
    });

    const { data: payments } = useQuery({
        queryKey: ['paymentHistory', applicationId],
        queryFn: () => fetchPaymentHistory(applicationId),
        enabled: !!details && ['Active', 'Completed', 'Defaulted'].includes(details.application.status),
    });

    const { data: collateral } = useQuery({
        queryKey: ['collateral', applicationId],
        queryFn: () => fetchCollateral(applicationId),
        enabled: !!details
    });

    // 2. Mutations
    const statusMutation = useMutation({
        mutationFn: updateLoanStatus,
        onSuccess: () => { 
            toast.success("Loan status updated successfully"); 
            queryClient.invalidateQueries({ queryKey: ['loanDetails', applicationId] }); 
        },
        onError: (e: Error) => toast.error(`Failed: ${e.message}`),
    });

    const disburseMutation = useMutation({
        mutationFn: disburseLoan,
        onSuccess: () => { 
            toast.success("Funds disbursed & Schedule generated"); 
            queryClient.invalidateQueries({ queryKey: ['loanDetails', applicationId] });
            queryClient.invalidateQueries({ queryKey: ['repaymentSchedule', applicationId] });
        },
        onError: (e: Error) => toast.error(`Disbursement Failed: ${e.message}`),
    });

    // 3. Status Badge Helper
    const getStatusVariant = (status: LoanStatus) => {
        switch (status) {
            case 'Active': return 'default'; // primary
            case 'Approved': return 'outline'; // green-ish usually via className
            case 'Pending': return 'secondary';
            case 'Rejected': return 'destructive';
            case 'Defaulted': return 'destructive';
            case 'Completed': return 'default'; // generic
            default: return 'outline';
        }
    };

    if (isLoading) return <div className="h-96 w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!details) return <div className="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded-lg">Loan application not found or access denied.</div>;

    const { application, borrower, product, balance_due } = details;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Loan #{application.application_no}</h1>
                        <Badge variant={getStatusVariant(application.status)} className="text-sm px-3 capitalize">
                            {application.status}
                        </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> {borrower.full_name}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{product.name} ({product.interest_type})</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Applied: {application.approval_date ? formatDate(application.approval_date) : 'Pending Review'}</span>
                    </div>
                </div>
                
                {/* Workflow Actions */}
                <div className="flex flex-wrap gap-2">
                    {application.status === 'Pending' && (
                        <>
                            <Button 
                                variant="outline" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => statusMutation.mutate({ id: application.id, status: 'Rejected' })}
                                disabled={statusMutation.isPending}
                            >
                                <XCircle className="mr-2 h-4 w-4"/> Reject
                            </Button>
                            <Button 
                                onClick={() => statusMutation.mutate({ id: application.id, status: 'Approved' })} 
                                disabled={statusMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4"/> Approve
                            </Button>
                        </>
                    )}
                    
                    {application.status === 'Approved' && (
                        <Button onClick={() => disburseMutation.mutate(application.id)} disabled={disburseMutation.isPending}>
                            {disburseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Banknote className="mr-2 h-4 w-4"/>}
                            Disburse Funds
                        </Button>
                    )}
                    
                    {['Active', 'Defaulted'].includes(application.status) && (
                        <RecordPaymentDialog applicationId={application.id} balance={balance_due} />
                    )}
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Principal Amount</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold">{formatCurrency(application.principal_amount)}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Interest Rate</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold">{product.interest_rate}% <span className="text-xs font-normal text-muted-foreground">p.a.</span></CardContent>
                </Card>
                <Card className={balance_due > 0 ? "bg-amber-50/50 border-amber-200" : "bg-green-50/50 border-green-200"}>
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Outstanding Balance</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold text-slate-900">{formatCurrency(balance_due)}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Next Payment</CardTitle></CardHeader>
                    <CardContent className="text-lg font-semibold flex items-center gap-2">
                        {/* Logic to find next payment from schedule */}
                        {schedule?.find(s => s.status === 'Pending')?.due_date 
                            ? formatDate(schedule.find(s => s.status === 'Pending')!.due_date)
                            : <span className="text-muted-foreground text-sm font-normal">N/A</span>
                        }
                    </CardContent>
                </Card>
            </div>
            
            {/* Detailed Tabs */}
            <Tabs defaultValue="schedule" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                    <TabsTrigger value="schedule" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                        <History className="w-4 h-4 mr-2"/> Repayment Schedule
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                        <Banknote className="w-4 h-4 mr-2"/> Transactions
                    </TabsTrigger>
                    <TabsTrigger value="collateral" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                        <ShieldCheck className="w-4 h-4 mr-2"/> Collateral
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                        <FileText className="w-4 h-4 mr-2"/> Documents
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Schedule */}
                <TabsContent value="schedule" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Amortization Schedule</CardTitle><CardDescription>Projected repayment plan generated at disbursement.</CardDescription></CardHeader>
                        <CardContent className="p-0">
                            {['Pending', 'Approved', 'Rejected'].includes(application.status) ? (
                                <div className="p-8 text-center text-muted-foreground bg-slate-50">Schedule is generated upon disbursement.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">#</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead className="text-right">Total Due</TableHead>
                                            <TableHead className="text-right">Principal</TableHead>
                                            <TableHead className="text-right">Interest</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingSchedule ? <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow> :
                                            schedule?.map((row) => (
                                                <TableRow key={row.id} className={row.status === 'Overdue' ? 'bg-red-50' : ''}>
                                                    <TableCell>{row.payment_number}</TableCell>
                                                    <TableCell className="font-medium">{formatDate(row.due_date)}</TableCell>
                                                    <TableCell className="text-right font-bold">{formatCurrency(row.total_due)}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.principal_component)}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.interest_component)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={row.status === 'Paid' ? 'default' : row.status === 'Overdue' ? 'destructive' : 'outline'}>
                                                            {row.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Payments */}
                <TabsContent value="payments" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments?.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No payments received yet.</TableCell></TableRow>
                                    ) : (
                                        payments?.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-mono text-xs">{p.transaction_ref}</TableCell>
                                                <TableCell>{formatDate(p.payment_date)}</TableCell>
                                                <TableCell>{p.method}</TableCell>
                                                <TableCell className="text-right font-medium text-green-600">+{formatCurrency(p.amount)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Collateral */}
                <TabsContent value="collateral" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Pledged Assets</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {collateral?.map((c) => (
                                    <div key={c.id} className="flex items-start justify-between p-4 border rounded-lg bg-slate-50">
                                        <div>
                                            <p className="font-semibold">{c.type}</p>
                                            <p className="text-sm text-muted-foreground">{c.description}</p>
                                            <Badge variant="outline" className="mt-2">{c.status}</Badge>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Valuation</p>
                                            <p className="font-bold">{formatCurrency(c.valuation)}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!collateral || collateral.length === 0) && (
                                    <div className="col-span-2 text-center py-8 text-muted-foreground flex flex-col items-center">
                                        <AlertTriangle className="h-8 w-8 mb-2 opacity-50"/>
                                        <p>No collateral recorded for this loan.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Documents */}
                <TabsContent value="documents" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Loan Documentation</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {/* Placeholder for Document List */}
                                <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-blue-600"/>
                                        <span>Loan_Agreement_Signed.pdf</span>
                                    </div>
                                    <Button variant="ghost" size="sm"><Download className="h-4 w-4"/></Button>
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-blue-600"/>
                                        <span>KYC_Verification_Report.pdf</span>
                                    </div>
                                    <Button variant="ghost" size="sm"><Download className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}