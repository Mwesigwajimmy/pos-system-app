// src/components/modals/AddProductModal.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// --- UI Component Imports ---
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

// --- Form Validation Schema ---
const productSchema = z.object({
    name: z.string().min(3, "Product name is required."),
    provider: z.string().min(2, "Provider (e.g., MTN, Airtel) is required."),
    service_type: z.enum(['Airtime', 'Data', 'Mobile Money', 'SIM Card', 'Device']),
    commission_rate: z.coerce.number().min(0, "Commission must be 0 or greater."),
});

type ProductInput = z.input<typeof productSchema>;
type ProductOutput = z.infer<typeof productSchema>;

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddProductModal({ isOpen, onClose }: AddProductModalProps) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const form = useForm<ProductInput>({
        resolver: zodResolver(productSchema),
        defaultValues: { name: '', provider: '', service_type: 'Airtime', commission_rate: '' }
    });

    const { mutate: addProduct, isPending } = useMutation({
        mutationFn: async (values: ProductOutput) => {
            // This RPC needs to exist in your backend.
            // It should automatically associate the new product with the caller's business_id.
            const { error } = await supabase.rpc('add_telecom_product', {
                p_name: values.name,
                p_provider: values.provider,
                p_service_type: values.service_type,
                p_commission_rate: values.commission_rate,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("New product added successfully!");
            queryClient.invalidateQueries({ queryKey: ['telecomProducts'] });
            form.reset();
            onClose();
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Telecom Product</DialogTitle>
                    <DialogDescription>Define a new service your agents can sell.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(data => addProduct(data as ProductOutput))} className="space-y-4 pt-4">
                        <FormField name="name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g., 5GB Monthly Bundle" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="provider" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Provider</FormLabel><FormControl><Input placeholder="e.g., MTN, Airtel" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="service_type" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Service Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type..." /></SelectTrigger></FormControl><SelectContent>
                                <SelectItem value="Airtime">Airtime</SelectItem><SelectItem value="Data">Data Bundle</SelectItem>
                                <SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="SIM Card">SIM Card</SelectItem>
                                <SelectItem value="Device">Device (e.g., Mifi)</SelectItem>
                            </SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField name="commission_rate" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Commission Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} value={String(field.value ?? '')} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Product
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}