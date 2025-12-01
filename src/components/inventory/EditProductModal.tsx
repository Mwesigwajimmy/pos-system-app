'use client';

import { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save, AlertTriangle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Category, ProductRow } from '@/types/dashboard';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// --- Enterprise Data Types ---

// Detailed interface that strictly matches the database schema + UI requirements.
// We extend ProductRow to ensure compatibility with the parent table.
interface ProductDetails extends Omit<ProductRow, 'category'> {
  // Parent Product Fields
  category_id: string | null; // Mapped to string for Select component compatibility
  image_url?: string | null;  // Explicitly defined to prevent TS errors
  
  // Explicitly define category to satisfy the interface check
  category: Category | null;

  // Primary Variant Specific Fields
  variant_id: string; 
  variant_name: string; 
  price: number;
  cost_price: number;
  sku: string | null;
  barcode: string | null;
  low_stock_threshold: number;
  
  // Advanced Inventory / UOM Fields
  uom_id: string | null;
  measurement_value: number;
  
  // Override stock to ensure it matches the specific usage in the modal
  stock: number;
}

interface EditProductModalProps {
  product: ProductRow | null; // The row object passed from the DataTable
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

interface Unit {
  id: string;
  name: string;
  symbol: string;
}

// --- Server-Side Data Fetching Logic ---

/**
 * Fetches the full object graph for a product.
 * In an Enterprise system, a Product is a Container for Variants.
 * This function retrieves the Parent Product and its Primary Variant securely.
 */
async function fetchProductDetails(productId: string): Promise<ProductDetails> {
  const supabase = createClient();
  
  // 1. Fetch Parent Product Entity with Category Join
  // Updated select to '*, category(*)' to ensure the category object is actually returned
  const { data: prod, error: prodError } = await supabase
    .from('products')
    .select('*, category(*)') 
    .eq('id', productId)
    .single();

  if (prodError) {
    console.error("Critical: Failed to fetch parent product", prodError);
    throw new Error(`System Error: ${prodError.message}`);
  }

  // 2. Fetch the Primary Variant securely
  // We order by ID or Created_At to ensure we always get the "Master" variant deterministically.
  const { data: variants, error: varError } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true }) // Enterprise: Ensure deterministic result
    .limit(1);

  if (varError) {
    console.error("Critical: Failed to fetch product variants", varError);
    throw new Error(`Variant Error: ${varError.message}`);
  }

  // Handle Data Inconsistency: 
  // If a product exists but has no variants (e.g. data migration error), we create a "Virtual" empty variant 
  // so the form doesn't crash and the user can "fix" the product by saving.
  const primaryVariant = variants && variants.length > 0 ? variants[0] : null;

  // Helper to safely extract category object (Supabase can return array or object depending on relation type)
  const categoryData = Array.isArray(prod.category) ? prod.category[0] : prod.category;

  // 3. Data Transformation Layer
  return {
    // Parent Data
    id: Number(prod.id), 
    name: prod.name,
    image_url: prod.image_url || null,
    
    // Explicitly casting the joined category object
    category: categoryData || null,
    
    // --- REQUIRED BY PRODUCTROW INTERFACE ---
    // These fields are missing in the raw select but required by the Type definition.
    // We populate them with safe defaults or derived values.
    category_name: categoryData?.name || '',
    total_stock: 0, // Stock is computed dynamically via inventory ledger
    variants_count: variants ? variants.length : 0,
    // ----------------------------------------

    stock: 0, // Local stock reference
    
    // Form Field Mapping (BigInt -> String for React Inputs)
    category_id: prod.category_id ? String(prod.category_id) : null,
    
    // Variant Data (With Fallbacks for robustness)
    variant_id: primaryVariant ? String(primaryVariant.id) : '',
    variant_name: primaryVariant?.sku || 'Standard', 
    price: primaryVariant?.price || 0,
    cost_price: primaryVariant?.cost_price || 0,
    sku: primaryVariant?.sku || '',
    barcode: primaryVariant?.barcode || '',
    low_stock_threshold: primaryVariant?.low_stock_threshold || 5,
    uom_id: primaryVariant?.uom_id || null,
    measurement_value: primaryVariant?.measurement_value || 1,
  };
}

// --- Main Component ---

