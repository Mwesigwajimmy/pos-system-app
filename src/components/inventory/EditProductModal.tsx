// ./src/components/inventory/EditProductModal.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Category, ProductRow } from '@/types/dashboard';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define the shape of the detailed data we expect from the server.
interface ProductDetails extends ProductRow {
  variant_id: bigint;
  variant_name: string;
  price: number;
  cost_price: number | null;
  sku: string | null;
  category_id: bigint | null; // <-- FIX: Added category_id to the interface
}

// Define the component's props for clarity and type safety.
interface EditProductModalProps {
  product: ProductRow | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

/**
 * Fetches the detailed information for a single product, including its primary variant.
 * @param productId - The ID of the product to fetch (as a bigint).
 * @returns A promise resolving to the product details.
 */
async function fetchProductDetails(productId: bigint): Promise<ProductDetails> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc('get_product_details_for_edit', { p_product_id: productId })
    .single();
  if (error) throw new Error(error.message);
  return data as ProductDetails;
}

/**
 * A modal dialog for editing the core details of a product and its primary variant.
 * It fetches the latest product data when opened and handles the update mutation.
 */
export default function EditProductModal({ product, isOpen, onClose, categories }: EditProductModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<ProductDetails>>({});

  // Fetch product details when the modal is open.
  const { data: productDetails, isLoading, isError, error } = useQuery({
    queryKey: ['productDetails', product?.id],
    queryFn: () => fetchProductDetails(BigInt(product!.id)),
    enabled: isOpen && !!product?.id,
  });

  // Effect to populate the form state once data is successfully fetched.
  useEffect(() => {
    if (productDetails) {
      setFormData(productDetails);
    }
  }, [productDetails]);

  // Mutation for submitting the updated product data.
  const { mutate: updateProduct, isPending: isUpdating } = useMutation({
    // The mutation function must be async and await the Supabase call.
    // It should throw an error on failure to trigger the `onError` callback.
    mutationFn: async (updatedData: ProductDetails) => {
      const supabase = createClient();
      const { error } = await supabase.rpc('update_product_and_variant', {
        p_product_id: updatedData.id,
        p_variant_id: updatedData.variant_id,
        p_product_name: updatedData.name,
        p_category_id: updatedData.category_id,
        p_variant_name: updatedData.variant_name,
        p_price: updatedData.price,
        p_cost_price: updatedData.cost_price,
        p_sku: updatedData.sku,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Product "${variables.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      queryClient.invalidateQueries({ queryKey: ['productDetails', variables.id] });
      onClose();
    },
    onError: (err) => {
      toast.error(`Failed to update product: ${err.message}`);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };
  
  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({
        ...prev,
        category_id: value ? BigInt(value) : null
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData && formData.id && formData.variant_id) {
      updateProduct(formData as ProductDetails);
    } else {
        toast.error("Form data is incomplete. Cannot submit.");
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    if (isError) {
      return <div className="text-destructive p-4">Error: {error.message}. Please close and try again.</div>;
    }
    if (productDetails) {
      return (
        <form onSubmit={handleSubmit} key={productDetails.id}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="category_id">Category</Label>
              <Select onValueChange={handleCategoryChange} value={String(formData.category_id || '')}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">N/A</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="variant_name">Variant Name</Label>
              <Input id="variant_name" name="variant_name" value={formData.variant_name || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="price">Selling Price (UGX)</Label>
              <Input id="price" name="price" type="number" value={formData.price || 0} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="cost_price">Cost Price (UGX)</Label>
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
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit: {product?.name}</DialogTitle>
          <DialogDescription>Update the details for this product and its primary variant.</DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}