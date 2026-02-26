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
  Plus, Trash, Wand2, Loader2, AlertCircle, Package, Layers, Save, Fingerprint, Calculator 
} from 'lucide-react';
import { Category } from '@/types/dashboard';

// --- Enterprise Interfaces ---

interface Unit {
  id: string;
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
  units_per_pack: number; // UPGRADE: Support for fractional/packet logic
  attributes: Record<string, string>;
  uom_id: string | null;
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
  units_per_pack: 1, // UPGRADE: Default to 1 (Whole Unit)
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
  
  // --- Unit Creation State (New Feature) ---
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbr, setNewUnitAbbr] = useState('');
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // --- Product Core State ---
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [uomId, setUomId] = useState<string | null>(null);
  const [taxCategoryCode, setTaxCategoryCode] = useState('STANDARD'); // UPGRADE: Global Tax Link
  
  // --- Mode Switching ---
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  
  // --- Unified Variant State (Single Source of Truth) ---
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
  }, [open, supabase]);

  // --- Logic: Add New Unit ---
  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !newUnitAbbr.trim()) {
      toast.error("Please provide both a name and an abbreviation.");
      return;
    }

    setIsSavingUnit(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      const { data: newUnit, error } = await supabase
        .from('units_of_measure')
        .insert({
          name: newUnitName,
          abbreviation: newUnitAbbr,
          business_id: profile?.business_id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setUnits(prev => [...prev, newUnit]);
      setUomId(String(newUnit.id)); 
      toast.success("New unit added successfully!");
      
      setNewUnitName('');
      setNewUnitAbbr('');
      setIsUnitModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add unit.");
    } finally {
      setIsSavingUnit(false);
    }
  };

  // --- Logic: Variant Generation ---
  
  const generateVariants = () => {
    const validAttributes = attributes
      .map(attr => ({
        name: attr.name.trim(),
        values: attr.inputValue.split(',').map(s => s.trim()).filter(Boolean)
      }))
      .filter(attr => attr.values.length > 0 && attr.name.trim() !== '');

    if (validAttributes.length === 0) {
      toast.error("Configuration Error: Please define at least one attribute with values.");
      return;
    }

    const attrValues = validAttributes.map(a => a.values);
    let combinations: string[][];
    if (validAttributes.length === 1) {
        combinations = attrValues[0].map(v => [v]);
    } else {
        const cartesianProduct = (arr: any[]) => arr.reduce((a, b) => a.flatMap((c: any) => b.map((d: any) => [c, d].flat())));
        combinations = cartesianProduct(attrValues);
    }

    const newVariants: VariantDraft[] = combinations.map((combo) => {
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
        sku: '', 
        price: 0,
        cost_price: 0,
        stock_quantity: 0,
        units_per_pack: 1, 
        attributes: attrMap,
        uom_id: null 
      };
    });

    setVariants(newVariants);
    toast.success(`Success: Generated ${newVariants.length} variants.`);
    setActiveTab("preview"); 
  };

  const updateVariant = (index: number, field: keyof VariantDraft, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const updateAttributeInput = (index: number, val: string) => {
    const updated = [...attributes];
    updated[index].inputValue = val;
    setAttributes(updated);
  };

  const addAttributeRow = () => setAttributes([...attributes, { name: '', inputValue: '', values: [] }]);
  const removeAttributeRow = (index: number) => setAttributes(attributes.filter((_, i) => i !== index));

  // --- Logic: Submission (ENTERPRISE UPGRADE) ---

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!productName.trim()) throw new Error("Product Name is required.");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized.");
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, tenant_id')
        .eq('id', user.id)
        .single();
      
      const bizId = profile?.business_id;
      const tenantId = profile?.tenant_id;

      // 1. Create Parent Product (Absolute Handshake)
      const { data: product, error: prodError } = await supabase
        .from('products')
        .insert({
          name: productName,
          category_id: categoryId ? parseInt(categoryId) : null,
          uom_id: uomId ? uomId : null, 
          business_id: bizId,
          tenant_id: tenantId,
          is_active: true,
          status: 'active', // FIXED: Resolves "record new has no field status"
          tax_category_code: taxCategoryCode.toUpperCase()
        })
        .select()
        .single();

      if (prodError) throw prodError;

      // 2. Prepare Variants (Forensic Alignment)
      const variantsPayload = variants.map(v => ({
        product_id: product.id,
        name: v.name,
        sku: v.sku || `VAR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        price: v.price,
        selling_price: v.price, // FIXED: Satisfies v8/v10 fractional kernels
        cost_price: v.cost_price,
        stock_quantity: v.stock_quantity,
        units_per_pack: v.units_per_pack || 1,
        status: 'active', // FIXED: Resolves variant-level trigger crashes
        attributes: v.attributes,
        uom_id: v.uom_id ? v.uom_id : (uomId ? uomId : null), 
        business_id: bizId,
        tenant_id: tenantId
      }));

      const { error: varError } = await supabase.from('product_variants').insert(variantsPayload);
      if (varError) throw varError;

      return product;
    },
    onSuccess: () => {
      toast.success("Product & Inventory Successfully Sealed");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Fiduciary Handshake Failed.");
    }
  });

  const resetForm = () => {
    setProductName('');
    setCategoryId(null);
    setUomId(null);
    setTaxCategoryCode('STANDARD');
    setIsMultiVariant(false);
    setVariants([{ ...DEFAULT_VARIANT }]);
    setAttributes([{ name: 'Size', inputValue: '', values: [] }]);
    setActiveTab("configuration");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> Add New Product</Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">Create Product</DialogTitle>
            <DialogDescription>Configure details and stock for the Sovereign Ledger.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                      <Label>Product Name <span className="text-red-500">*</span></Label>
                      <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Grass" autoFocus />
                  </div>
                  <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={categoryId || ''} onValueChange={setCategoryId}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{categories.map(c => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}</SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Fingerprint className="w-3 h-3 text-blue-500"/> Global Tax Category</Label>
                      <Input value={taxCategoryCode} onChange={e => setTaxCategoryCode(e.target.value)} placeholder="STANDARD" />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                      <Label>Default Unit of Measure</Label>
                      <div className="flex gap-2">
                        <Select value={uomId || ''} onValueChange={setUomId}>
                            <SelectTrigger className="flex-1"><SelectValue placeholder="e.g. Pcs, Kg..." /></SelectTrigger>
                            <SelectContent>{units.map(u => (<SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.abbreviation})</SelectItem>))}</SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => setIsUnitModalOpen(true)} type="button"><Plus className="w-4 h-4" /></Button>
                      </div>
                  </div>
                  <div className="flex items-center space-x-2 border p-2 rounded-md bg-muted/20 h-10">
                      <Switch id="multi-variant" checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                      <Label htmlFor="multi-variant" className="cursor-pointer font-medium">Enable Variants</Label>
                  </div>
              </div>

              <hr className="border-dashed" />

              {!isMultiVariant ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border">
                      <div className="space-y-2"><Label>Selling Price</Label><Input type="number" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))}/></div>
                      <div className="space-y-2"><Label>Cost Price</Label><Input type="number" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))}/></div>
                      <div className="space-y-2"><Label>Initial Stock</Label><Input type="number" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))}/></div>
                      <div className="space-y-2"><Label className="flex items-center gap-1"><Calculator className="w-3 h-3 text-slate-400"/> Units/Pack</Label><Input type="number" value={variants[0].units_per_pack} onChange={(e) => updateVariant(0, 'units_per_pack', Number(e.target.value))}/></div>
                      <div className="space-y-2"><Label>SKU / Barcode</Label><Input placeholder="AUTO" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)}/></div>
                  </div>
              ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full border rounded-lg p-2">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger value="configuration"><Package className="w-4 h-4 mr-2"/> 1. Define Attributes</TabsTrigger>
                          <TabsTrigger value="preview" disabled={variants.length <= 0}><Layers className="w-4 h-4 mr-2"/> 2. Review Variants</TabsTrigger>
                      </TabsList>
                      <TabsContent value="configuration" className="space-y-4 px-2">
                          <div className="space-y-3">{attributes.map((attr, idx) => (
                                  <div key={idx} className="flex gap-3 items-end">
                                      <div className="w-1/3 space-y-1"><Label className="text-xs">Attribute Name</Label><Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} placeholder="e.g. Size" /></div>
                                      <div className="flex-1 space-y-1"><Label className="text-xs">Values (Comma separated)</Label><Input value={attr.inputValue} onChange={e => updateAttributeInput(idx, e.target.value)} placeholder="e.g. S, M, L" /></div>
                                      {attributes.length > 1 && (<Button variant="ghost" size="icon" onClick={() => removeAttributeRow(idx)} className="text-muted-foreground hover:text-destructive"><Trash className="w-4 h-4" /></Button>)}
                                  </div>
                              ))}</div>
                          <div className="flex justify-between items-center pt-2">
                              <Button variant="outline" size="sm" onClick={addAttributeRow}><Plus className="w-4 h-4 mr-2" /> Add Attribute</Button>
                              <Button type="button" size="sm" onClick={generateVariants}><Wand2 className="w-4 h-4 mr-2" /> Generate</Button>
                          </div>
                      </TabsContent>
                      <TabsContent value="preview" className="px-2">
                          <div className="border rounded-md overflow-hidden"><div className="max-h-[300px] overflow-y-auto"><table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground sticky top-0 z-10"><tr><th className="p-3 font-medium">Variant Name</th><th className="p-3 font-medium w-24">Price</th><th className="p-3 font-medium w-20">Cost</th><th className="p-3 font-medium w-20">Stock</th><th className="p-3 font-medium w-20">U/Pack</th><th className="p-3 font-medium w-32">SKU</th></tr></thead>
                                <tbody className="divide-y">{variants.map((v, idx) => (<tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-medium text-slate-700">{v.name}</td>
                                    <td className="p-2"><Input type="number" className="h-8" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))}/></td>
                                    <td className="p-2"><Input type="number" className="h-8" value={v.cost_price} onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))}/></td>
                                    <td className="p-2"><Input type="number" className="h-8" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))}/></td>
                                    <td className="p-2"><Input type="number" className="h-8" value={v.units_per_pack} onChange={e => updateVariant(idx, 'units_per_pack', Number(e.target.value))}/></td>
                                    <td className="p-2"><Input className="h-8" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="AUTO"/></td>
                                </tr>))}</tbody></table></div></div>
                          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground"><span>Total: {variants.length}</span><Button variant="ghost" size="sm" onClick={() => setActiveTab("configuration")}>Back</Button></div>
                      </TabsContent>
                  </Tabs>
              )}
          </div>

          <DialogFooter className="pt-2 border-t mt-auto bg-background z-20">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={() => mutate()} disabled={isPending} className="min-w-[120px] font-black uppercase">
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sealing...</> : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Add New Unit</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Unit Name</Label><Input placeholder="Kilogram" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)}/></div>
            <div className="space-y-2"><Label>Abbreviation</Label><Input placeholder="kg" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnitModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit}>{isSavingUnit ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}