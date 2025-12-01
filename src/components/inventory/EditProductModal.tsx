'use client';

import { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Loader2, Save, Package, Layers, Plus, Trash2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Category, ProductRow } from '@/types/dashboard';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// --- Types ---

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
}

interface Variant {
  id: string; // Can be "new_123" for new items
  sku: string | null;
  price: number;
  cost_price: number;
  stock_quantity: number;
  attributes: Record<string, string>;
  uom_id: string | null;
  isNew?: boolean; // Helper flag for UI
}

interface ProductDetails {
  id: number;
  name: string;
  category_id: string | null;
  uom_id: string | null;
  variants: Variant[];
}

interface EditProductModalProps {
  product: ProductRow | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

// --- Fetch Logic ---

async function fetchProductDetails(productId: string): Promise<ProductDetails> {
  const supabase = createClient();
  
  const { data: prod, error: prodError } = await supabase
    .from('products')
    .select('*') 
    .eq('id', productId)
    .single();

  if (prodError) throw new Error(prodError.message);

  const { data: variants, error: varError } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (varError) throw new Error(varError.message);

  return {
    id: prod.id,
    name: prod.name,
    category_id: prod.category_id ? String(prod.category_id) : null,
    uom_id: prod.uom_id ? String(prod.uom_id) : null,
    variants: variants.map((v: any) => ({
      id: String(v.id),
      sku: v.sku || '',
      price: v.price || 0,
      cost_price: v.cost_price || 0,
      stock_quantity: v.stock_quantity || 0,
      attributes: v.attributes || {},
      uom_id: v.uom_id ? String(v.uom_id) : null
    }))
  };
}

// --- Main Component ---

export default function EditProductModal({ product, isOpen, onClose, categories }: EditProductModalProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  
  const [formData, setFormData] = useState<ProductDetails | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  // Fetch Units
  const { data: units } = useQuery({
    queryKey: ['unitsOfMeasure'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units_of_measure').select('id, name, abbreviation');
      if (error) throw error;
      return (data || []) as Unit[];
    },
    enabled: isOpen,
  });

  // Fetch Product Data
  const { data: productDetails, isLoading, isError } = useQuery({
    queryKey: ['productDetails', product?.id],
    queryFn: () => fetchProductDetails(String(product!.id)),
    enabled: isOpen && !!product?.id,
  });

  useEffect(() => {
    if (productDetails) {
      setFormData(productDetails);
    }
  }, [productDetails]);

  // Update Mutation (Uses V3 RPC)
  const { mutate: updateProduct, isPending: isUpdating } = useMutation({
    mutationFn: async (data: ProductDetails) => {
      // Use V3 RPC that supports UPSERT
      const { error } = await supabase.rpc('update_product_and_variants_v3', {
        p_product_id: data.id,
        p_name: data.name,
        p_category_id: data.category_id ? Number(data.category_id) : null,
        p_uom_id: data.uom_id ? Number(data.uom_id) : null,
        p_variants: data.variants // Passes both old (with ID) and new (temp ID) variants
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved successfully");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      queryClient.invalidateQueries({ queryKey: ['productDetails'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message || "Failed to save")
  });

  // --- UI Handlers ---

  const handleVariantChange = (index: number, field: keyof Variant, value: any) => {
    if (!formData) return;
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const handleAddVariant = () => {
    if (!formData) return;
    // Create a temporary variant
    const newVariant: Variant = {
      id: `new_${Date.now()}`, // Temp ID, handled by RPC
      sku: '',
      price: 0,
      cost_price: 0,
      stock_quantity: 0,
      attributes: { "Name": "New Variant" }, // Default attribute
      uom_id: formData.uom_id,
      isNew: true
    };
    
    setFormData({
      ...formData,
      variants: [...formData.variants, newVariant]
    });
  };

  const handleDeleteVariant = (index: number) => {
    if (!formData) return;
    const variantToRemove = formData.variants[index];
    
    // If it's a new unsaved variant, just remove from state
    if (variantToRemove.id.startsWith('new_')) {
       const newVariants = formData.variants.filter((_, i) => i !== index);
       setFormData({ ...formData, variants: newVariants });
       return;
    }

    // If it's an existing variant in DB, we should ideally mark it for deletion
    // For now, let's block deletion of existing items in this modal to be safe, 
    // or you can add a `deleted_at` logic to the RPC.
    toast.error("Cannot delete saved variants in this modal yet.");
  };

  // --- Render ---

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;
    if (isError) return <div className="text-destructive p-4 text-center">Unable to load product data.</div>;
    if (!formData) return null;

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1">
          <TabsTrigger value="general">
            <Package className="w-4 h-4 mr-2"/> General Info
          </TabsTrigger>
          <TabsTrigger value="variants">
            <Layers className="w-4 h-4 mr-2"/> Variants ({formData.variants.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General */}
        <TabsContent value="general" className="space-y-4 px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category_id || ''} onValueChange={v => setFormData({...formData, category_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Unit</Label>
                <Select value={formData.uom_id || ''} onValueChange={v => setFormData({...formData, uom_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {units?.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.abbreviation})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
        </TabsContent>

        {/* Tab 2: Variants */}
        <TabsContent value="variants" className="px-1 space-y-4">
          <div className="border rounded-md max-h-[400px] overflow-y-auto shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Variant Name / Attributes</TableHead>
                  <TableHead className="w-[100px]">Price</TableHead>
                  <TableHead className="w-[100px]">Cost</TableHead>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[80px]">Stock</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.variants.map((variant, idx) => {
                    const attrString = variant.attributes 
                        ? Object.entries(variant.attributes).map(([k,v]) => `${k}: ${v}`).join(', ') 
                        : '';
                    const displayName = attrString || variant.sku || 'Standard Variant';

                    return (
                        <TableRow key={variant.id || idx}>
                            <TableCell>
                                {variant.isNew ? (
                                    <Input 
                                      className="h-8 text-xs" 
                                      placeholder="e.g. Size: Large"
                                      value={variant.attributes["Name"] || ""} 
                                      onChange={(e) => {
                                         const newAttrs = { ...variant.attributes, "Name": e.target.value };
                                         handleVariantChange(idx, 'attributes', newAttrs);
                                      }}
                                    />
                                ) : (
                                    <span className="font-medium text-xs text-muted-foreground">{displayName}</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Input type="number" className="h-8 text-xs" 
                                    value={variant.price} 
                                    onChange={e => handleVariantChange(idx, 'price', Number(e.target.value))} />
                            </TableCell>
                            <TableCell>
                                <Input type="number" className="h-8 text-xs" 
                                    value={variant.cost_price} 
                                    onChange={e => handleVariantChange(idx, 'cost_price', Number(e.target.value))} />
                            </TableCell>
                            <TableCell>
                                <Input className="h-8 text-xs uppercase" 
                                    value={variant.sku || ''} 
                                    onChange={e => handleVariantChange(idx, 'sku', e.target.value)} />
                            </TableCell>
                            <TableCell>
                                <Input type="number" className="h-8 text-xs" 
                                    value={variant.stock_quantity} 
                                    onChange={e => handleVariantChange(idx, 'stock_quantity', Number(e.target.value))} />
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteVariant(idx)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
              </TableBody>
            </Table>
          </div>
          
          <Button onClick={handleAddVariant} variant="secondary" className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Add Variant
          </Button>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Modify product details and manage variants.</DialogDescription>
        </DialogHeader>
        <Separator className="my-2" />
        {renderContent()}
        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>Cancel</Button>
          <Button onClick={() => formData && updateProduct(formData)} disabled={isUpdating} className="min-w-[130px]">
            {isUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>} 
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}