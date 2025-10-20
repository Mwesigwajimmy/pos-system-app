'use client';
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // useQuery is no longer needed here
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2 } from 'lucide-react';
import { Select as UiSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- TYPE DEFINITIONS ---
interface Supplier { id: number; name: string; }
interface ProductOption { value: number; label: string; }
interface POItem { variant_id: number; name: string; quantity: number; unit_cost: number; }
interface ExchangeRate { currency_code: string; rate: number; }

// --- API FUNCTIONS ---
async function createPurchaseOrder(poData: any) {
    const supabase = createClient();
    // This RPC needs to be updated in your backend to accept currency fields
    const { data, error } = await supabase.rpc('create_purchase_order', poData);
    if (error) throw error;
    return data;
}

// --- COMPONENT ---
// Props are updated to accept initialRates from the server component
export default function CreatePOForm({ suppliers, products, initialRates }: { suppliers: Supplier[], products: {id: number; full_name: string}[], initialRates: ExchangeRate[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<POItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);

  // State for multi-currency, initialized with data passed from the server
  const [currency, setCurrency] = useState('UGX');
  const [exchangeRate, setExchangeRate] = useState(1);
  const rates = initialRates || []; // Use the pre-fetched rates

  const productOptions: ProductOption[] = products.map(p => ({ value: p.id, label: p.full_name }));

  const mutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (newPoId) => {
      toast.success(`Purchase Order #${newPoId} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      router.push('/purchases');
    },
    onError: (error: Error) => toast.error(`Failed to create PO: ${error.message}`),
  });

  const handleAddItem = () => {
    if (!selectedProduct) return;
    const existingItem = items.find(item => item.variant_id === selectedProduct.value);
    if (existingItem) {
      toast.error("Product already in the order. Please update the quantity instead.");
      return;
    }
    setItems([...items, { variant_id: selectedProduct.value, name: selectedProduct.label, quantity: 1, unit_cost: 0 }]);
    setSelectedProduct(null);
  };

  const handleUpdateItem = (index: number, field: 'quantity' | 'unit_cost', value: number) => {
    const newItems = [...items];
    newItems[index][field] = value < 0 ? 0 : value;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCost = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.quantity * item.unit_cost), 0);
  }, [items]);

  const handleCurrencyChange = (newCurrencyCode: string) => {
    setCurrency(newCurrencyCode);
    if (newCurrencyCode === 'UGX') {
      setExchangeRate(1);
      return;
    }
    const detectedRate = rates.find(r => r.currency_code === newCurrencyCode);
    if (detectedRate) {
      setExchangeRate(detectedRate.rate);
      toast.success(`Applied exchange rate for ${newCurrencyCode}: ${detectedRate.rate}`);
    } else {
      toast.error(`No exchange rate found for ${newCurrencyCode}. Please add one in settings.`);
      setExchangeRate(1); // Default back to 1 if no rate is found
    }
  };

  const handleSubmit = () => {
    if (!supplierId || items.length === 0) {
      toast.error("Please select a supplier and add at least one item.");
      return;
    }
    const poData = {
      p_supplier_id: supplierId,
      p_order_date: new Date().toISOString().split('T')[0],
      p_expected_delivery_date: null,
      p_notes: notes,
      p_currency_code: currency,
      p_exchange_rate: exchangeRate,
      p_items: items.map(({ variant_id, quantity, unit_cost }) => ({ variant_id, quantity, unit_cost })),
    };
    mutation.mutate(poData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <UiSelect onValueChange={(value) => setSupplierId(Number(value))}>
              <SelectTrigger><SelectValue placeholder="Select a supplier..." /></SelectTrigger>
              <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
            </UiSelect>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <UiSelect onValueChange={handleCurrencyChange} defaultValue={currency}>
                <SelectTrigger><SelectValue placeholder="Select currency..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="UGX">Ugandan Shilling (UGX)</SelectItem>
                    {rates?.map(rate => (
                        <SelectItem key={rate.currency_code} value={rate.currency_code}>
                            {rate.currency_code}
                        </SelectItem>
                    ))}
                </SelectContent>
            </UiSelect>
          </div>
          <div className="space-y-2">
              <Label>Applied Exchange Rate (to UGX)</Label>
              <Input type="number" value={exchangeRate} readOnly disabled />
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes for this order..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end mb-4">
            <div className="flex-1"><Label>Add Product</Label>
              <Select options={productOptions} value={selectedProduct} onChange={setSelectedProduct} placeholder="Search for a product by name or SKU..." isClearable />
            </div>
            <Button onClick={handleAddItem} disabled={!selectedProduct}>Add Item</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="w-24">Quantity</TableHead><TableHead className="w-32">Unit Cost ({currency})</TableHead><TableHead className="w-32 text-right">Subtotal</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.length > 0 ? items.map((item, index) => (
                  <TableRow key={item.variant_id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Input type="number" value={item.quantity} onChange={e => handleUpdateItem(index, 'quantity', Number(e.target.value))} className="w-20" /></TableCell>
                    <TableCell><Input type="number" step="any" value={item.unit_cost} onChange={e => handleUpdateItem(index, 'unit_cost', Number(e.target.value))} className="w-28" /></TableCell>
                    <TableCell className="text-right font-medium">{currency} {(item.quantity * item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No items added to the order yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center bg-background p-4 rounded-lg sticky bottom-0 border">
        <div className="text-2xl font-bold">Total: {currency} {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <Button size="lg" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Purchase Order"}
        </Button>
      </div>
    </div>
  );
}