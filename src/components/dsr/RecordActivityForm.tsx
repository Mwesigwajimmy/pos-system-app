// src/components/dsr/RecordActivityForm.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from 'lucide-react';

interface Service { id: number; service_name: string; }

// ENHANCED SCHEMA: Added dsr_phone_number and stricter validation
const activitySchema = z.object({
    activity_type: z.enum(['Sale', 'Mobile Money Disbursement', 'Expense']),
    service_id: z.string().optional(),
    amount: z.coerce.number().positive("Amount must be a positive number."),
    customer_phone: z.string().optional(),
    dsr_phone_number: z.string().optional(), // NEW FIELD
    notes: z.string().min(3, "Please provide a brief description."),
})
.refine(data => !(data.activity_type === 'Sale' && !data.service_id), {
    message: "You must select a service for a sale.", path: ["service_id"],
})
.refine(data => !(data.activity_type === 'Mobile Money Disbursement' && !data.dsr_phone_number), {
    message: "You must enter the agent number used for this disbursement.", path: ["dsr_phone_number"],
});

type ActivityFormInput = z.input<typeof activitySchema>;
type ActivityFormOutput = z.infer<typeof activitySchema>;

export function RecordActivityForm({ services }: { services: Service[] }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const form = useForm<ActivityFormInput>({
        resolver: zodResolver(activitySchema),
        defaultValues: {
            notes: "", customer_phone: "", amount: '',
            activity_type: undefined, service_id: undefined, dsr_phone_number: ''
        }
    });
    const activityType = form.watch('activity_type');

    const { mutate: recordActivity, isPending } = useMutation({
        mutationFn: async (values: ActivityFormOutput) => {
            const { error } = await supabase.rpc('record_dsr_activity_v2', { // Using a new version of the RPC
                p_activity_type: values.activity_type,
                p_service_id: values.service_id ? Number(values.service_id) : null,
                p_amount: values.amount,
                p_customer_phone: values.customer_phone,
                p_dsr_phone_number: values.dsr_phone_number, // Pass new data
                p_notes: values.notes,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Activity recorded successfully.");
            queryClient.invalidateQueries({ queryKey: ['activeShiftTransactions'] });
            form.reset();
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    return (
        <Card>
            <CardHeader><CardTitle className="flex items-center"><Zap className="mr-2 h-5 w-5 text-yellow-500"/> Record an Activity</CardTitle></CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(data => recordActivity(data as ActivityFormOutput))} className="space-y-4">
                        {/* Activity Type, Service ID, Amount, Customer Phone fields remain the same */}

                        {/* NEW DSR PHONE FIELD: Conditionally rendered */}
                        {activityType === 'Mobile Money Disbursement' && (
                             <FormField name="dsr_phone_number" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Agent Number Used</FormLabel>
                                    <FormControl><Input placeholder="e.g., 0789654321" {...field} value={String(field.value ?? '')} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}

                        <FormField name="notes" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Notes / Description</FormLabel><FormControl><Textarea placeholder="e.g., Sim card sale for John Doe" {...field} value={String(field.value ?? '')} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Record
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}