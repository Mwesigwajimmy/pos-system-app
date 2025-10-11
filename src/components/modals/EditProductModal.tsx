// src/components/modals/EditProductModal.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

// This is the expected shape of a product object
export interface Product {
    id: number;
    name: string;
    provider: string;
    service_type: 'Airtime' | 'Data' | 'Mobile Money' | 'SIM Card' | 'Device';
    commission_rate: number;
}

const productSchema = z.object({
    name: z.string().min(3, "Product name is required."),
    provider: z.string().min(2, "Provider is required."),
    service_type: z.enum(['Airtime', 'Data', 'Mobile Money', 'SIM Card', 'Device']),
    commission_rate: z.coerce.number().min(0, "Commission must be 0 or greater."),
});

type ProductInput = z.input<typeof productSchema>;
type ProductOutput = z.infer<typeof productSchema>;

interface EditProductModalProps {
    product: Product;
    isOpen: boolean;
    onClose: () => void;
}

export function EditProductModal({ product, isOpen, onClose }: EditProductModalProps) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const form = useForm<ProductInput>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: product.name,
            provider: product.provider,
            service_type: product.service_type,
            commission_rate: product.commission_rate.toString(), // Form needs a string
        }
    });

    const { mutate: updateProduct, isPending } = useMutation({
        mutationFn: async (values: ProductOutput) => {
            const { error } = await supabase.rpc('update_telecom_product', {
                p_product_id: product.id,
                p_name: values.name,
                p_provider: values.provider,
                p_service_type: values.service_type,
                p_commission_rate: values.commission_rate,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Product updated successfully!");
            queryClient.invalidateQueries({ queryKey: ['telecomProducts'] });
            onClose();
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Product: {product.name}</DialogTitle>
                    <DialogDescription>Update the details for this service.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(data => updateProduct(data as ProductOutput))} className="space-y-4 pt-4">
                        {/* Form fields are identical to AddProductModal */}
                        <FormField name="name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="provider" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Provider</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="service_type" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Service Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                <SelectItem value="Airtime">Airtime</SelectItem><SelectItem value="Data">Data Bundle</SelectItem>
                                <SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="SIM Card">SIM Card</SelectItem>
                                <SelectItem value="Device">Device</SelectItem>
                            </SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField name="commission_rate" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Commission Rate (%)</FormLabel><FormControl><Input type="number" {...field} value={String(field.value ?? '')} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}