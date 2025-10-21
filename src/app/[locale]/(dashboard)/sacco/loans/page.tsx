'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';
import { PlusCircle, CalendarIcon, Check, Ship, DollarSign } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

// --- TYPE DEFINITIONS ---
interface LoanApplication {
    id: number;
    application_date: string;
    status: string;
    principal_amount: number;
    customers: { name: string } | null;
    sacco_loan_products: { name: string } | null;
}
interface SaccoMemberWithCustomer {
    id: bigint;
    customers: { id: bigint; name: string; }[];
}
interface SaccoLoanProduct {
    id: bigint;
    name: string;
}

// --- ASYNC FUNCTIONS ---
async function fetchLoanApplications(): Promise<LoanApplication[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('loan_applications').select('*, customers(name), sacco_loan_products(name)');
    if (error) throw error;
    return data as LoanApplication[];
}
async function fetchFormPrerequisites() {
    const supabase = createClient();
    const { data: members, error: memberError } = await supabase.from('sacco_members').select('id, customers(id, name)');
    if (memberError) throw memberError;
    const { data: products, error: productError } = await supabase.from('sacco_loan_products').select('id, name');
    if (productError) throw productError;
    return { members: members as SaccoMemberWithCustomer[], products: products as SaccoLoanProduct[] };
}
async function createLoanApplication(data: any) {
    const supabase = createClient();
    const { error } = await supabase.from('loan_applications').insert(data);
    if (error) throw error;
}
async function approveLoan(loanId: number) {
    const supabase = createClient();
    const { error } = await supabase.rpc('approve_loan_application', { p_loan_application_id: loanId });
    if (error) throw error;
}
async function disburseLoan(loanId: number) {
    const supabase = createClient();
    const { error } = await supabase.rpc('disburse_approved_loan', { p_loan_application_id: loanId });
    if (error) throw error;
}
async function repayLoan(params: { loanId: number; amount: number }) {
    const supabase = createClient();
    const { error } = await supabase.rpc('process_loan_repayment', { p_loan_application_id: params.loanId, p_amount: params.amount });
    if (error) throw error;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function LoanApplicationsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isRepayOpen, setIsRepayOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
    const [applicationDate, setApplicationDate] = useState<Date>();
    const queryClient = useQueryClient();

    const { data: applications, isLoading } = useQuery({ queryKey: ['loanApplications'], queryFn: fetchLoanApplications });
    const { data: prereqs } = useQuery({ queryKey: ['loanAppPrereqs'], queryFn: fetchFormPrerequisites });
    
    const memberOptions = useMemo(() => prereqs?.members.filter(m => m.customers && m.customers.length > 0).map(m => ({ value: m.id.toString(), label: m.customers[0].name })) || [], [prereqs]);
    const productOptions = useMemo(() => prereqs?.products.map(p => ({ value: p.id.toString(), label: p.name })) || [], [prereqs]);

    const handleMutationSuccess = (message: string) => {
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: ['loanApplications'] });
        queryClient.invalidateQueries({ queryKey: ['saccoDashboardKPIs'] });
        setIsCreateOpen(false);
        setIsDetailOpen(false);
        setIsRepayOpen(false);
        setSelectedLoan(null);
    };
    const handleMutationError = (error: any) => toast.error(`Operation failed: ${error.message}`);

    const createMutation = useMutation({ mutationFn: createLoanApplication, onSuccess: () => handleMutationSuccess("Loan application submitted!"), onError: handleMutationError });
    const approveMutation = useMutation({ mutationFn: approveLoan, onSuccess: () => handleMutationSuccess("Loan approved!"), onError: handleMutationError });
    const disburseMutation = useMutation({ mutationFn: disburseLoan, onSuccess: () => handleMutationSuccess("Loan disbursed!"), onError: handleMutationError });
    const repayMutation = useMutation({ mutationFn: repayLoan, onSuccess: () => handleMutationSuccess("Repayment logged!"), onError: handleMutationError });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createMutation.mutate({ member_id: formData.get('member'), product_id: formData.get('product'), principal_amount: formData.get('amount'), duration_months: formData.get('duration'), application_date: applicationDate ? format(applicationDate, 'yyyy-MM-dd') : new Date().toISOString() });
    };

    const handleRepaySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        repayMutation.mutate({ loanId: selectedLoan!.id, amount: Number(formData.get('repay_amount')) });
    }

    const handleViewClick = (app: LoanApplication) => {
        setSelectedLoan(app);
        setIsDetailOpen(true);
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Loan Applications</h1>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/>New Application</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>New Loan Application</DialogTitle></DialogHeader>
                        <form id="loanAppForm" onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div><Label>Member</Label><Select name="member" required><SelectTrigger><SelectValue placeholder="Select a member..."/></SelectTrigger><SelectContent>{memberOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Loan Product</Label><Select name="product" required><SelectTrigger><SelectValue placeholder="Select a product..."/></SelectTrigger><SelectContent>{productOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Principal Amount (UGX)</Label><Input name="amount" type="number" required /></div>
                            <div><Label>Duration (Months)</Label><Input name="duration" type="number" required /></div>
                            <div><Label>Application Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{applicationDate ? format(applicationDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={applicationDate} onSelect={setApplicationDate} initialFocus /></PopoverContent></Popover></div>
                        </form>
                        <DialogFooter><Button type="submit" form="loanAppForm" disabled={createMutation.isPending}>{createMutation.isPending ? "Submitting..." : "Submit Application"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Table>
                <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Product</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Loading applications...</TableCell></TableRow>}
                    {applications?.map(app => (
                        <TableRow key={app.id}>
                            <TableCell>{app.customers?.name || 'N/A'}</TableCell>
                            <TableCell>{app.sacco_loan_products?.name || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(app.principal_amount)}</TableCell>
                            <TableCell>{format(new Date(app.application_date), "PPP")}</TableCell>
                            <TableCell><Badge>{app.status}</Badge></TableCell>
                            <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleViewClick(app)}>View</Button></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Loan Details & Actions Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Loan Details</DialogTitle>
                        <DialogDescription>{selectedLoan?.customers?.name} - {formatCurrency(selectedLoan?.principal_amount || 0)}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Current Status</span>
                            <Badge>{selectedLoan?.status}</Badge>
                        </div>
                    </div>
                    <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {selectedLoan?.status === 'Pending' && <Button onClick={() => approveMutation.mutate(selectedLoan.id)} disabled={approveMutation.isPending}><Check className="mr-2 h-4 w-4"/>{approveMutation.isPending ? "Approving..." : "Approve Loan"}</Button>}
                        {selectedLoan?.status === 'Approved' && <Button onClick={() => disburseMutation.mutate(selectedLoan.id)} disabled={disburseMutation.isPending}><Ship className="mr-2 h-4 w-4"/>{disburseMutation.isPending ? "Disbursing..." : "Disburse Funds"}</Button>}
                        {selectedLoan?.status === 'Disbursed' && <Button onClick={() => { setIsDetailOpen(false); setIsRepayOpen(true); }}><DollarSign className="mr-2 h-4 w-4"/>Log Repayment</Button>}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Repayment Dialog */}
            <Dialog open={isRepayOpen} onOpenChange={setIsRepayOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Log Repayment</DialogTitle>
                        <DialogDescription>Log a payment for {selectedLoan?.customers?.name}.</DialogDescription>
                    </DialogHeader>
                    <form id="repayForm" onSubmit={handleRepaySubmit} className="py-4">
                        <Label htmlFor="repay_amount">Amount Paid (UGX)</Label>
                        <Input id="repay_amount" name="repay_amount" type="number" required />
                    </form>
                    <DialogFooter>
                        <Button type="submit" form="repayForm" disabled={repayMutation.isPending}>
                            {repayMutation.isPending ? "Logging..." : "Confirm Payment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}