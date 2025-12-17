'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Save, Plus, ArrowLeft } from 'lucide-react';

interface ProductOption { value: number; label: string; }
interface AdjustmentItem { variant_id: number; name: string; quantity_change: number; }

async function fetchProductsForSelect(): Promise<{id: number; full_name: string}[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_product_variants_list');
    if (error) throw new Error("Could not fetch product variants.");
    return data.map((p: any) => ({ id: p.variant_id, full_name: `${p.product_name} - ${p.variant_name}` }));
}

async function createStockAdjustment(adjData: any) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('process_stock_adjustment_v2', adjData);
    if (error) throw error;
    return data;
}

export default function BulkStockAdjustmentForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);

  const { data: products, isLoading: isLoadingProducts } = useQuery({ 
    queryKey: ['productsForSelect'], 
    queryFn: fetchProductsForSelect,
    staleTime: 1000 * 60 * 5
  });
  
  const productOptions: ProductOption[] = useMemo(() => products?.map(p => ({ value: p.id, label: p.full_name })) || [], [products]);

  const mutation = useMutation({
    mutationFn: createStockAdjustment,
    onSuccess: (newAdjId) => {
      toast.success(`Stock Adjustment #${newAdjId} recorded successfully.`);
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      router.push('/inventory');
    },
    onError: (error) => toast.error(`Failed to record adjustment: ${error.message}`),
  });

  const handleAddItem = () => {
    if (!selectedProduct) return;
    if (items.find(item => item.variant_id === selectedProduct.value)) {
      toast.error("This product is already in the adjustment list.");
      return;
    }
    setItems([...items, { variant_id: selectedProduct.value, name: selectedProduct.label, quantity_change: 1 }]);
    setSelectedProduct(null);
  };

  const handleUpdateQuantity = (index: number, value: number) => {
    const newItems = [...items];
    newItems[index].quantity_change = value;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("A reason for the adjustment is required.");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one product to adjust.");
      return;
    }
    if (items.some(i => i.quantity_change === 0)) {
        toast.error("All items must have a non-zero quantity change.");
        return;
    }

    const adjData = {
      p_reason: reason,
      p_notes: notes,
      p_items: items.map(({ variant_id, quantity_change }) => ({ variant_id, quantity_change })),
    };
    mutation.mutate(adjData);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Stock Adjustment</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-foreground/80">Reason (Required)</Label>
            <Input 
                placeholder="e.g., Cycle Count, Damaged Goods, Received Stock" 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground/80">Notes (Optional)</Label>
            <Textarea 
                placeholder="Additional details for audit trail..." 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                className="bg-background resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items to Adjust</CardTitle>
            <span className="text-sm text-muted-foreground">{items.length} items added</span>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-6 p-4 bg-muted/20 rounded-lg border">
            <div className="flex-1 w-full space-y-2">
                <Label>Search Product</Label>
                <Select 
                    options={productOptions} 
                    value={selectedProduct} 
                    onChange={setSelectedProduct} 
                    isLoading={isLoadingProducts} 
                    placeholder="Type name or SKU..." 
                    isClearable
                    className="text-sm"
                    classNames={{
                        control: () => "!bg-background !border-input !rounded-md !min-h-[2.5rem]",
                        menu: () => "!bg-popover !border !border-border !shadow-md",
                        option: (state) => state.isFocused ? "!bg-accent !text-accent-foreground" : "!text-foreground"
                    }}
                />
            </div>
            <Button onClick={handleAddItem} disabled={!selectedProduct} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Add to List
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[50%]">Product Details</TableHead>
                        <TableHead className="w-[30%]">Quantity Change</TableHead>
                        <TableHead className="w-[20%] text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                            No items added yet. Search and add products above.
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((item, index) => (
                        <TableRow key={item.variant_id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    value={item.quantity_change} 
                                    onChange={e => handleUpdateQuantity(index, parseInt(e.target.value) || 0)} 
                                    className={item.quantity_change < 0 ? "text-destructive font-bold" : "text-green-600 font-bold"}
                                    placeholder="0"
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {item.quantity_change > 0 ? "Adding" : item.quantity_change < 0 ? "Removing" : "-"}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" size="lg" onClick={() => router.back()}>Cancel</Button>
        <Button size="lg" onClick={handleSubmit} disabled={mutation.isPending || items.length === 0} className="min-w-[150px]">
          {mutation.isPending ? "Processing..." : (
              <>
                <Save className="w-4 h-4 mr-2" /> Complete Adjustment
              </>
          )}
        </Button>
      </div>
    </div>
  );
}