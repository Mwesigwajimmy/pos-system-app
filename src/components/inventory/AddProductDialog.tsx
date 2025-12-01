'use client';

import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash, Wand2, Loader2 } from 'lucide-react';
import { Category } from '@/types/dashboard';

// --- Types ---
interface Unit { id: number; name: string; abbreviation: string; }

interface AddProductDialogProps {
  categories: Category[];
}

export default function AddProductDialog({ categories }: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // --- State ---
  const [units, setUnits] = useState<Unit[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  
  // CONTROLLED TAB STATE (Fixes the "Button doesn't respond" issue)
  const [activeTab, setActiveTab] = useState("attributes");
  
  // Basic Info
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uomId, setUomId] = useState('');

  // Simple Mode State
  const [simplePrice, setSimplePrice] = useState('');
  const [simpleCost, setSimpleCost] = useState('');
  const [simpleStock, setSimpleStock] = useState('');
  const [simpleSku, setSimpleSku] = useState('');

  // Advanced Mode State
  const [attributes, setAttributes] = useState<{ name: string; values: string[] }[]>([{ name: 'Size', values: [] }]);
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);

  // --- Fetch Units (Using the fixed DB column 'abbreviation') ---
  useEffect(() => {
    if (open) {
      const fetchUnits = async () => {
        const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation');
        if (data) setUnits(data);
      };
      fetchUnits();
    }
  }, [open]);

  // --- Variant Generation Logic (The "Generate" Button) ---
  const generateVariants = () => {
    // 1. Validation
    if (attributes.length === 0 || !attributes[0].values.length) {
        toast.error("Please add at least one attribute (e.g. Size: Small)");
        return;
    }

    // 2. Cartesian Product Logic (Combinatorics)
    const cartesian = (args: any[]) => args.reduce((a, b) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())));
    const attrValues = attributes.map(a => a.values);
    
    // Ensure no empty arrays
    if(attrValues.some(arr => arr.length === 0)) {
        toast.error("Every attribute must have at least one value.");
        return;
    }

    const combinations = attrValues.length > 1 ? cartesian(attrValues) : attrValues[0].map(v => [v]);

    // 3. Create Variant Objects
    const variants = combinations.map((combo: string[]) => {
      // Handle single vs multiple attributes
      const comboArray = Array.isArray(combo) ? combo : [combo];
      const name = comboArray.join(' / ');
      
      // Create the JSON attribute map { "Size": "Small", "Color": "Red" }
      const attrMap: Record<string, string> = {};
      attributes.forEach((attr, idx) => {
          attrMap[attr.name] = comboArray[idx];
      });

      return {
        name: name,
        price: 0,
        cost: 0,
        stock: 0,
        sku: '',
        attributes: attrMap
      };
    });

    setGeneratedVariants(variants);
    toast.success(`Generated ${variants.length} variants!`);
    
    // 4. CRITICAL FIX: Automatically switch the tab so the user sees the table
    setActiveTab("variants");
  };

  const handleAttributeValueChange = (index: number, valueStr: string) => {
    const newAttrs = [...attributes];
    // Split by comma, trim whitespace, remove empty strings
    newAttrs[index].values = valueStr.split(',').map(s => s.trim()).filter(Boolean);
    setAttributes(newAttrs);
  };

  // --- Submission to Backend ---
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      // 1. Auth Check & Tenant ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
      const tenantId = profile?.business_id;

      // 2. Insert Parent Product
      const { data: product, error: prodError } = await supabase.from('products').insert({
        name: productName,
        category_id: categoryId ? parseInt(categoryId) : null,
        uom_id: uomId ? parseInt(uomId) : null,
        business_id: tenantId,
        is_active: true
      }).select().single();

      if (prodError) throw prodError;

      // 3. Prepare Variants
      let variantsToInsert = [];

      if (!hasVariants) {
        // Single Variant Mode
        variantsToInsert.push({
          product_id: product.id,
          sku: simpleSku,
          price: Number(simplePrice) || 0,
          cost_price: Number(simpleCost) || 0,
          stock_quantity: Number(simpleStock) || 0,
          attributes: {}, // Empty JSON
          uom_id: uomId ? parseInt(uomId) : null
        });
      } else {
        // Multi Variant Mode
        variantsToInsert = generatedVariants.map(v => ({
          product_id: product.id,
          sku: v.sku,
          price: Number(v.price) || 0,
          cost_price: Number(v.cost) || 0,
          stock_quantity: Number(v.stock) || 0,
          attributes: v.attributes, // The JSON map we created
          uom_id: uomId ? parseInt(uomId) : null
        }));
      }

      // 4. Insert Variants
      const { error: varError } = await supabase.from('product_variants').insert(variantsToInsert);
      if (varError) throw varError;

      return product;
    },
    onSuccess: () => {
      toast.success("Product created successfully!");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setOpen(false);
      // Reset Form
      setProductName(''); setHasVariants(false); setGeneratedVariants([]); setActiveTab("attributes");
      setSimplePrice(''); setSimpleCost(''); setAttributes([{ name: 'Size', values: [] }]);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create product")
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add New Product</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Create a simple item or one with multiple variants.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          
          {/* Core Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Coca Cola" required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Select onValueChange={setUomId}>
                <SelectTrigger><SelectValue placeholder="e.g. Pcs, Kg, Liters" /></SelectTrigger>
                <SelectContent>
                  {/* Using 'abbreviation' to match DB */}
                  {units.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Switch checked={hasVariants} onCheckedChange={setHasVariants} id="variants-mode" />
              <Label htmlFor="variants-mode">This product has variants (Size, Color)</Label>
            </div>
          </div>

          <hr className="border-dashed" />

          {/* Simple Mode */}
          {!hasVariants && (
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md">
               <div className="space-y-2">
                  <Label>Selling Price</Label>
                  <Input type="number" value={simplePrice} onChange={e => setSimplePrice(e.target.value)} placeholder="0.00" />
               </div>
               <div className="space-y-2">
                  <Label>Cost Price</Label>
                  <Input type="number" value={simpleCost} onChange={e => setSimpleCost(e.target.value)} placeholder="0.00" />
               </div>
               <div className="space-y-2">
                  <Label>Initial Stock</Label>
                  <Input type="number" value={simpleStock} onChange={e => setSimpleStock(e.target.value)} placeholder="0" />
               </div>
               <div className="space-y-2">
                  <Label>SKU / Barcode</Label>
                  <Input value={simpleSku} onChange={e => setSimpleSku(e.target.value)} placeholder="Optional" />
               </div>
            </div>
          )}

          {/* Advanced Variant Builder */}
          {hasVariants && (
            // Controlled Tabs ensures we can programmatically switch tabs
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="attributes">1. Define Attributes</TabsTrigger>
                {/* Disabled until variants exist */}
                <TabsTrigger value="variants" disabled={generatedVariants.length === 0}>2. Edit Variants</TabsTrigger>
              </TabsList>
              
              <TabsContent value="attributes" className="space-y-4 border rounded-md p-4 mt-2">
                {attributes.map((attr, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="w-1/3 space-y-1">
                      <Label>Attribute Name</Label>
                      <Input value={attr.name} onChange={e => {
                        const newA = [...attributes]; newA[idx].name = e.target.value; setAttributes(newA);
                      }} placeholder="e.g. Size" />
                    </div>
                    <div className="w-2/3 space-y-1">
                      <Label>Values (comma separated)</Label>
                      <Input 
                        placeholder="e.g. Small, Medium, Large" 
                        onBlur={e => handleAttributeValueChange(idx, e.target.value)} // Process on blur for better UX
                        defaultValue={attr.values.join(', ')}
                      />
                    </div>
                    {idx > 0 && <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))}><Trash className="h-4 w-4" /></Button>}
                  </div>
                ))}
                
                <div className="flex justify-between items-center mt-4">
                  <Button variant="outline" size="sm" onClick={() => setAttributes([...attributes, { name: '', values: [] }])}>
                    <Plus className="h-4 w-4 mr-2" /> Add Another Option
                  </Button>
                  
                  {/* GENERATE BUTTON */}
                  <Button size="sm" onClick={generateVariants}>
                    <Wand2 className="h-4 w-4 mr-2" /> Generate Variants
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="variants" className="mt-2">
                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Variant Name</th>
                        <th className="p-2 w-24">Price</th>
                        <th className="p-2 w-24">Cost</th>
                        <th className="p-2 w-32">SKU</th>
                        <th className="p-2 w-24">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedVariants.map((v, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/5">
                          <td className="p-2 font-medium">{v.name}</td>
                          <td className="p-2"><Input className="h-8" type="number" value={v.price} onChange={e => {
                            const newV = [...generatedVariants]; newV[idx].price = e.target.value; setGeneratedVariants(newV);
                          }} /></td>
                          <td className="p-2"><Input className="h-8" type="number" value={v.cost} onChange={e => {
                            const newV = [...generatedVariants]; newV[idx].cost = e.target.value; setGeneratedVariants(newV);
                          }} /></td>
                          <td className="p-2"><Input className="h-8" value={v.sku} onChange={e => {
                            const newV = [...generatedVariants]; newV[idx].sku = e.target.value; setGeneratedVariants(newV);
                          }} /></td>
                           <td className="p-2"><Input className="h-8" type="number" value={v.stock} onChange={e => {
                            const newV = [...generatedVariants]; newV[idx].stock = e.target.value; setGeneratedVariants(newV);
                          }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                    Review generated variants before saving.
                </p>
              </TabsContent>
            </Tabs>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mutate()} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Save Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}