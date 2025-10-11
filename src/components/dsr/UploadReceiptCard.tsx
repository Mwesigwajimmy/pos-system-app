// src/components/dsr/UploadReceiptCard.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText } from 'lucide-react';

const uploadSchema = z.object({
    amount_declared: z.coerce.number().positive({ message: "Please declare the amount." }),
    file: z.instanceof(File, { message: "A file is required." })
             .refine(file => file.size > 0, "A file is required.")
             .refine(file => file.size < 5 * 1024 * 1024, `Max file size is 5MB.`),
});

type UploadInput = z.input<typeof uploadSchema>;
type UploadOutput = z.infer<typeof uploadSchema>;

export function UploadReceiptCard({ shiftId }: { shiftId: number }) {
    const supabase = createClient();
    const form = useForm<UploadInput>({
        resolver: zodResolver(uploadSchema),
        defaultValues: { amount_declared: '', file: undefined }
    });

    const { mutate: uploadReceipt, isPending } = useMutation({
        mutationFn: async (values: UploadOutput) => {
            const file = values.file;
            const filePath = `receipts/${shiftId}-${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file);
            if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);
            const { error: rpcError } = await supabase.rpc('record_receipt_upload', {
                p_shift_id: shiftId, p_file_path: filePath, p_amount_declared: values.amount_declared
            });
            if (rpcError) {
                await supabase.storage.from('receipts').remove([filePath]).catch(console.error);
                throw new Error(`Database Error: ${rpcError.message}`);
            }
        },
        onSuccess: () => {
            toast.success("Bank deposit slip uploaded for verification.");
            form.reset();
        },
        onError: (err: Error) => toast.error(`Upload failed: ${err.message}`),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5"/> Upload Bank Deposit Slip</CardTitle>
                <CardDescription>Upload a photo of your bank slip for the accountant to verify.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(data => uploadReceipt(data as UploadOutput))} className="space-y-4">
                        <FormField name="file" control={form.control} render={({ field: { onChange, value, ...rest } }) => (
                            <FormItem>
                                <FormLabel>Receipt Photo</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*"
                                        onChange={e => onChange(e.target.files ? e.target.files[0] : null)} {...rest}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="amount_declared" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount on Receipt (UGX)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 250000" {...field} value={String(field.value ?? '')} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Upload className="mr-2 h-4 w-4" /> Upload for Verification
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}