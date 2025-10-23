'use client';

import { useForm } from 'react-hook-form';
import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { updateProductReorderSettings, FormState } from '@/lib/inventory/actions/inventory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Vendor { id: string, name: string; }
interface Product { id: string; reorder_point: number | null; reorder_quantity: number | null; preferred_vendor_id: string | null; }
interface Props { product: Product, vendors: Vendor[] }

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Settings'}</Button>;
}

export function ReorderPointManager({ product, vendors }: Props) {
    const { toast } = useToast();
    const { register, handleSubmit } = useForm({ defaultValues: {
        reorder_point: product.reorder_point,
        reorder_quantity: product.reorder_quantity,
        preferred_vendor_id: product.preferred_vendor_id
    }});

    const initialState: FormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(updateProductReorderSettings, initialState);

    useEffect(() => {
        if (formState.success) toast({ title: "Success!", description: formState.message });
        else if (formState.message) toast({ title: "Error", description: formState.message, variant: 'destructive' });
    }, [formState, toast]);

    const processSubmit = (data: any) => {
        const formData = new FormData();
        formData.append('productId', product.id);
        Object.keys(data).forEach(key => formData.append(key, data[key]));
        formAction(formData);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Automated Procurement</CardTitle>
                <CardDescription>Set reorder points to automatically generate draft purchase orders when stock is low.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="reorder_point">Reorder Point</Label>
                            <Input id="reorder_point" type="number" {...register('reorder_point')} placeholder="e.g., 10" />
                            <p className="text-xs text-muted-foreground">Trigger a reorder when stock reaches this quantity.</p>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
                            <Input id="reorder_quantity" type="number" {...register('reorder_quantity')} placeholder="e.g., 50" />
                            <p className="text-xs text-muted-foreground">Order this many units when reordering.</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="preferred_vendor_id">Preferred Vendor</Label>
                        <Select {...register('preferred_vendor_id')}>
                            <SelectTrigger><SelectValue placeholder="Select a preferred vendor..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {vendors.map(vendor => (
                                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">The default vendor for automated purchase orders.</p>
                    </div>
                    <SubmitButton />
                </form>
            </CardContent>
        </Card>
    );
}