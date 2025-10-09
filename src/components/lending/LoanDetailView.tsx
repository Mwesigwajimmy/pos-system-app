'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import toast from 'react-hot-toast';
import RecordPaymentDialog from './RecordPaymentDialog';
import { Badge } from '@/components/ui/badge';

// ----- DATA FETCHING FUNCTIONS -----
async function fetchLoanDetails(applicationId: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_loan_application_details', { p_application_id: applicationId });
    if (error) throw new Error(`Failed to fetch loan details: ${error.message}`);
    return data;
}

async function fetchRepaymentSchedule(applicationId: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_loan_repayment_schedule', { p_loan_application_id: applicationId });
    if (error) throw new Error(`Failed to generate schedule: ${error.message}`);
    return data;
}

// ----- DATABASE MUTATION FUNCTIONS -----
async function updateApplicationStatus({ id, status }: { id: number, status: string }) {
    const supabase = createClient();
    const { error } = await supabase.from('loan_applications').update({ status, approval_date: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(`Failed to update status: ${error.message}`);
}

async function disburseLoan(id: number) {
    const supabase = createClient();
    const { error } = await supabase.rpc('disburse_loan', { p_loan_application_id: id });
    if (error) throw new Error(`Failed to disburse loan: ${error.message}`);
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function LoanDetailView({ applicationId }: { applicationId: number }) {
    const queryClient = useQueryClient();
    const { data: details, isLoading, error: detailsError } = useQuery({ 
        queryKey: ['loanDetails', applicationId], 
        queryFn: () => fetchLoanDetails(applicationId) 
    });

    const { data: schedule, isLoading: isLoadingSchedule } = useQuery({
        queryKey: ['repaymentSchedule', applicationId],
        queryFn: () => fetchRepaymentSchedule(applicationId),
        enabled: !!details && (details.application.status === 'Active' || details.application.status === 'Completed'),
    });

    const statusMutation = useMutation({
        mutationFn: updateApplicationStatus,
        onSuccess: () => { toast.success("Status updated successfully!"); queryClient.invalidateQueries({ queryKey: ['loanDetails', applicationId] }); },
        onError: (error: any) => toast.error(error.message),
    });

    const disbursementMutation = useMutation({
        mutationFn: disburseLoan,
        onSuccess: () => { toast.success("Loan disbursed successfully! Accounting entries created."); queryClient.invalidateQueries({ queryKey: ['loanDetails', applicationId] }); },
        onError: (error: any) => toast.error(error.message),
    });

    if (isLoading) return <div className="text-center p-10">Loading application details...</div>;
    if (detailsError) return <div className="text-center p-10 text-destructive">Error: {detailsError.message}</div>;
    if (!details) return <div className="text-center p-10">Loan application not found.</div>;
    
    const { application, customer, product, repayments, balance_due } = details;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">Loan Application #{application.id}</h1>
                    <p className="text-muted-foreground">For: <span className="font-semibold">{customer.name}</span></p>
                    <Badge className="capitalize mt-2">{application.status}</Badge>
                </div>
                <div className="flex gap-2">
                    {application.status === 'Pending' && <Button onClick={() => statusMutation.mutate({ id: application.id, status: 'Approved' })} disabled={statusMutation.isPending}>Approve</Button>}
                    {application.status === 'Approved' && <Button onClick={() => disbursementMutation.mutate(application.id)} disabled={disbursementMutation.isPending}>Disburse Loan</Button>}
                    {application.status === 'Active' && <RecordPaymentDialog applicationId={application.id} />}
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <Card><CardHeader><CardTitle>Principal Amount</CardTitle></CardHeader><CardContent className="text-2xl">{formatCurrency(application.principal_amount)}</CardContent></Card>
                <Card><CardHeader><CardTitle>Interest Rate</CardTitle></CardHeader><CardContent className="text-2xl">{product.interest_rate}% p.a.</CardContent></Card>
                <Card><CardHeader><CardTitle>Balance Due</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(balance_due)}</CardContent></Card>
            </div>
            
            {(application.status === 'Active' || application.status === 'Completed') && (
                <Card>
                    <CardHeader><CardTitle>Loan Repayment Schedule</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Due Date</TableHead><TableHead>Monthly Payment</TableHead><TableHead>Principal</TableHead><TableHead>Interest</TableHead><TableHead className="text-right">Remaining Balance</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isLoadingSchedule && <TableRow><TableCell colSpan={6} className="text-center h-24">Generating schedule...</TableCell></TableRow>}
                                {schedule?.map((row: any) => (
                                    <TableRow key={row.payment_number}>
                                        <TableCell>{row.payment_number}</TableCell>
                                        <TableCell>{new Date(row.due_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{formatCurrency(row.monthly_payment)}</TableCell>
                                        <TableCell>{formatCurrency(row.principal)}</TableCell>
                                        <TableCell>{formatCurrency(row.interest)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(row.remaining_balance)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle>Repayment History</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount Paid</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {repayments?.map((p: any) => <TableRow key={p.id}><TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell><TableCell className="text-right">{formatCurrency(p.amount_paid)}</TableCell></TableRow>)}
                            {!repayments?.length && <TableRow><TableCell colSpan={2} className="text-center h-24">No repayments made yet.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}