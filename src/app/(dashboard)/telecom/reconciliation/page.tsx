// src/app/(dashboard)/telecom/reconciliation/page.tsx
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// --- UI & Icon Imports ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, ChevronsRight } from 'lucide-react';

// --- DATA TYPES ---
interface DailyReportRow { shift_id: number; agent_name: string; total_sales: number; expected_cash: number; counted_cash: number; variance: number; debt_carried_over: number; status: 'Balanced' | 'Shortage' | 'Surplus'; }
interface PendingReceipt { receipt_id: number; agent_name: string; amount: number; file_path: string; uploaded_at: string; }
interface Employee { id: string; full_name: string; }

// --- ZOD SCHEMA for Disbursement Form (now inside the page component) ---
const disbursementSchema = z.object({
    amount: z.coerce.number().positive("Amount must be a positive number."),
    target_employee_id: z.string().nonempty("You must select an employee."),
    disbursement_type: z.enum(['Float', 'Petty Cash']),
});
type DisbursementInput = z.input<typeof disbursementSchema>;
type DisbursementOutput = z.infer<typeof disbursementSchema>;

// ===================================================================
// ADMIN RECONCILIATION PAGE
// ===================================================================
export default function AdminReconciliationPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [reportDate, setReportDate] = useState<Date>(new Date());
    const [isDisburseDialogOpen, setIsDisburseDialogOpen] = useState(false); // State to control the dialog
    const formattedDate = format(reportDate, 'yyyy-MM-dd');

    // --- DATA FETCHING ---
    const { data: reportData, isLoading: isLoadingReport } = useQuery({
        queryKey: ['dailyReconciliationReport', formattedDate],
        queryFn: async (): Promise<DailyReportRow[]> => {
            const { data, error } = await supabase.rpc('get_daily_reconciliation_report', { p_report_date: formattedDate });
            if (error) throw error; return data || [];
        }
    });

    const { data: pendingReceipts, isLoading: isLoadingReceipts } = useQuery({
        queryKey: ['pendingReceipts'],
        queryFn: async (): Promise<PendingReceipt[]> => {
            const { data, error } = await supabase.rpc('get_pending_receipts');
            if (error) throw error; return data || [];
        }
    });

    const { data: employees, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['allEmployees'],
        queryFn: async (): Promise<Employee[]> => {
            const { data, error } = await supabase.rpc('get_all_employees');
            if (error) throw error; return data || [];
        }
    });

    // --- MUTATIONS ---
    const { mutate: verifyDeposit, isPending: isVerifying } = useMutation({
        mutationFn: async (receiptId: number) => {
            const { error } = await supabase.rpc('verify_bank_deposit', { p_receipt_id: receiptId });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Deposit verified!");
            queryClient.invalidateQueries({ queryKey: ['pendingReceipts'] });
            queryClient.invalidateQueries({ queryKey: ['dailyReconciliationReport', formattedDate] });
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    // --- DISBURSEMENT FORM LOGIC (now inside the page component) ---
    const disbursementForm = useForm<DisbursementInput>({
        resolver: zodResolver(disbursementSchema),
        defaultValues: { amount: '', disbursement_type: 'Float', target_employee_id: undefined }
    });

    const { mutate: disburseFunds, isPending: isDisbursing } = useMutation({
        mutationFn: async (values: DisbursementOutput) => {
            const { error } = await supabase.rpc('disburse_funds_to_dsr', {
                p_target_user_id: values.target_employee_id,
                p_amount: values.amount,
                p_disbursement_type: values.disbursement_type,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Funds disbursed successfully!");
            queryClient.invalidateQueries({ queryKey: ['dailyReconciliationReport'] });
            disbursementForm.reset();
            setIsDisburseDialogOpen(false); // Close the dialog on success
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    const formatCurrency = (value: number) => `UGX ${value.toLocaleString()}`;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Reconciliation Center</h1>
                    <p className="text-muted-foreground">Review reports, verify deposits, and manage employee finances.</p>
                </div>
                {/* --- THIS IS THE FIX --- */}
                {/* The Dialog component now wraps the trigger and the content */}
                <Dialog open={isDisburseDialogOpen} onOpenChange={setIsDisburseDialogOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={isLoadingEmployees}>
                            <ChevronsRight className="mr-2 h-4 w-4"/> Disburse Funds
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Disburse Funds to DSR</DialogTitle>
                            <DialogDescription>Select an employee, the type of funds, and the amount to disburse.</DialogDescription>
                        </DialogHeader>
                        <Form {...disbursementForm}>
                            <form onSubmit={disbursementForm.handleSubmit(data => disburseFunds(data as DisbursementOutput))} className="space-y-4 pt-4">
                                <FormField name="target_employee_id" control={disbursementForm.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Employee</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select an employee..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {employees?.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="disbursement_type" control={disbursementForm.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Disbursement Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a type..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Float">Float</SelectItem>
                                                <SelectItem value="Petty Cash">Petty Cash</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="amount" control={disbursementForm.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount (UGX)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 500000" {...field} value={String(field.value ?? '')} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setIsDisburseDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={isDisbursing}>
                                        {isDisbursing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Confirm Disbursement
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </header>

            {/* The rest of the page remains the same */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Daily Report for {format(reportDate, 'PPP')}</CardTitle></CardHeader>
                        <CardContent>
                            {isLoadingReport ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
                             !reportData || reportData.length === 0 ? <p className="text-center text-muted-foreground py-8">No closed shifts found.</p> :
                            <Table>
                                <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Counted</TableHead><TableHead>Variance</TableHead><TableHead>Debt B/F</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>{reportData.map(row => (
                                    <TableRow key={row.shift_id}>
                                        <TableCell>{row.agent_name}</TableCell>
                                        <TableCell>{formatCurrency(row.counted_cash)}</TableCell>
                                        <TableCell className={`font-bold ${row.variance < 0 ? 'text-red-600' : ''}`}>{formatCurrency(row.variance)}</TableCell>
                                        <TableCell className="text-orange-600">{formatCurrency(row.debt_carried_over)}</TableCell>
                                        <TableCell>{row.status}</TableCell>
                                    </TableRow>
                                ))}</TableBody>
                            </Table>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Pending Bank Deposits</CardTitle></CardHeader>
                        <CardContent>
                            {isLoadingReceipts ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
                            !pendingReceipts || pendingReceipts.length === 0 ? <p className="text-center text-muted-foreground py-8">No pending receipts.</p> :
                            <Table>
                                <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Amount</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{pendingReceipts.map(r => (
                                    <TableRow key={r.receipt_id}>
                                        <TableCell>{r.agent_name}</TableCell>
                                        <TableCell>{formatCurrency(r.amount)}</TableCell>
                                        <TableCell className="space-x-2">
                                            <Button variant="outline" size="sm" asChild><a href={r.file_path} target="_blank" rel="noopener noreferrer">View</a></Button>
                                            <Button size="sm" onClick={() => verifyDeposit(r.receipt_id)} disabled={isVerifying}><CheckCircle className="mr-2 h-4 w-4" /> Verify</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}</TableBody>
                            </Table>}
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader><CardTitle>Select Report Date</CardTitle></CardHeader>
                        <CardContent><Calendar mode="single" selected={reportDate} onSelect={(d) => d && setReportDate(d)} className="rounded-md border" /></CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}