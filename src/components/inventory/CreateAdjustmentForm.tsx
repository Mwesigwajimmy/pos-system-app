// ./src/components/inventory/CreateAdjustmentForm.tsx  (This is the NEW file)

'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ProductRow, Category } from '@/types/dashboard';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Define the props this modal receives from the data table
interface CreateAdjustmentFormProps {
  product: ProductRow | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

// Supabase RPC for a simple, single-item adjustment
async function createSingleItemAdjustment(adjData: { p_product_id: number, p_quantity: number, p_reason: string }) {
  const supabase = createClient();
  // NOTE: You may need to create or use a different RPC function for this simple case
  const { error } = await supabase.rpc('create_stock_adjustment', adjData);
  if (error) throw new Error(error.message);
  return { success: true };
}

export default function CreateAdjustmentForm({ product, isOpen, onClose }: CreateAdjustmentFormProps) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuantity(0);
      setReason('');
    }
  }, [isOpen]);
  
  const { mutate: submitAdjustment, isPending } = useMutation({
    mutationFn: createSingleItemAdjustment,
    onSuccess: () => {
      toast.success("Stock adjustment created successfully.");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      queryClient.invalidateQueries({ queryKey: ['productDetails', product?.id] });
      onClose();
    },
    onError: (err) => toast.error(`Adjustment failed: ${err.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || quantity === 0) {
      toast.error("Please enter a valid, non-zero quantity.");
      return;
    }
    submitAdjustment({
      p_product_id: product.id,
      p_quantity: quantity,
      p_reason: reason,
    });
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock: {product.name}</DialogTitle>
          <DialogDescription>
            Current stock: {product.total_stock ?? 'N/A'}. Enter a positive value to add stock, or a negative value to remove it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="adjustment-form" className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">Quantity Change</Label>
            <Input
              id="quantity"
              type="number"
              className="col-span-3"
              placeholder="e.g., -5 or 10"
              value={quantity === 0 ? '' : quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">Reason</Label>
            <Textarea
              id="reason"
              className="col-span-3"
              placeholder="e.g., Damaged stock"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="submit" form="adjustment-form" disabled={isPending || !reason}>
            {isPending ? "Saving..." : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}