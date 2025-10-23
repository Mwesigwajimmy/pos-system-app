'use client';
import { useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { updateProductTrackingMethod } from '@/lib/inventory/actions/inventory';

type Method = 'QUANTITY' | 'SERIAL' | 'LOT';
interface Props { productId: string; currentMethod: Method; }

export function InventoryTrackingManager({ productId, currentMethod }: Props) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleChange = (value: Method) => {
        startTransition(async () => {
            const result = await updateProductTrackingMethod(productId, value);
            if (result.success) toast({ title: "Success", description: result.message });
            else toast({ title: "Error", description: result.message, variant: 'destructive' });
        });
    };

    return (
        <Card>
            <CardHeader><CardTitle>Inventory Tracking Method</CardTitle></CardHeader>
            <CardContent>
                <RadioGroup defaultValue={currentMethod} onValueChange={handleChange} disabled={isPending}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="QUANTITY" id="r1" /><Label htmlFor="r1">Track Quantity Only</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="SERIAL" id="r2" /><Label htmlFor="r2">Track by Serial Number</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="LOT" id="r3" /><Label htmlFor="r3">Track by Lot Number</Label></div>
                </RadioGroup>
            </CardContent>
        </Card>
    );
}