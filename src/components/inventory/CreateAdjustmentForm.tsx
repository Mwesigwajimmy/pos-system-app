'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { ProductRow, Category } from '@/types/dashboard';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  Save, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateAdjustmentFormProps {
  product: ProductRow | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

interface AdjustmentPayload {
  p_product_id: number;
  p_quantity: number;
  p_reason: string;
}

// Enterprise RPC Call
async function createSingleItemAdjustment(adjData: AdjustmentPayload) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_stock_adjustment', adjData);
  if (error) throw new Error(error.message);
  return data;
}

export default function CreateAdjustmentForm({ product, isOpen, onClose }: CreateAdjustmentFormProps) {
  const queryClient = useQueryClient();
  
  // State: Managed as string to allow typing "-" for negatives smoothly
  const [quantity, setQuantity] = useState<string>(''); 
  const [reason, setReason] = useState('');

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setReason('');
    }
  }, [isOpen]);

  // Derived Values for UI Feedback
  // Safely parse the input string to a number for calculations
  const parsedQuantity = parseFloat(quantity);
  const adjustmentVal = isNaN(parsedQuantity) ? 0 : parsedQuantity;
  
  const currentStock = Number(product?.total_stock || 0);
  const projectedStock = currentStock + adjustmentVal;
  const isAddition = adjustmentVal > 0;
  const isReduction = adjustmentVal < 0;

  // Mutation
  const { mutate: submitAdjustment, isPending } = useMutation({
    mutationFn: createSingleItemAdjustment,
    onSuccess: () => {
      toast.success("Stock adjustment successfully recorded.");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      onClose();
    },
    onError: (err) => {
      toast.error(`Adjustment failed: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    // Final validation before sending
    if (adjustmentVal === 0) {
      toast.error("Adjustment quantity cannot be zero.");
      return;
    }
    if (!reason.trim()) {
        toast.error("An audit reason is required for compliance.");
        return;
    }

    submitAdjustment({
      p_product_id: product.id,
      p_quantity: adjustmentVal,
      p_reason: reason.trim(),
    });
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isPending && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
             Adjust Stock: <span className="text-primary">{product.name}</span>
          </DialogTitle>
          <DialogDescription>
            Record a manual stock adjustment. This action will be logged in the audit trail.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} id="adjustment-form" className="space-y-6 py-4">
          
          {/* STOCK SUMMARY CARD */}
          <div className="bg-muted/30 border rounded-lg p-4 flex items-center justify-between text-center">
            <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Current</p>
                <p className="text-2xl font-bold">{currentStock}</p>
            </div>
            
            <div className="flex flex-col items-center justify-center px-4">
               <ArrowRight className="text-muted-foreground w-5 h-5" />
               <span className={cn(
                   "text-xs font-bold mt-1",
                   isAddition ? "text-green-600" : isReduction ? "text-red-600" : "text-muted-foreground"
               )}>
                   {adjustmentVal > 0 ? `+${adjustmentVal}` : adjustmentVal || 0}
               </span>
            </div>

            <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">New Stock</p>
                <p className={cn(
                    "text-2xl font-bold",
                    projectedStock < 0 ? "text-destructive" : "text-foreground"
                )}>
                    {projectedStock}
                </p>
            </div>
          </div>

          {/* WARNING FOR NEGATIVE STOCK */}
          {projectedStock < 0 && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>Warning: This adjustment will result in negative inventory levels ({projectedStock}).</p>
              </div>
          )}

          {/* INPUTS */}
          <div className="grid gap-5">
            <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity Change</Label>
                <div className="relative">
                    <Input
                        id="quantity"
                        type="number"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        autoFocus
                        className={cn(
                            "pl-10 font-mono text-lg",
                            isAddition ? "border-green-500 focus-visible:ring-green-500" : 
                            isReduction ? "border-red-500 focus-visible:ring-red-500" : ""
                        )}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {isAddition ? <TrendingUp className="w-4 h-4 text-green-600" /> : 
                         isReduction ? <TrendingDown className="w-4 h-4 text-red-600" /> : 
                         <span className="text-muted-foreground">#</span>}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Enter positive values for received stock, negative for damage/loss.
                </p>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="reason">Adjustment Reason <span className="text-destructive">*</span></Label>
                <Textarea
                    id="reason"
                    className="resize-none"
                    placeholder="Describe why this adjustment is being made (e.g., 'Found damaged during monthly audit')"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                />
            </div>
          </div>

        </form>
        
        <DialogFooter className="sm:justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground hidden sm:block">
              {product.business_entity_name ? `Branch: ${product.business_entity_name}` : 'Main Entity'}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
            </Button>
            <Button 
                type="submit" 
                form="adjustment-form" 
                disabled={isPending || !quantity || !reason || adjustmentVal === 0}
                variant={isReduction ? "destructive" : "default"}
            >
                {isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4 mr-2" /> Confirm Adjustment
                    </>
                )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}