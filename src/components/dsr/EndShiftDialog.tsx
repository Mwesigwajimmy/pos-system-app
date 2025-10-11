// src/components/dsr/EndShiftDialog.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const endShiftSchema = z.object({
    counted_cash: z.coerce.number().min(0, "Counted cash cannot be negative."),
    final_notes: z.string().optional(),
});

type ShiftFormInput = z.input<typeof endShiftSchema>;
type ShiftFormOutput = z.infer<typeof endShiftSchema>;

export function EndShiftDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [reportSummary, setReportSummary] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ content: () => printRef.current });

    const form = useForm<ShiftFormInput>({
        resolver: zodResolver(endShiftSchema),
        defaultValues: { counted_cash: '', final_notes: "" }
    });

    const { mutate: endShift, isPending } = useMutation({
        mutationFn: async (values: ShiftFormOutput) => {
            const { data, error } = await supabase.rpc('end_dsr_shift', {
                p_counted_cash: values.counted_cash, p_final_notes: values.final_notes,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            toast.success("Shift closed and report submitted.");
            setReportSummary(data.report);
            queryClient.invalidateQueries({ queryKey: ['activeDsrShift'] });
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    const handleDialogClose = () => {
        setReportSummary(null);
        form.reset();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="sm:max-w-[425px]">
                {reportSummary ? (
                    <div ref={printRef} className="p-1">
                        <DialogHeader className="p-4">
                            <DialogTitle>Shift Summary Report</DialogTitle>
                            <DialogDescription>Date: {format(new Date(), 'PPP')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 text-sm px-4">
                            <div className="flex justify-between"><span>Total Sales:</span> <strong>UGX {reportSummary.total_sales.toLocaleString()}</strong></div>
                            <Separator />
                            <div className="flex justify-between"><span>Expected Cash:</span> <strong>UGX {reportSummary.expected_cash.toLocaleString()}</strong></div>
                            <div className="flex justify-between"><span>You Counted:</span> <strong>UGX {reportSummary.counted_cash.toLocaleString()}</strong></div>
                            <Separator />
                            <div className={`flex justify-between text-base font-bold ${reportSummary.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                <span>Variance:</span>
                                <span>UGX {reportSummary.variance.toLocaleString()}</span>
                            </div>
                        </div>
                        <DialogFooter className="flex-row justify-end gap-2 pt-4 px-4 print:hidden">
                            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                            <Button onClick={handleDialogClose}>Acknowledge & Close</Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>End Shift & Final Reconciliation</DialogTitle>
                            <DialogDescription>Count all physical cash and enter the total below.</DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(data => endShift(data as ShiftFormOutput))} className="space-y-4 pt-4">
                                <FormField name="counted_cash" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Total Counted Cash (UGX)</FormLabel><FormControl><Input type="number" placeholder="Enter total cash amount" {...field} value={String(field.value ?? '')} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="final_notes" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Final Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Customer dispute, received fake note, etc." {...field} value={String(field.value ?? '')} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                                    <Button type="submit" variant="destructive" disabled={isPending}>
                                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Finalize Report
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}