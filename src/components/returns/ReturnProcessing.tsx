'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';

interface SaleItem { variant_id: number; product_name: string; variant_name: string; quantity_sold: number; unit_price: number; }
interface SaleForReturn { sale_id: number; created_at: string; customer_name: string; items: SaleItem[]; }

async function fetchSale(saleId: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_sale_for_return', { p_sale_id: saleId });
    if (error) throw error;
    if (!data) throw new Error("Sale not found.");
    return data;
}

async function processReturn(returnData: any) {
    const supabase = createClient();
    const { error } = await supabase.rpc('process_return', returnData);
    if (error) throw error;
}

export default function ReturnProcessing() {
    const [saleId, setSaleId] = useState('');
    const [selectedItems, setSelectedItems] = useState<Record<string, { item: SaleItem; quantity: number }>>({});
    const queryClient = useQueryClient();
    
    const { data: saleData, refetch, isFetching } = useQuery<SaleForReturn>({
        queryKey: ['saleForReturn', Number(saleId)],
        queryFn: () => fetchSale(Number(saleId)),
        enabled: false,
    });

    const mutation = useMutation({
        mutationFn: processReturn,
        onSuccess: () => {
            toast.success("Return processed successfully!");
            queryClient.invalidateQueries({ queryKey: ['products'] }); // To reflect new stock
            setSaleId('');
            setSelectedItems({});
        },
        onError: (error: any) => toast.error(`Error: ${error.message}`),
    });
    
    const handleItemSelect = (item: SaleItem, checked: boolean) => {
        const newSelection = { ...selectedItems };
        if (checked) {
            newSelection[item.variant_id] = { item, quantity: item.quantity_sold };
        } else {
            delete newSelection[item.variant_id];
        }
        setSelectedItems(newSelection);
    };

    const handleQuantityChange = (variantId: number, quantity: number) => {
        const itemData = selectedItems[variantId];
        if (quantity > itemData.item.quantity_sold) quantity = itemData.item.quantity_sold;
        if (quantity < 1) quantity = 1;
        setSelectedItems({ ...selectedItems, [variantId]: { ...itemData, quantity } });
    };

    const handleProcessReturn = () => {
        const returned_items = Object.values(selectedItems).map(({ item, quantity }) => ({
            variant_id: item.variant_id,
            quantity: quantity,
            unit_price: item.unit_price,
        }));
        mutation.mutate({ p_original_sale_id: saleData!.sale_id, p_reason: 'Customer Return', p_returned_items: returned_items });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Find Original Sale</CardTitle></CardHeader>
                <CardContent className="flex items-center gap-2">
                    <Input placeholder="Enter Sale ID from receipt..." value={saleId} onChange={e => setSaleId(e.target.value)} />
                    <Button onClick={() => refetch()} disabled={isFetching || !saleId}>{isFetching ? "Searching..." : "Search"}</Button>
                </CardContent>
            </Card>

            {saleData && (
                <Card>
                    <CardHeader>
                        <CardTitle>Process Return for Sale #{saleData.sale_id}</CardTitle>
                        <CardDescription>Select items and quantities to return.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead className="w-12"></TableHead><TableHead>Product</TableHead><TableHead>Qty Sold</TableHead><TableHead className="w-32">Return Qty</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {saleData.items.map(item => (
                                    <TableRow key={item.variant_id}>
                                        <TableCell><Checkbox onCheckedChange={(checked) => handleItemSelect(item, !!checked)} /></TableCell>
                                        <TableCell>{item.product_name} ({item.variant_name})</TableCell>
                                        <TableCell>{item.quantity_sold}</TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                disabled={!selectedItems[item.variant_id]}
                                                value={selectedItems[item.variant_id]?.quantity || ''}
                                                onChange={e => handleQuantityChange(item.variant_id, Number(e.target.value))}
                                                max={item.quantity_sold}
                                                min={1}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex justify-end mt-4">
                            <Button onClick={handleProcessReturn} disabled={Object.keys(selectedItems).length === 0 || mutation.isPending}>
                                {mutation.isPending ? "Processing..." : "Confirm & Process Return"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}