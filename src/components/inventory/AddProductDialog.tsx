'use client';

import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// UI Components
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Icons
import { 
  Plus, Trash, Wand2, Loader2, AlertCircle, Package, Layers, Save, Fingerprint, Calculator, ShieldCheck 
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
  units_per_pack: number; // Support for fractional/packet logic
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
  units_per_pack: 1, // Default to 1 (Whole Unit)
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
  
  // --- Unit Creation State ---
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbr, setNewUnitAbbr] = useState('');
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // --- Product Core State ---
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [uomId, setUomId] = useState<string | null>(null);
  const [taxCategoryCode, setTaxCategoryCode] = useState('STANDARD'); 
  
  // --- Mode Switching ---
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  
  // --- Unified Variant State ---
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...DEFAULT_VARIANT }]);

  // --- Attribute Builder State ---
  const [attributes, setAttributes] = useState<AttributeBuilder[]>([
    { name: 'Size', inputValue: '', values: [] }
  ]);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState("configuration");

  // --- Load Dependencies ---
  useEffect(() => {
    if (open) {
      const fetchUnits = async () => {
        const { data, error } = await supabase
          .from('units_of_measure')
          .select('id, name, abbreviation')
          .eq('status', 'active'); 
        
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
    
    // Cartesian Product Helper
    const cartesianProduct = (arr: any[][]) => {
        return arr.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    };

    let combinations: string[][];
    if (validAttributes.length === 1) {
        combinations = attrValues[0].map(v => [v]);
    } else {
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

  const addAttributeRow = () => {
    setAttributes([...attributes, { name: '', inputValue: '', values: [] }]);
  };

  const removeAttributeRow = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  // --- Logic: Submission (ENTERPRISE UPGRADE) ---
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!productName.trim()) throw new Error("Product Name is required.");
      if (isMultiVariant && variants.length === 0) throw new Error("Multi-variant mode enabled but no variants generated.");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized.");
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, tenant_id')
        .eq('id', user.id)
        .single();
      
      const bizId = profile?.business_id;
      const tenantId = profile?.tenant_id;

      // 1. Create Parent Product
      const { data: product, error: prodError } = await supabase
        .from('products')
        .insert({
          name: productName,
          category_id: categoryId ? parseInt(categoryId) : null,
          uom_id: uomId ? uomId : null, 
          business_id: bizId,
          tenant_id: tenantId,
          is_active: true,
          status: 'active', // FIXED: Required for backend field handshake
          tax_category_code: taxCategoryCode.toUpperCase()
        })
        .select()
        .single();

      if (prodError) throw prodError;

      // 2. Prepare Variants Payload
      const variantsPayload = variants.map(v => ({
        product_id: product.id,
        name: v.name,
        sku: v.sku || `VAR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        price: v.price,
        selling_price: v.price, // FIXED: Satisfies kernels requiring double price entry
        cost_price: v.cost_price,
        stock_quantity: v.stock_quantity,
        status: 'active', // FIXED: Resolves variant trigger requirements
        units_per_pack: v.units_per_pack || 1, 
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
      console.error(err);
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
    setIsUnitModalOpen(false);
    setNewUnitName('');
    setNewUnitAbbr('');
  };

  return (
    <>
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
            <DialogTitle className="text-xl font-black tracking-tight italic uppercase flex items-center gap-2">
                <Package className="text-primary" /> Create Product Asset
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Configure details, recipe attributes, and initial stock for the Sovereign Ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 py-4 space-y-6">
              
              {/* SECTION 1: IDENTITY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Product Name *</Label>
                      <Input 
                          value={productName} 
                          onChange={e => setProductName(e.target.value)} 
                          placeholder="e.g. Wireless Mouse" 
                          className="h-11 bg-white"
                          autoFocus
                      />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Category</Label>
                      <Select value={categoryId || ''} onValueChange={setCategoryId}>
                          <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Select Category..." /></SelectTrigger>
                          <SelectContent>
                              {categories.map(c => (
                                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                        <Fingerprint className="w-3 h-3 text-blue-500"/>
                        Global Tax Category
                      </Label>
                      <Input 
                        value={taxCategoryCode} 
                        onChange={e => setTaxCategoryCode(e.target.value)} 
                        className="h-11 bg-white font-mono uppercase"
                        placeholder="STANDARD"
                      />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end px-1">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Default Unit of Measure</Label>
                      <div className="flex gap-2">
                        <Select value={uomId || ''} onValueChange={setUomId}>
                            <SelectTrigger className="flex-1 h-11 bg-white"><SelectValue placeholder="e.g. Pcs, Kg..." /></SelectTrigger>
                            <SelectContent>
                                {units.map(u => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                        {u.name} ({u.abbreviation})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          title="Add New Unit"
                          className="h-11 w-11 shadow-sm"
                          onClick={() => setIsUnitModalOpen(true)}
                          type="button"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 border p-2 rounded-xl bg-muted/20 h-11 px-4">
                      <Switch 
                          id="multi-variant" 
                          checked={isMultiVariant} 
                          onCheckedChange={(checked) => {
                              setIsMultiVariant(checked);
                              if (!checked) setVariants([{ ...DEFAULT_VARIANT }]);
                              if (checked) setActiveTab("configuration");
                          }} 
                      />
                      <Label htmlFor="multi-variant" className="cursor-pointer font-black text-xs uppercase tracking-widest text-slate-600">
                          Enable Variants (Size, Color, etc.)
                      </Label>
                  </div>
              </div>

              <hr className="border-dashed" />

              {/* SECTION 2: VARIANT CONFIGURATION */}
              
              {!isMultiVariant ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-900 p-6 rounded-[2rem] border-none shadow-2xl">
                      <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Selling Price</Label>
                          <Input 
                              type="number" 
                              placeholder="0.00" 
                              className="bg-white/5 border-white/10 text-white h-11 font-mono font-bold"
                              value={variants[0].price} 
                              onChange={(e) => updateVariant(0, 'price', Number(e.target.value))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Cost Price</Label>
                          <Input 
                              type="number" 
                              placeholder="0.00"
                              className="bg-white/5 border-white/10 text-white h-11 font-mono font-bold"
                              value={variants[0].cost_price} 
                              onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Initial Stock</Label>
                          <Input 
                              type="number" 
                              placeholder="0"
                              className="bg-white/5 border-white/10 text-white h-11 font-mono font-bold"
                              value={variants[0].stock_quantity} 
                              onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">
                            <Calculator className="w-3 h-3 text-primary"/>
                            Units/Pack
                          </Label>
                          <Input 
                              type="number" 
                              className="bg-white/5 border-white/10 text-white h-11 font-mono font-bold"
                              value={variants[0].units_per_pack} 
                              onChange={(e) => updateVariant(0, 'units_per_pack', Number(e.target.value))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">SKU / Barcode</Label>
                          <Input 
                              placeholder="AUTO"
                              className="bg-white/5 border-white/10 text-white h-11 font-mono"
                              value={variants[0].sku} 
                              onChange={(e) => updateVariant(0, 'sku', e.target.value)}
                          />
                      </div>
                  </div>
              ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full border-none rounded-2xl bg-slate-50 p-1">
                      <TabsList className="grid w-full grid-cols-2 mb-4 bg-transparent">
                          <TabsTrigger value="configuration" className="rounded-xl font-bold uppercase text-[10px] tracking-widest data-[state=active]:shadow-lg">
                              <Package className="w-4 h-4 mr-2"/> 1. Define Attributes
                          </TabsTrigger>
                          <TabsTrigger value="preview" className="rounded-xl font-bold uppercase text-[10px] tracking-widest data-[state=active]:shadow-lg" disabled={variants.length <= 0 && activeTab === 'configuration'}>
                              <Layers className="w-4 h-4 mr-2"/> 2. Review Variants
                          </TabsTrigger>
                      </TabsList>

                      <TabsContent value="configuration" className="space-y-4 p-4">
                          <div className="space-y-4">
                              {attributes.map((attr, idx) => (
                                  <div key={idx} className="flex gap-4 items-end bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                      <div className="w-1/3 space-y-1">
                                          <Label className="text-[10px] font-black uppercase text-slate-400">Attribute Name</Label>
                                          <Input 
                                              value={attr.name} 
                                              onChange={e => {
                                                  const updated = [...attributes];
                                                  updated[idx].name = e.target.value;
                                                  setAttributes(updated);
                                              }}
                                              className="h-10 font-bold"
                                              placeholder="e.g. Size" 
                                          />
                                      </div>
                                      <div className="flex-1 space-y-1">
                                          <Label className="text-[10px] font-black uppercase text-slate-400">Values (Comma separated)</Label>
                                          <Input 
                                              value={attr.inputValue}
                                              onChange={e => updateAttributeInput(idx, e.target.value)}
                                              className="h-10"
                                              placeholder="e.g. S, M, L" 
                                          />
                                      </div>
                                      {attributes.length > 1 && (
                                          <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              onClick={() => removeAttributeRow(idx)}
                                              className="text-muted-foreground hover:text-red-500 h-10 w-10"
                                          >
                                              <Trash className="w-4 h-4" />
                                          </Button>
                                      )}
                                  </div>
                              ))}
                          </div>

                          <div className="flex justify-between items-center pt-2">
                              <Button variant="outline" size="sm" onClick={addAttributeRow} className="font-bold border-slate-300">
                                  <Plus className="w-4 h-4 mr-2" /> Add Row
                              </Button>
                              <Button type="button" size="sm" onClick={generateVariants} className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-6 shadow-xl">
                                  <Wand2 className="w-4 h-4 mr-2" /> Generate Matrix
                              </Button>
                          </div>
                      </TabsContent>

                      <TabsContent value="preview" className="p-4">
                          {variants.length > 0 ? (
                              <div className="border rounded-2xl overflow-hidden shadow-2xl bg-white">
                                  <div className="max-h-[350px] overflow-y-auto">
                                      <Table>
                                          <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                              <TableRow>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-12">Variant Name</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-12">Price</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-12">Cost</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-12">Stock</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-12">U/Pack</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-12">SKU</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody className="divide-y">
                                              {variants.map((v, idx) => (
                                                  <TableRow key={idx} className="hover:bg-slate-50">
                                                      <TableCell className="p-4 font-black text-slate-800 text-xs italic uppercase">
                                                          {v.name}
                                                      </TableCell>
                                                      <TableCell className="p-2">
                                                          <Input 
                                                              type="number" 
                                                              className="h-9 font-mono font-bold" 
                                                              value={v.price} 
                                                              onChange={e => updateVariant(idx, 'price', Number(e.target.value))}
                                                          />
                                                      </TableCell>
                                                      <TableCell className="p-2">
                                                          <Input 
                                                              type="number" 
                                                              className="h-9 font-mono text-slate-400" 
                                                              value={v.cost_price} 
                                                              onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))}
                                                          />
                                                      </TableCell>
                                                      <TableCell className="p-2">
                                                          <Input 
                                                              type="number" 
                                                              className="h-9 font-mono font-black text-emerald-600" 
                                                              value={v.stock_quantity} 
                                                              onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))}
                                                          />
                                                      </TableCell>
                                                      <TableCell className="p-2">
                                                          <Input 
                                                              type="number" 
                                                              className="h-9 font-mono text-blue-600" 
                                                              value={v.units_per_pack} 
                                                              onChange={e => updateVariant(idx, 'units_per_pack', Number(e.target.value))}
                                                          />
                                                      </TableCell>
                                                      <TableCell className="p-2 pr-4">
                                                          <Input 
                                                              className="h-9 font-mono uppercase text-[10px]" 
                                                              value={v.sku} 
                                                              onChange={e => updateVariant(idx, 'sku', e.target.value)}
                                                              placeholder="AUTO"
                                                          />
                                                      </TableCell>
                                                  </TableRow>
                                              ))}
                                          </TableBody>
                                      </Table>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-[2rem] bg-white opacity-50">
                                  <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                                  <p className="font-bold uppercase tracking-widest text-xs">No Matrix Data Generated</p>
                              </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-4 text-[9px] font-black uppercase tracking-widest text-slate-400 px-2">
                              <span>Consolidated Variants: {variants.length}</span>
                              <Button variant="ghost" size="sm" className="font-black text-[9px]" onClick={() => setActiveTab("configuration")}>
                                  BACK TO CONFIG
                              </Button>
                          </div>
                      </TabsContent>
                  </Tabs>
              )}

          </div>

          <DialogFooter className="p-6 border-t mt-auto bg-slate-50 z-20 rounded-b-3xl">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="font-bold">
              CANCEL
            </Button>
            <Button onClick={() => mutate()} disabled={isPending} className="min-w-[180px] bg-slate-900 text-white font-black uppercase tracking-widest h-12 shadow-2xl hover:scale-105 transition-all">
              {isPending ? (
                  <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" /> SEALING...
                  </>
              ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 mr-3 text-emerald-400" />
                    Save Product
                  </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD NEW UNIT DIALOG --- */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-2">
            <DialogTitle className="text-lg font-black uppercase tracking-widest">Add New Unit</DialogTitle>
            <DialogDescription className="text-xs font-medium">Create a custom fiduciary unit of measure.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6 px-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Full Unit Name</Label>
              <Input 
                placeholder="e.g. Kilogram" 
                className="h-11 shadow-inner bg-slate-50 border-none font-bold"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Abbreviation</Label>
              <Input 
                placeholder="e.g. kg" 
                className="h-11 shadow-inner bg-slate-50 border-none font-mono font-black"
                value={newUnitAbbr}
                onChange={(e) => setNewUnitAbbr(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 mt-2 rounded-b-3xl">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="font-bold">ABORT</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="bg-slate-900 text-white font-black px-8">
               {isSavingUnit ? <Loader2 className="animate-spin" /> : <Save className="mr-2 w-4 h-4" />}
               REGISTER UNIT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}