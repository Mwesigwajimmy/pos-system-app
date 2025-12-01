'use client';

import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { 
  Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Trash, Wand2, Loader2, AlertCircle, Package, Layers 
} from 'lucide-react';
import { Category } from '@/types/dashboard';

// --- Enterprise Interfaces ---

interface Unit {
  id: number;
  name: string;
  abbreviation: string;
}

// Unified Variant Interface used for BOTH Simple and Multi modes
interface VariantDraft {
  name: string;
  sku: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  attributes: Record<string, string>;
  uom_id: number | null;
}

interface AttributeBuilder {
  name: string;
  inputValue: string; // Raw input (comma separated)
  values: string[];   // Parsed values
}

interface AddProductDialogProps {
  categories: Category[];
}

// Initial State for a "Simple" product (One Default Variant)
const DEFAULT_VARIANT: VariantDraft = {
  name: 'Standard',
  sku: '',
  price: 0,
  cost_price: 0,
  stock_quantity: 0,
  attributes: {},
  uom_id: null
};

export default function AddProductDialog({ categories }: AddProductDialogProps) {
  // --- Core Hooks ---
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // --- Reference Data State ---
  const [units, setUnits] = useState<Unit[]>([]);
  
  // --- Product Core State ---
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [uomId, setUomId] = useState<string | null>(null);
  
  // --- Mode Switching ---
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  
  // --- Unified Variant State (Single Source of Truth) ---
  // If isMultiVariant is false, we only use variants[0].
  // If isMultiVariant is true, we use the whole array.
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...DEFAULT_VARIANT }]);

  // --- Attribute Builder State (For Generator) ---
  const [attributes, setAttributes] = useState<AttributeBuilder[]>([
    { name: 'Size', inputValue: '', values: [] }
  ]);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState("configuration"); // configuration | generation | preview

  // --- Load Dependencies ---
  useEffect(() => {
    if (open) {
      const fetchUnits = async () => {
        const { data, error } = await supabase
          .from('units_of_measure')
          .select('id, name, abbreviation')
          .eq('status', 'active'); // Enterprise: Only show active units
        
        if (data) setUnits(data);
        if (error) console.error("Failed to load UOMs:", error);
      };
      fetchUnits();
    }
  }, [open]);

  // --- Logic: Variant Generation ---
  
  const generateVariants = () => {
    console.log("Starting Variant Generation Logic...");

    // 1. Parse and Validate Attributes
    const validAttributes = attributes
      .map(attr => ({
        ...attr,
        values: attr.inputValue.split(',').map(s => s.trim()).filter(Boolean)
      }))
      .filter(attr => attr.values.length > 0 && attr.name.trim() !== '');

    if (validAttributes.length === 0) {
      toast.error("Configuration Error: Please define at least one attribute with values (e.g. Size: S, M, L).");
      return;
    }

    // 2. Cartesian Product Algorithm (Combinatorics)
    const cartesian = (args: string[][]) => args.reduce(
      (a, b) => a.flatMap(d => b.map(e => [d, e].flat())), 
      [[]] as string[][]
    );
    
    // Fix: Handle the case of 1 attribute array correctly vs multiple
    const attrValues = validAttributes.map(a => a.values);
    
    // If we have only 1 attribute, cartesian logic needs a slight adjust or we map directly
    let combinations: string[][];
    if (validAttributes.length === 1) {
        combinations = attrValues[0].map(v => [v]);
    } else {
        // Standard cartesian for 2+ arrays
        // We use a simpler reduce for N arrays
        const combine = (head: string[], tail: string[][]): string[][] => {
             if (tail.length === 0) return head.map(x => [x]);
             const current = tail[0];
             const rest = tail.slice(1);
             const combinations = head.flatMap(h => current.map(c => [h, c].flat().join('###'))); // Use separator to flatten temporarily
             // This simple cartesian is getting complex for TS, let's use the proven reducer method:
             return [];
        };
        
        // Proven Cartesian One-Liner
        const cartesianProduct = (arr: any[]) => arr.reduce((a, b) => a.flatMap((c: any) => b.map((d: any) => [c, d].flat())));
        combinations = attrValues.length > 1 ? cartesianProduct(attrValues) : attrValues[0].map(v => [v]);
    }

    // 3. Construct Variant Drafts
    const newVariants: VariantDraft[] = combinations.map((combo) => {
      // Ensure combo is array
      const comboArr = Array.isArray(combo) ? combo : [combo];
      
      const attrMap: Record<string, string> = {};
      let nameParts: string[] = [];

      validAttributes.forEach((attr, idx) => {
        const val = comboArr[idx];
        attrMap[attr.name] = val;
        nameParts.push(val);
      });

      return {
        name: nameParts.join(' / '),
        sku: '', // User must fill or auto-gen later
        price: 0,
        cost_price: 0,
        stock_quantity: 0,
        attributes: attrMap,
        uom_id: null // Inherits from parent
      };
    });

    // 4. Update State & UI
    setVariants(newVariants);
    toast.success(`Success: Generated ${newVariants.length} variants.`);
    setActiveTab("preview"); // Automatically move to preview tab
  };

  // --- Logic: Data Mutation ---

  // Helper to update a specific variant in the array
  const updateVariant = (index: number, field: keyof VariantDraft, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  // Helper for Attribute Builder Inputs
  const updateAttributeInput = (index: number, val: string) => {
    const updated = [...attributes];
    updated[index].inputValue = val;
    setAttributes(updated);
  };

  const addAttributeRow = () => {
    setAttributes([...attributes, { name: '', inputValue: '', values: [] }]);
  };

  const removeAttributeRow = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  // --- Logic: Submission (Transactional) ---

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      // 1. Validation
      if (!productName.trim()) throw new Error("Product Name is required.");
      if (isMultiVariant && variants.length === 0) throw new Error("Multi-variant mode enabled but no variants generated.");

      // 2. Auth Context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized.");
      const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
      const businessId = profile?.business_id;

      // 3. Create Parent Product
      const { data: product, error: prodError } = await supabase
        .from('products')
        .insert({
          name: productName,
          category_id: categoryId ? parseInt(categoryId) : null,
          uom_id: uomId ? parseInt(uomId) : null,
          business_id: businessId,
          is_active: true
        })
        .select()
        .single();

      if (prodError) throw prodError;

      // 4. Prepare Variants Payload
      // We map our unified 'variants' state to the DB schema
      const variantsPayload = variants.map(v => ({
        product_id: product.id,
        sku: v.sku,
        price: v.price,
        cost_price: v.cost_price,
        stock_quantity: v.stock_quantity,
        attributes: v.attributes, // JSONB
        uom_id: v.uom_id ? v.uom_id : (uomId ? parseInt(uomId) : null) // Fallback to parent UOM
      }));

      // 5. Insert Variants
      const { error: varError } = await supabase.from('product_variants').insert(variantsPayload);
      if (varError) throw varError;

      return product;
    },
    onSuccess: () => {
      toast.success("Product created successfully.");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.message || "Failed to create product.");
    }
  });

  const resetForm = () => {
    setProductName('');
    setCategoryId(null);
    setUomId(null);
    setIsMultiVariant(false);
    setVariants([{ ...DEFAULT_VARIANT }]);
    setAttributes([{ name: 'Size', inputValue: '', values: [] }]);
    setActiveTab("configuration");
  };

  // --- Render ---

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (!val) resetForm();
        setOpen(val);
    }}>
      <DialogTrigger asChild>
        <Button className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Add New Product
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Product</DialogTitle>
          <DialogDescription>
            Configure product details, attributes, and stock information.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 py-4 space-y-6">
            
            {/* SECTION 1: IDENTITY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Product Name <span className="text-red-500">*</span></Label>
                    <Input 
                        value={productName} 
                        onChange={e => setProductName(e.target.value)} 
                        placeholder="e.g. Wireless Mouse" 
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={categoryId || ''} onValueChange={setCategoryId}>
                        <SelectTrigger><SelectValue placeholder="Select Category..." /></SelectTrigger>
                        <SelectContent>
                            {categories.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Default Unit of Measure</Label>
                    <Select value={uomId || ''} onValueChange={setUomId}>
                        <SelectTrigger><SelectValue placeholder="e.g. Pcs, Kg..." /></SelectTrigger>
                        <SelectContent>
                            {units.map(u => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                    {u.name} ({u.abbreviation})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex items-center space-x-2 border p-2 rounded-md bg-muted/20 h-10">
                    <Switch 
                        id="multi-variant" 
                        checked={isMultiVariant} 
                        onCheckedChange={(checked) => {
                            setIsMultiVariant(checked);
                            // If turning off, reset to single default variant
                            if (!checked) setVariants([{ ...DEFAULT_VARIANT }]);
                            // If turning on, ensure we are on the config tab
                            if (checked) setActiveTab("configuration");
                        }} 
                    />
                    <Label htmlFor="multi-variant" className="cursor-pointer font-medium">
                        Enable Variants (Size, Color, etc.)
                    </Label>
                </div>
            </div>

            <hr className="border-dashed" />

            {/* SECTION 2: VARIANT CONFIGURATION */}
            
            {!isMultiVariant ? (
                // --- SIMPLE MODE (SINGLE VARIANT) ---
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
                    <div className="space-y-2">
                        <Label>Selling Price</Label>
                        <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={variants[0].price} 
                            onChange={(e) => updateVariant(0, 'price', Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Cost Price</Label>
                        <Input 
                            type="number" 
                            placeholder="0.00"
                            value={variants[0].cost_price} 
                            onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Initial Stock</Label>
                        <Input 
                            type="number" 
                            placeholder="0"
                            value={variants[0].stock_quantity} 
                            onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>SKU / Barcode</Label>
                        <Input 
                            placeholder="AUTO"
                            value={variants[0].sku} 
                            onChange={(e) => updateVariant(0, 'sku', e.target.value)}
                        />
                    </div>
                </div>
            ) : (
                // --- MULTI VARIANT MODE (TABS) ---
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full border rounded-lg p-2">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="configuration">
                            <Package className="w-4 h-4 mr-2"/> 1. Define Attributes
                        </TabsTrigger>
                        <TabsTrigger value="preview" disabled={variants.length <= 0 && activeTab === 'configuration'}>
                            <Layers className="w-4 h-4 mr-2"/> 2. Review Variants
                        </TabsTrigger>
                    </TabsList>

                    {/* SUB-TAB 1: ATTRIBUTE BUILDER */}
                    <TabsContent value="configuration" className="space-y-4 px-2">
                        <div className="space-y-3">
                            {attributes.map((attr, idx) => (
                                <div key={idx} className="flex gap-3 items-end">
                                    <div className="w-1/3 space-y-1">
                                        <Label className="text-xs">Attribute Name</Label>
                                        <Input 
                                            value={attr.name} 
                                            onChange={e => {
                                                const updated = [...attributes];
                                                updated[idx].name = e.target.value;
                                                setAttributes(updated);
                                            }}
                                            placeholder="e.g. Size" 
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs">Values (Comma separated)</Label>
                                        <Input 
                                            value={attr.inputValue}
                                            onChange={e => updateAttributeInput(idx, e.target.value)}
                                            placeholder="e.g. Small, Medium, Large" 
                                        />
                                    </div>
                                    {attributes.length > 1 && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => removeAttributeRow(idx)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <Button variant="outline" size="sm" onClick={addAttributeRow}>
                                <Plus className="w-4 h-4 mr-2" /> Add Attribute
                            </Button>
                            <Button type="button" size="sm" onClick={generateVariants}>
                                <Wand2 className="w-4 h-4 mr-2" /> Generate Variants
                            </Button>
                        </div>
                    </TabsContent>

                    {/* SUB-TAB 2: VARIANT PREVIEW TABLE */}
                    <TabsContent value="preview" className="px-2">
                         {variants.length > 0 && variants[0].attributes && Object.keys(variants[0].attributes).length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                                <div className="max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-muted-foreground sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 font-medium">Variant Name</th>
                                                <th className="p-3 font-medium w-24">Price</th>
                                                <th className="p-3 font-medium w-24">Cost</th>
                                                <th className="p-3 font-medium w-24">Stock</th>
                                                <th className="p-3 font-medium w-32">SKU</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {variants.map((v, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 font-medium text-slate-700">
                                                        {v.name}
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number" 
                                                            className="h-8 bg-white" 
                                                            value={v.price} 
                                                            onChange={e => updateVariant(idx, 'price', Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number" 
                                                            className="h-8 bg-white" 
                                                            value={v.cost_price} 
                                                            onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            type="number" 
                                                            className="h-8 bg-white" 
                                                            value={v.stock_quantity} 
                                                            onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input 
                                                            className="h-8 bg-white uppercase" 
                                                            value={v.sku} 
                                                            onChange={e => updateVariant(idx, 'sku', e.target.value)}
                                                            placeholder="AUTO"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                         ) : (
                             <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50">
                                 <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                 <p>No variants generated.</p>
                                 <Button variant="link" onClick={() => setActiveTab("configuration")}>
                                     Go to configuration
                                 </Button>
                             </div>
                         )}
                         
                         <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                            <span>Total Variants: {variants.length}</span>
                            <Button variant="ghost" size="sm" onClick={() => setActiveTab("configuration")}>
                                Back to Attributes
                            </Button>
                         </div>
                    </TabsContent>
                </Tabs>
            )}

        </div>

        <DialogFooter className="pt-2 border-t mt-auto bg-background z-20">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} disabled={isPending} className="min-w-[120px]">
            {isPending ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
            ) : (
                "Save Product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}