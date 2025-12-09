'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from "@/lib/supabase/client";

import { Button } from '@/components/ui/button';
import { 
    Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Receipt, AlertCircle, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

// --- Enterprise Validation ---

const paymentSchema = z.object({
    amount: z.coerce.number().min(1, "Amount must be greater than 0"),
    method: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHEQUE']),
    reference: z.string().optional(),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
    notes: z.string().optional(),
}).superRefine((data, ctx) => {
    // Audit Requirement: Non-cash payments MUST have a reference ID
    if (data.method !== 'CASH' && (!data.reference || data.reference.length < 3)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Reference ID is required for digital payments",
            path: ["reference"]
        });
    }
});

type PaymentForm = z.infer<typeof paymentSchema>;

// --- Server Action ---

async function recordPayment({ applicationId, data, tenantId }: { applicationId: number, data: PaymentForm, tenantId: string }) {
    const supabase = createClient();
    
    // Enterprise RPC: 
    // 1. Records ledger entry
    // 2. Updates loan balance
    // 3. Updates repayment schedule status
    // 4. Triggers SMS receipt (if configured)
    const { error } = await supabase.rpc('process_loan_repayment', {
        p_loan_id: applicationId,
        p_tenant_id: tenantId,
        p_amount: data.amount,
        p_method: data.method,
        p_reference: data.reference || null,
        p_date: data.date,
        p_notes: data.notes || null,
        p_logged_by: (await supabase.auth.getUser()).data.user?.id
    });

    if (error) throw new Error(error.message);
}

// --- Component ---

interface RecordPaymentProps {
    applicationId: number;
    balance?: number; // Optional context
    suggestedAmount?: number; // Optional context (e.g. next installment)
    tenantId?: string; // Passed from parent or fetched
}

export default function RecordPaymentDialog({ applicationId, balance, suggestedAmount, tenantId = 'default' }: RecordPaymentProps) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();
    
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PaymentForm>({
        // FIX: Cast to 'any' to bypass TS error caused by .superRefine() mixed with coercion
        resolver: zodResolver(paymentSchema) as any,
        defaultValues: {
            amount: suggestedAmount || 0,
            method: 'CASH',
            reference: '',
            date: new Date().toISOString().split('T')[0],
            notes: ''
        }
    });

    const paymentMethod = watch('method');
    const enteredAmount = watch('amount');

    // Warning for overpayment
    const isOverpayment = balance !== undefined && enteredAmount > balance;

    const mutation = useMutation({
        mutationFn: (data: PaymentForm) => recordPayment({ applicationId, data, tenantId }),
        onSuccess: () => {
            toast.success("Transaction posted successfully!");
            queryClient.invalidateQueries({ queryKey: ['loanDetails', applicationId] });
            queryClient.invalidateQueries({ queryKey: ['repaymentSchedule', applicationId] });
            queryClient.invalidateQueries({ queryKey: ['repayments-master'] }); // Update master list
            setIsOpen(false);
            reset();
        },
        onError: (error: Error) => toast.error(`Transaction Failed: ${error.message}`),
    });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 shadow-sm">
                    <Banknote className="mr-2 h-4 w-4"/> Record Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-green-600"/> Receive Payment
                    </DialogTitle>
                    <DialogDescription>
                        Post a repayment to Loan #{applicationId}. This will update the ledger immediately.
                    </DialogDescription>
                </DialogHeader>

                {/* Financial Context Banner */}
                {balance !== undefined && (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex justify-between items-center text-sm mb-2">
                        <span className="text-muted-foreground">Outstanding Balance:</span>
                        <span className="font-bold font-mono">{formatCurrency(balance)}</span>
                    </div>
                )}
                
                <form id="payment-form" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Amount Received</Label>
                            <Input 
                                type="number" 
                                step="100" 
                                {...register('amount')} 
                                className="text-lg font-bold text-green-700"
                            />
                            {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Date</Label>
                            <Input type="date" {...register('date')} />
                            {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select onValueChange={(val: any) => setValue('method', val)} defaultValue="CASH">
                            <SelectTrigger>
                                <SelectValue placeholder="Select Method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Cash (Teller)</SelectItem>
                                <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {paymentMethod !== 'CASH' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label>Reference ID / Receipt No</Label>
                            <Input placeholder="e.g. M-PESA Ref, Cheque #" {...register('reference')} />
                            {errors.reference && <p className="text-red-500 text-xs">{errors.reference.message}</p>}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Remarks / Notes</Label>
                        <Textarea placeholder="Optional details..." {...register('notes')} className="h-20" />
                    </div>

                    {/* Logic Checks */}
                    {isOverpayment && (
                        <Alert variant="destructive" className="py-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                Warning: Amount exceeds outstanding balance ({formatCurrency(balance)}). This will create a credit balance.
                            </AlertDescription>
                        </Alert>
                    )}
                </form>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" form="payment-form" disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm Transaction
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}