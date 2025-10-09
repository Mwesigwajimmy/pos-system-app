'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Category } from '@/types/dashboard';

interface EditProductModalProps {
  productId: bigint | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

interface ProductDetails {
  product_id: bigint;
  product_name: string;
  category_id: bigint | null;
  variant_id: bigint;
  variant_name: string;
  price: number;
  cost_price: number | null;
  sku: string | null;
}

export default function EditProductModal({ productId, isOpen, onClose, categories }: EditProductModalProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<ProductDetails>>({});

  const { data: productDetails, isLoading, isError, refetch } = useQuery({
    queryKey: ['productDetails', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .rpc('get_product_details_for_edit', { p_product_id: productId })
        .single();
      if (error) throw new Error(error.message);
      return data as ProductDetails;
    },
    enabled: false,
  });
  
  useEffect(() => {
    if (productDetails) {
      setFormData(productDetails);
    }
  }, [productDetails]);
  
  useEffect(() => {
    if (isOpen && productId) {
        refetch();
    }
  }, [isOpen, productId, refetch]);

  const { mutate: updateProduct, isPending: isUpdating } = useMutation({
    mutationFn: async (updatedData: ProductDetails) => {
      const { error } = await supabase.rpc('update_product_and_variant', {
        p_product_id: updatedData.product_id,
        p_variant_id: updatedData.variant_id,
        p_product_name: updatedData.product_name,
        p_category_id: updatedData.category_id,
        p_variant_name: updatedData.variant_name,
        p_price: updatedData.price,
        p_cost_price: updatedData.cost_price,
        p_sku: updatedData.sku,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Product updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['paginatedProducts'] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData && formData.product_id && formData.variant_id) {
      updateProduct(formData as ProductDetails);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update the details for this product and its primary variant.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : isError || !productDetails ? (
          <div className="text-destructive p-4">Failed to load product details. Please try again.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="product_name">Product Name</Label>
                <Input id="product_name" name="product_name" value={formData.product_name || ''} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="category_id">Category</Label>
                <select
                  id="category_id"
                  name="category_id"
                  // =========================================================================================
                  // THE DEFINITIVE FIX IS HERE:
                  // We convert the `category_id` (which can be a bigint) to a string before passing it
                  // as the value. This satisfies TypeScript and makes the dropdown work perfectly.
                  // =========================================================================================
                  value={String(formData.category_id || '')}
                  onChange={handleChange}
                  className="w-full h-10 border border-input bg-background px-3 py-2 text-sm rounded-md"
                >
                  <option value="">N/A</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="variant_name">Variant Name</Label>
                <Input id="variant_name" name="variant_name" value={formData.variant_name || ''} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="price">Selling Price</Label>
                <Input id="price" name="price" type="number" value={formData.price || 0} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="cost_price">Cost Price</Label>
                <Input id="cost_price" name="cost_price" type="number" value={formData.cost_price || 0} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="sku">SKU / Barcode</Label>
                <Input id="sku" name="sku" value={formData.sku || ''} onChange={handleChange} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>Cancel</Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}