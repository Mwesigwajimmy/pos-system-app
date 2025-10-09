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
import { Trash2 } from 'lucide-react';

interface ProductOption { value: number; label: string; }
interface AdjustmentItem { variant_id: number; name: string; quantity_change: number; }

async function fetchProductsForSelect(): Promise<{id: number; full_name: string}[]> {
    const supabase = createClient();
    // In a real app, this would be a dedicated function, but for now we reuse the POS one
    const { data, error } = await supabase.rpc('get_sellable_products');
    if (error) throw new Error("Could not fetch products.");
    return data.map((p: any) => ({ id: p.variant_id, full_name: `${p.product_name} - ${p.variant_name}` }));
}

async function createStockAdjustment(adjData: any) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('process_stock_adjustment', adjData);
    if (error) throw error;
    return data;
}

export default function CreateAdjustmentForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);

  const { data: products, isLoading: isLoadingProducts } = useQuery({ queryKey: ['productsForSelect'], queryFn: fetchProductsForSelect });
  const productOptions: ProductOption[] = useMemo(() => products?.map(p => ({ value: p.id, label: p.full_name })) || [], [products]);

  const mutation = useMutation({
    mutationFn: createStockAdjustment,
    onSuccess: (newAdjId) => {
      toast.success(`Stock Adjustment #${newAdjId} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate main inventory list
      router.push('/inventory');
    },
    onError: (error) => toast.error(`Failed to create adjustment: ${error.message}`),
  });

  const handleAddItem = () => {
    if (!selectedProduct) return;
    if (items.find(item => item.variant_id === selectedProduct.value)) {
      toast.error("Product already in the list.");
      return;
    }
    setItems([...items, { variant_id: selectedProduct.value, name: selectedProduct.label, quantity_change: 0 }]);
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
    if (!reason || items.length === 0) {
      toast.error("Please provide a reason and add at least one item.");
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
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Adjustment Details</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Reason for Adjustment (Required)</Label>
            <Input placeholder="e.g., Annual Stock Count" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes for auditing..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Adjust Items</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end mb-4">
            <div className="flex-1"><Label>Add Product</Label><Select options={productOptions} value={selectedProduct} onChange={setSelectedProduct} isLoading={isLoadingProducts} placeholder="Search for a product..." isClearable /></div>
            <Button onClick={handleAddItem} disabled={!selectedProduct}>Add Item</Button>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="w-48">Quantity Change (+/-)</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.variant_id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell><Input type="number" value={item.quantity_change} onChange={e => handleUpdateQuantity(index, Number(e.target.value))} placeholder="e.g., -5 or 10" /></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save Stock Adjustment"}
        </Button>
      </div>
    </div>
  );
}