export default function EditProductModal({ product, isOpen, onClose, categories }: EditProductModalProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  
  // Form State
  const [formData, setFormData] = useState<Partial<ProductDetails>>({});

  // 1. Fetch Reference Data: Units of Measure
  const { data: units } = useQuery({
    queryKey: ['unitsOfMeasure'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units_of_measure').select('id, name, symbol');
      if (error) throw error;
      return (data || []) as Unit[];
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // 2. Fetch Transactional Data: Product Details
  const { data: productDetails, isLoading, isError, error } = useQuery({
    queryKey: ['productDetails', product?.id],
    queryFn: () => fetchProductDetails(String(product!.id)),
    enabled: isOpen && !!product?.id,
    retry: 1, // Don't retry indefinitely on 404s
  });

  // 3. Hydrate Form State
  useEffect(() => {
    if (productDetails) {
      setFormData(productDetails);
    }
  }, [productDetails]);

  // 4. Update Mutation (Atomic Transaction Logic)
  const { mutate: updateProduct, isPending: isUpdating } = useMutation({
    mutationFn: async (updatedData: Partial<ProductDetails>) => {
      if (!updatedData.id) throw new Error("Invalid Context: Missing Product ID");

      // Step A: Update Parent Product Metadata
      const { error: prodError } = await supabase
        .from('products')
        .update({
          name: updatedData.name,
          image_url: updatedData.image_url,
          category_id: updatedData.category_id ? Number(updatedData.category_id) : null
        })
        .eq('id', updatedData.id);

      if (prodError) throw new Error(`Failed to update Product: ${prodError.message}`);

      // Step B: Update or Create Primary Variant
      // If variant_id exists, we update. If we are fixing a broken product, we might insert (logic simplified for Edit mode).
      if (updatedData.variant_id) {
        const { error: varError } = await supabase
          .from('product_variants')
          .update({
            sku: updatedData.sku,
            barcode: updatedData.barcode,
            price: updatedData.price,
            cost_price: updatedData.cost_price,
            low_stock_threshold: updatedData.low_stock_threshold,
            uom_id: updatedData.uom_id,
            measurement_value: updatedData.measurement_value
          })
          .eq('id', updatedData.variant_id);

        if (varError) throw new Error(`Failed to update Variant: ${varError.message}`);
      } else {
        // Fallback: This is a robust system. If the product had NO variant, we create one now to fix the data.
        const { error: createVarError } = await supabase
          .from('product_variants')
          .insert({
            product_id: updatedData.id,
            sku: updatedData.sku,
            price: updatedData.price,
            // Add other defaults as necessary
          });
          
        if (createVarError) throw new Error(`Failed to auto-repair Product Variant: ${createVarError.message}`);
      }
    },
    onSuccess: () => {
      toast.success(`Product "${formData.name}" saved successfully.`);
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      queryClient.invalidateQueries({ queryKey: ['productDetails'] });
      onClose();
    },
    onError: (err) => {
      console.error(err);
      toast.error(`Save operation failed. Please try again.`);
    },
  });

  // --- Handlers ---

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value,
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData && formData.id) {
      updateProduct(formData);
    } else {
      toast.error("System Error: Form context is invalid.");
    }
  };

  // --- Render Logic ---

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">Retrieving secure product data...</p>
        </div>
      );
    }
    
    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-8 text-destructive space-y-3 bg-destructive/5 rounded-md border border-destructive/20">
          <AlertTriangle className="h-10 w-10" />
          <div className="text-center">
            <p className="font-semibold text-lg">Unable to load details</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{error.message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry Connection</Button>
        </div>
      );
    }

    if (productDetails) {
      return (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Group 1: Core Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">Product Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="mb-1.5 block">Product Name <span className="text-destructive">*</span></Label>
                <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required className="bg-background" />
              </div>
              <div>
                <Label htmlFor="category_id" className="mb-1.5 block">Category</Label>
                <Select 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, category_id: val }))} 
                  value={String(formData.category_id || '')}
                >
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Uncategorized</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Group 2: Advanced Measurements (UOM) */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">Measurements & Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="uom_id" className="mb-1.5 block">Unit of Measure</Label>
                <Select 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, uom_id: val }))} 
                  value={formData.uom_id || ''}
                >
                  <SelectTrigger className="bg-background"><SelectValue placeholder="e.g. Pcs, Kg, L" /></SelectTrigger>
                  <SelectContent>
                    {units?.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Defines how this product is stocked and sold.</p>
              </div>
              <div>
                <Label htmlFor="measurement_value" className="mb-1.5 block">Standard Value / Weight</Label>
                <Input 
                  id="measurement_value" 
                  name="measurement_value" 
                  type="number" 
                  step="0.0001" // High precision for chemical/medical
                  value={formData.measurement_value} 
                  onChange={handleChange} 
                  placeholder="e.g. 500 (for 500ml)"
                  className="bg-background"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Multiplier for the unit (e.g. 0.75 for 750ml).</p>
              </div>
            </div>
          </div>

          {/* Group 3: Financials & Tracking */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">Financials & Inventory</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="mb-1.5 block">Selling Price (UGX)</Label>
                <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} className="font-mono font-medium bg-background" />
              </div>
              <div>
                <Label htmlFor="cost_price" className="mb-1.5 block">Cost Price (UGX)</Label>
                <Input id="cost_price" name="cost_price" type="number" value={formData.cost_price} onChange={handleChange} className="font-mono bg-background" />
              </div>
              <div>
                <Label htmlFor="sku" className="mb-1.5 block">SKU Code</Label>
                <Input id="sku" name="sku" value={formData.sku || ''} onChange={handleChange} className="uppercase font-mono bg-background" placeholder="AUTO-GEN" />
              </div>
              <div>
                <Label htmlFor="low_stock_threshold" className="mb-1.5 block">Low Stock Alert Level</Label>
                <Input id="low_stock_threshold" name="low_stock_threshold" type="number" value={formData.low_stock_threshold} onChange={handleChange} className="bg-background" />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>Cancel</Button>
            <Button type="submit" disabled={isUpdating} className="min-w-[140px] shadow-sm">
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Edit Product Details</DialogTitle>
          <DialogDescription>
            Manage core attributes, pricing logic, and inventory settings for <strong>{product?.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-2" />
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}