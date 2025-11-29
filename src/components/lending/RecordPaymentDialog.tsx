'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from "@/lib/supabase/client";

import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

const paymentSchema = z.object({
    amount: z.coerce.number().min(1, "Amount must be greater than 0"),
    reference: z.string().optional().default(''),
    date: z.string().default(() => new Date().toISOString().split('T')[0])
});

type PaymentForm = z.infer<typeof paymentSchema>;

async function recordPayment({ applicationId, data }: { applicationId: number, data: PaymentForm }) {
    const supabase = createClient();
    const { error } = await supabase.rpc('record_loan_repayment', {
        p_loan_application_id: applicationId,
        p_amount_paid: data.amount,
        p_transaction_ref: data.reference,
        p_date: data.date
    });
    if (error) throw new Error(error.message);
}

export default function RecordPaymentDialog({ applicationId }: { applicationId: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();
    
    // FIX: Removed generic <PaymentForm> to allow Zod coercion types to resolve correctly
    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            amount: 0,
            reference: '',
            date: new Date().toISOString().split('T')[0]
        }
    });

    const mutation = useMutation({
        mutationFn: (data: PaymentForm) => recordPayment({ applicationId, data }),
        onSuccess: () => {
            toast.success("Payment recorded successfully!");
            queryClient.invalidateQueries({ queryKey: ['loanDetails', applicationId] });
            queryClient.invalidateQueries({ queryKey: ['paymentHistory', applicationId] });
            setIsOpen(false);
            reset();
        },
        onError: (error: Error) => toast.error(`Failed: ${error.message}`),
    });

    const onSubmit = (data: PaymentForm) => mutation.mutate(data);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                    <Receipt className="mr-2 h-4 w-4"/> Record Repayment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Manual Payment</DialogTitle>
                    <DialogDescription>
                        Enter the repayment details received from the customer.
                    </DialogDescription>
                </DialogHeader>
                
                <form id="payment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Amount Paid (UGX)</Label>
                        <Input type="number" step="100" {...register('amount')} className="text-lg font-semibold" />
                        {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message as string}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Transaction Reference (Optional)</Label>
                        <Input placeholder="e.g. Mobile Money ID" {...register('reference')} />
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Date</Label>
                        <Input type="date" {...register('date')} />
                    </div>
                </form>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" form="payment-form" disabled={mutation.isPending}>
                        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Save Transaction
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}