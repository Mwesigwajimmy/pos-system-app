'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

async function recordPayment({ applicationId, amount }: { applicationId: number, amount: number }) {
    const supabase = createClient();
    const { error } = await supabase.rpc('record_loan_repayment', {
        p_loan_application_id: applicationId,
        p_amount_paid: amount
    });
    if (error) throw error;
}

export default function RecordPaymentDialog({ applicationId }: { applicationId: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: recordPayment,
        onSuccess: () => {
            toast.success("Payment recorded!");
            queryClient.invalidateQueries({ queryKey: ['loanDetails', applicationId] });
            setIsOpen(false);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        mutation.mutate({
            applicationId,
            amount: Number(formData.get('amount')),
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button>Record Payment</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Record Repayment</DialogTitle></DialogHeader>
                <form id="paymentForm" onSubmit={handleSubmit}>
                    <Label>Amount Paid (UGX)</Label>
                    <Input name="amount" type="number" step="any" required />
                </form>
                <DialogFooter>
                    <Button type="submit" form="paymentForm" disabled={mutation.isPending}>
                        {mutation.isPending ? "Saving..." : "Save Payment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}