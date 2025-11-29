'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, Banknote } from 'lucide-react';
import RecordPaymentDialog from './RecordPaymentDialog';
import { formatCurrency, formatDate } from '@/lib/utils';

// Types
interface LoanDetails {
    application: { id: number; status: string; principal_amount: number; approval_date: string };
    customer: { name: string; email: string };
    product: { interest_rate: number; name: string };
    balance_due: number;
}

interface RepaymentSchedule {
    payment_number: number;
    due_date: string;
    monthly_payment: number;
    principal: number;
    interest: number;
    remaining_balance: number;
}

interface PaymentHistory {
    id: string;
    payment_date: string;
    amount_paid: number;
}

// Fetchers
async function fetchLoanDetails(applicationId: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_loan_application_details', { p_application_id: applicationId });
    if (error) throw new Error(error.message);
    return data as LoanDetails;
}

async function fetchRepaymentSchedule(applicationId: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_loan_repayment_schedule', { p_loan_application_id: applicationId });
    if (error) throw new Error(error.message);
    return data as RepaymentSchedule[];
}

async function fetchPaymentHistory(applicationId: number) {
     const supabase = createClient();
     // Assuming a 'loan_payments' table linked to application_id
     const { data, error } = await supabase.from('loan_payments').select('*').eq('loan_application_id', applicationId).order('payment_date', { ascending: false });
     if(error) throw error;
     return data as PaymentHistory[];
}

// Mutators
async function updateStatus({ id, status }: { id: number, status: string }) {
    const supabase = createClient();
    const { error } = await supabase.from('loan_applications').update({ status, approval_date: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
}

async function disburseLoan(id: number) {
    const supabase = createClient();
    const { error } = await supabase.rpc('disburse_loan', { p_loan_application_id: id });
    if (error) throw new Error(error.message);
}

export default function LoanDetailView({ applicationId }: { applicationId: number }) {
    const queryClient = useQueryClient();

    const { data: details, isLoading } = useQuery({ 
        queryKey: ['loanDetails', applicationId], 
        queryFn: () => fetchLoanDetails(applicationId) 
    });

    const { data: schedule, isLoading: loadingSchedule } = useQuery({
        queryKey: ['repaymentSchedule', applicationId],
        queryFn: () => fetchRepaymentSchedule(applicationId),
        enabled: !!details && ['Active', 'Completed'].includes(details.application.status),
    });

    const { data: payments } = useQuery({
        queryKey: ['paymentHistory', applicationId],
        queryFn: () => fetchPaymentHistory(applicationId),
        enabled: !!details,
    });

    const statusMutation = useMutation({
        mutationFn: updateStatus,
        onSuccess: () => { toast.success("Status updated"); queryClient.invalidateQueries({ queryKey: ['loanDetails', applicationId] }); },
        onError: (e: Error) => toast.error(e.message),
    });

    const disburseMutation = useMutation({
        mutationFn: disburseLoan,
        onSuccess: () => { toast.success("Loan disbursed"); queryClient.invalidateQueries({ queryKey: ['loanDetails', applicationId] }); },
        onError: (e: Error) => toast.error(e.message),
    });

    if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!details) return <div className="p-10 text-center">Loan application not found.</div>;

    const { application, customer, product, balance_due } = details;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Loan #{application.id}</h1>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                        <span>{customer.name}</span>
                        <span>•</span>
                        <span>{product.name}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    {application.status === 'Pending' && (
                        <Button onClick={() => statusMutation.mutate({ id: application.id, status: 'Approved' })} disabled={statusMutation.isPending}>
                            <CheckCircle2 className="mr-2 h-4 w-4"/> Approve Application
                        </Button>
                    )}
                    {application.status === 'Approved' && (
                        <Button onClick={() => disburseMutation.mutate(application.id)} disabled={disburseMutation.isPending}>
                            <Banknote className="mr-2 h-4 w-4"/> Disburse Funds
                        </Button>
                    )}
                    {application.status === 'Active' && (
                        <RecordPaymentDialog applicationId={application.id} />
                    )}
                    <Badge className="text-sm px-3 py-1" variant={application.status === 'Active' ? 'default' : 'secondary'}>
                        {application.status}
                    </Badge>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Principal</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold">{formatCurrency(application.principal_amount)}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Interest Rate</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold">{product.interest_rate}% <span className="text-sm font-normal text-muted-foreground">p.a.</span></CardContent>
                </Card>
                <Card className={balance_due > 0 ? "border-red-200 bg-red-50 dark:bg-red-900/10" : "border-green-200 bg-green-50"}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold">{formatCurrency(balance_due)}</CardContent>
                </Card>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                {/* Schedule */}
                {(application.status === 'Active' || application.status === 'Completed') && (
                    <Card className="h-full">
                        <CardHeader><CardTitle>Amortization Schedule</CardTitle></CardHeader>
                        <CardContent className="overflow-auto max-h-[400px]">
                            <Table>
                                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {loadingSchedule ? <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow> :
                                        schedule?.map((row) => (
                                            <TableRow key={row.payment_number}>
                                                <TableCell>{row.payment_number}</TableCell>
                                                <TableCell>{formatDate(row.due_date)}</TableCell>
                                                <TableCell>{formatCurrency(row.monthly_payment)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.remaining_balance)}</TableCell>
                                            </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* History */}
                <Card className="h-full">
                    <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                    <CardContent className="overflow-auto max-h-[400px]">
                        <Table>
                            <TableHeader><TableRow><TableHead>Received Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {payments?.length === 0 ? (
                                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">No payments recorded.</TableCell></TableRow>
                                ) : (
                                    payments?.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>{formatDate(p.payment_date)}</TableCell>
                                            <TableCell className="text-right font-medium text-green-600">+{formatCurrency(p.amount_paid)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}