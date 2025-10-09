'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Trash2, Loader2, PlusCircle, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Types
interface Option { value: number; label: string; }
interface TransferItem { variant_id: number; name: string; quantity: number; }

const supabase = createClient();

// API Functions
async function fetchTransferPrereqs() {
    const { data: locations, error: locError } = await supabase.from('locations').select('id, name');
    if (locError) throw new Error(locError.message);

    const { data: variants, error: varError } = await supabase.from('product_variants').select('id, name, products(name)');
    if (varError) throw new Error(varError.message);

    return {
        locations: locations?.map(l => ({ value: l.id, label: l.name })) || [],
        products: variants?.map(v => ({ value: v.id, label: `${v.products[0]?.name || 'Product'} - ${v.name}` })) || [],
    };
}

async function createStockTransfer(transferData: { header: any; items: any[] }) {
    const { data: transfer, error: transferError } = await supabase.from('stock_transfers').insert(transferData.header).select().single();
    if (transferError) throw transferError;

    const itemsToInsert = transferData.items.map(item => ({ transfer_id: transfer.id, variant_id: item.variant_id, quantity: item.quantity }));
    const { error: itemsError } = await supabase.from('stock_transfer_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;
}

// Reusable Combobox Component
const Combobox = ({ options, value, onChange, placeholder, disabled }: { options: Option[], value: Option | null, onChange: (opt: Option | null) => void, placeholder: string, disabled?: boolean }) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" disabled={disabled}>
                    {value ? value.label : placeholder}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command><CommandInput placeholder="Search..." /><CommandList><CommandEmpty>No results found.</CommandEmpty><CommandGroup>
                    {options.map((option) => (
                        <CommandItem key={option.value} onSelect={() => { onChange(option); setOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", value?.value === option.value ? "opacity-100" : "opacity-0")} />{option.label}
                        </CommandItem>
                    ))}
                </CommandGroup></CommandList></Command>
            </PopoverContent>
        </Popover>
    );
};

const TransferItemsTable = ({ items, onUpdate, onRemove }: { items: TransferItem[], onUpdate: (index: number, qty: number) => void, onRemove: (variantId: number) => void }) => {
    if (items.length === 0) {
        return <div className="text-center text-sm text-muted-foreground p-8 border-2 border-dashed rounded-md">No products added to the transfer list.</div>;
    }
    return (
        <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="w-[150px]">Quantity</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
            <TableBody>
                {items.map((item, index) => (
                    <TableRow key={item.variant_id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell><Input type="number" min="1" value={item.quantity} onChange={e => onUpdate(index, Number(e.target.value))} className="max-w-[120px]" /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => onRemove(item.variant_id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const StockTransferSkeleton = () => (
    <Card>
        <CardHeader><CardTitle>Create Stock Transfer</CardTitle><CardDescription>Move inventory between your warehouse and retail locations.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Label>Add Products to Transfer</Label><div className="flex gap-2"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-20" /></div></div>
            <Skeleton className="h-32 w-full" />
            <div className="flex justify-end mt-6"><Skeleton className="h-12 w-48" /></div>
        </CardContent>
    </Card>
);

export default function StockTransfer() {
    const queryClient = useQueryClient();
    const [sourceLocation, setSourceLocation] = useState<Option | null>(null);
    const [destLocation, setDestLocation] = useState<Option | null>(null);
    const [items, setItems] = useState<TransferItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Option | null>(null);
    
    const { data: prereqs, isLoading, isError, error, refetch } = useQuery({ queryKey: ['transferPrereqs'], queryFn: fetchTransferPrereqs });

    const mutation = useMutation({
        mutationFn: createStockTransfer,
        onSuccess: () => {
            toast.success("Stock transfer created successfully!");
            setSourceLocation(null);
            setDestLocation(null);
            setItems([]);
            queryClient.invalidateQueries({ queryKey: ['stock_transfers'] }); // Example of invalidating queries
        },
        onError: (err: Error) => toast.error(`Failed to create transfer: ${err.message}`),
    });

    const destinationOptions = useMemo(() => prereqs?.locations.filter(l => l.value !== sourceLocation?.value) || [], [prereqs, sourceLocation]);
    const productOptions = useMemo(() => prereqs?.products.filter(p => !items.some(i => i.variant_id === p.value)) || [], [prereqs, items]);

    const handleAddItem = () => {
        if (!selectedProduct) return;
        setItems(prev => [...prev, { variant_id: selectedProduct.value, name: selectedProduct.label, quantity: 1 }]);
        setSelectedProduct(null);
    };

    const handleUpdateQuantity = (index: number, qty: number) => {
        const newItems = [...items];
        newItems[index].quantity = qty > 0 ? qty : 1;
        setItems(newItems);
    };

    const handleRemoveItem = (variantId: number) => {
        setItems(prev => prev.filter(i => i.variant_id !== variantId));
    };

    const handleSubmit = () => {
        if (!sourceLocation || !destLocation) return toast.error("Please select a source and destination location.");
        if (items.length === 0) return toast.error("Please add at least one product to the transfer list.");
        if (sourceLocation.value === destLocation.value) return toast.error("Source and destination cannot be the same.");
        
        mutation.mutate({
            header: { source_location_id: sourceLocation.value, destination_location_id: destLocation.value },
            items: items,
        });
    };

    if (isLoading) return <StockTransferSkeleton />;
    if (isError) return (
        <div className="flex flex-col items-center justify-center text-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-xl font-semibold">Could not load required data.</h2>
            <p className="mt-2 text-muted-foreground">{(error as Error).message}</p>
            <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
        </div>
    );

    const isFormDisabled = !sourceLocation || !destLocation;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Stock Transfer</CardTitle>
                <CardDescription>Move inventory between your warehouse and retail locations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>From (Source)</Label><Combobox options={prereqs?.locations || []} value={sourceLocation} onChange={setSourceLocation} placeholder="Select source..." /></div>
                    <div className="space-y-2"><Label>To (Destination)</Label><Combobox options={destinationOptions} value={destLocation} onChange={setDestLocation} placeholder="Select destination..." /></div>
                </div>

                <div className={cn("space-y-4 border-t pt-6", isFormDisabled && "opacity-50 pointer-events-none")}>
                    <div className="space-y-2"><Label>Add Products to Transfer</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1"><Combobox options={productOptions} value={selectedProduct} onChange={setSelectedProduct} placeholder="Search for a product..." /></div>
                            <Button onClick={handleAddItem} disabled={!selectedProduct}><PlusCircle className="mr-2 h-4 w-4" />Add Product</Button>
                        </div>
                    </div>
                    <TransferItemsTable items={items} onUpdate={handleUpdateQuantity} onRemove={handleRemoveItem} />
                </div>
                
                <div className="flex justify-end mt-6">
                    <Button size="lg" onClick={handleSubmit} disabled={mutation.isPending || items.length === 0}>
                        {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Transfer...</> : "Create Stock Transfer"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}