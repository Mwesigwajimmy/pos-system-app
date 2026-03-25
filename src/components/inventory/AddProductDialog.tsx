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
  units_per_pack: number; 
  attributes: Record<string, string>;
  uom_id: string | null;
}

interface AttributeBuilder {
  name: string;
  inputValue: string; 
  values: string[];   
}

interface AddProductDialogProps {
  categories: Category[];
}

const DEFAULT_VARIANT: VariantDraft = {
  name: 'Standard',
  sku: '',
  price: 0,
  cost_price: 0,
  stock_quantity: 0,
  units_per_pack: 1, 
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
  
  // UPGRADE: Strict Categorical Tax DNA State
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

      // 1. Create Parent Product with Tax DNA
      const { data: product, error: prodError } = await supabase
        .from('products')
        .insert({
          name: productName,
          category_id: categoryId ? parseInt(categoryId) : null,
          uom_id: uomId ? uomId : null, 
          business_id: bizId,
          tenant_id: tenantId,
          is_active: true,
          status: 'active',
          tax_category_code: taxCategoryCode.toUpperCase() // FIXED: Ensure sanitized uppercase
        })
        .select()
        .single();

      if (prodError) throw prodError;

      // 2. Prepare Variants Payload with Inherited Tax DNA
      const variantsPayload = variants.map(v => ({
        product_id: product.id,
        name: v.name,
        sku: v.sku || `VAR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        price: Number(v.price),
        selling_price: Number(v.price), 
        cost_price: Number(v.cost_price),
        stock_quantity: Number(v.stock_quantity),
        status: 'active', 
        units_per_pack: Number(v.units_per_pack) || 1, 
        attributes: v.attributes,
        uom_id: v.uom_id ? v.uom_id : (uomId ? uomId : null), 
        business_id: bizId,
        tenant_id: tenantId,
        tax_category_code: taxCategoryCode.toUpperCase() // UPGRADE: Crucial link for POS math kernel
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
        
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col border-none rounded-[3rem] shadow-2xl">
          <DialogHeader className="p-2">
            <DialogTitle className="text-xl font-black tracking-tight italic uppercase flex items-center gap-2">
                <Package className="text-primary" /> Create Product Asset
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Configure details, recipe attributes, and initial stock for the Sovereign Ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 py-4 space-y-6 px-2">
              
              {/* SECTION 1: IDENTITY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Product Name *</Label>
                      <Input 
                          value={productName} 
                          onChange={e => setProductName(e.target.value)} 
                          placeholder="e.g. Wireless Mouse" 
                          className="h-12 bg-white rounded-xl shadow-sm border-slate-200"
                          autoFocus
                      />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Category</Label>
                      <Select value={categoryId || ''} onValueChange={setCategoryId}>
                          <SelectTrigger className="h-12 bg-white rounded-xl shadow-sm border-slate-200"><SelectValue placeholder="Select Category..." /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                              {categories.map(c => (
                                  <SelectItem key={c.id} value={String(c.id)} className="font-bold">{c.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                        <Fingerprint className="w-3 h-3 text-blue-500"/>
                        Global Tax DNA
                      </Label>
                      {/* UPGRADE: Standardized Dropdown for Sovereign Tax DNA */}
                      <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                        <SelectTrigger className="h-12 bg-white rounded-xl shadow-sm border-slate-200 font-black uppercase">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                            <SelectItem value="STANDARD" className="font-bold">STANDARD (e.g. 18%)</SelectItem>
                            <SelectItem value="EXEMPT" className="font-bold">EXEMPT (0%)</SelectItem>
                            <SelectItem value="REDUCED" className="font-bold">REDUCED RATE (5%)</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end px-1">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Default Unit of Measure</Label>
                      <div className="flex gap-3">
                        <Select value={uomId || ''} onValueChange={setUomId}>
                            <SelectTrigger className="flex-1 h-12 bg-white rounded-xl shadow-sm border-slate-200 font-bold"><SelectValue placeholder="e.g. Pcs, Kg..." /></SelectTrigger>
                            <SelectContent className="rounded-xl">
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
                          className="h-12 w-12 rounded-xl shadow-sm border-slate-200"
                          onClick={() => setIsUnitModalOpen(true)}
                          type="button"
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 border-2 p-3 rounded-2xl bg-muted/20 h-12 px-6">
                      <Switch 
                          id="multi-variant" 
                          checked={isMultiVariant} 
                          onCheckedChange={(checked) => {
                              setIsMultiVariant(checked);
                              if (!checked) setVariants([{ ...DEFAULT_VARIANT }]);
                              if (checked) setActiveTab("configuration");
                          }} 
                      />
                      <Label htmlFor="multi-variant" className="cursor-pointer font-black text-xs uppercase tracking-[0.2em] text-slate-600">
                          Enable Industrial Variants
                      </Label>
                  </div>
              </div>

              <hr className="border-dashed border-slate-200" />

              {/* SECTION 2: VARIANT CONFIGURATION */}
              
              {!isMultiVariant ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-900 p-8 rounded-[2.5rem] border-none shadow-2xl">
                      <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-2">Selling Price</Label>
                          <Input 
                              type="number" 
                              placeholder="0.00" 
                              className="bg-white/5 border-white/10 text-white h-12 rounded-xl font-mono font-bold text-lg"
                              value={variants[0].price} 
                              onChange={(e) => updateVariant(0, 'price', Number(e.target.value))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-2">Cost Price</Label>
                          <Input 
                              type="number" 
                              placeholder="0.00"
                              className="bg-white/5 border-white/10 text-white h-12 rounded-xl font-mono font-bold text-lg"
                              value={variants[0].cost_price} 
                              onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-2">Initial Stock</Label>
                          <Input 
                              type="number" 
                              placeholder="0"
                              className="bg-white/5 border-white/10 text-emerald-400 h-12 rounded-xl font-mono font-bold text-lg"
                              value={variants[0].stock_quantity} 
                              onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 tracking-widest ml-2">
                            <Calculator className="w-3 h-3 text-primary"/>
                            Units/Pack
                          </Label>
                          <Input 
                              type="number" 
                              className="bg-white/5 border-white/10 text-blue-400 h-12 rounded-xl font-mono font-bold text-lg"
                              value={variants[0].units_per_pack} 
                              onChange={(e) => updateVariant(0, 'units_per_pack', Number(e.target.value))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-2">SKU / ID</Label>
                          <Input 
                              placeholder="AUTO"
                              className="bg-white/5 border-white/10 text-slate-400 h-12 rounded-xl font-mono text-sm uppercase tracking-widest"
                              value={variants[0].sku} 
                              onChange={(e) => updateVariant(0, 'sku', e.target.value)}
                          />
                      </div>
                  </div>
              ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full border-none rounded-[2rem] bg-slate-50 p-2">
                      <TabsList className="grid w-full grid-cols-2 mb-6 bg-transparent h-12">
                          <TabsTrigger value="configuration" className="rounded-2xl font-black uppercase text-[11px] tracking-widest data-[state=active]:shadow-lg">
                              <Package className="w-4 h-4 mr-2"/> 1. Define Attributes
                          </TabsTrigger>
                          <TabsTrigger value="preview" className="rounded-2xl font-black uppercase text-[11px] tracking-widest data-[state=active]:shadow-lg" disabled={variants.length <= 0 && activeTab === 'configuration'}>
                              <Layers className="w-4 h-4 mr-2"/> 2. Review Variants
                          </TabsTrigger>
                      </TabsList>

                      <TabsContent value="configuration" className="space-y-4 p-4">
                          <div className="space-y-4">
                              {attributes.map((attr, idx) => (
                                  <div key={idx} className="flex gap-4 items-end bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                      <div className="w-1/3 space-y-1">
                                          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Attribute Name</Label>
                                          <Input 
                                              value={attr.name} 
                                              onChange={e => {
                                                  const updated = [...attributes];
                                                  updated[idx].name = e.target.value;
                                                  setAttributes(updated);
                                              }}
                                              className="h-11 font-black rounded-xl"
                                              placeholder="e.g. Size" 
                                          />
                                      </div>
                                      <div className="flex-1 space-y-1">
                                          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Values (Comma separated)</Label>
                                          <Input 
                                              value={attr.inputValue}
                                              onChange={e => updateAttributeInput(idx, e.target.value)}
                                              className="h-11 rounded-xl"
                                              placeholder="e.g. S, M, L" 
                                          />
                                      </div>
                                      {attributes.length > 1 && (
                                          <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              onClick={() => removeAttributeRow(idx)}
                                              className="text-muted-foreground hover:text-red-500 h-11 w-11 rounded-xl"
                                          >
                                              <Trash className="w-5 h-5" />
                                          </Button>
                                      )}
                                  </div>
                              ))}
                          </div>

                          <div className="flex justify-between items-center pt-4 px-2">
                              <Button variant="outline" size="sm" onClick={addAttributeRow} className="font-black uppercase text-[10px] border-slate-300 px-6 rounded-full h-10">
                                  <Plus className="w-4 h-4 mr-2" /> Add Dimension
                              </Button>
                              <Button type="button" size="sm" onClick={generateVariants} className="bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest px-8 rounded-full h-10 shadow-xl hover:scale-105 transition-all">
                                  <Wand2 className="w-4 h-4 mr-2" /> Generate Matrix
                              </Button>
                          </div>
                      </TabsContent>

                      <TabsContent value="preview" className="p-4">
                          {variants.length > 0 ? (
                              <div className="border rounded-[2rem] overflow-hidden shadow-2xl bg-white border-slate-100">
                                  <div className="max-h-[400px] overflow-y-auto">
                                      <Table>
                                          <TableHeader className="bg-slate-900 text-white sticky top-0 z-10">
                                              <TableRow className="hover:bg-transparent">
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-14 pl-6 text-slate-400">Variant Identity</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-14 text-slate-400">Price</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-14 text-slate-400">Cost</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-14 text-slate-400">Stock</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-14 text-slate-400 text-center">U/Pack</TableHead>
                                                  <TableHead className="font-black text-[9px] uppercase tracking-widest h-14 pr-6 text-slate-400">SKU Code</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody className="divide-y divide-slate-50">
                                              {variants.map((v, idx) => (
                                                  <TableRow key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                      <TableCell className="p-5 font-black text-slate-800 text-xs italic uppercase pl-6">
                                                          {v.name}
                                                      </TableCell>
                                                      <TableCell className="p-2">
                                                          <Input 
                                                              type="number" 
                                                              className="h-10 font-mono font-black text-blue-600 rounded-lg" 
                                                              value={v.price} 
                                                              onChange={e => updateVariant(idx, 'price', Number(e.target.value))}
                                                          />
                                                      </TableCell>
                                                      <TableCell className="p-2">
                                                          <Input 
                                                              type="number" 
                                                              className="h-10 font-mono text-slate-400 rounded-lg" 
                                                              value={v.cost_price} 
                                                              onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))}
                                                          />
                                                      </TableCell>
                                                      <TableCell className="p-2">
                                                          <Input 
                                                              type="number" 
                                                              className="h-10 font-mono font-black text-emerald-600 rounded-lg" 
                                                              value={v.stock_quantity} 
                                                              onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))}
                                                          />
                                                      </TableCell>
                                                      <TableCell className="p-2">
                                                          <Input 
                                                              type="number" 
                                                              className="h-10 font-mono text-center text-blue-400 font-bold rounded-lg" 
                                                              value={v.units_per_pack} 
                                                              onChange={e => updateVariant(idx, 'units_per_pack', Number(e.target.value))}
                                                          />
                                                      </TableCell>
                                                      <TableCell className="p-2 pr-6">
                                                          <Input 
                                                              className="h-10 font-mono uppercase text-[10px] rounded-lg tracking-widest" 
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
                              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border-4 border-dashed rounded-[3rem] bg-white opacity-40">
                                  <AlertCircle className="w-16 h-16 mb-4 opacity-10" />
                                  <p className="font-black uppercase tracking-[0.3em] text-[10px]">No Matrix Data Captured</p>
                              </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">
                              <span>Consolidated Assets: {variants.length}</span>
                              <Button variant="ghost" size="sm" className="font-black text-[10px] hover:text-blue-600" onClick={() => setActiveTab("configuration")}>
                                  RECONFIG ATTRIBUTES
                              </Button>
                          </div>
                      </TabsContent>
                  </Tabs>
              )}

          </div>

          <DialogFooter className="p-10 border-t mt-auto bg-slate-900 z-20 rounded-b-[3rem] flex items-center justify-between">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 h-14 px-8">
              ABORT
            </Button>
            <Button 
                onClick={() => mutate()} 
                disabled={isPending} 
                className="min-w-[240px] bg-blue-600 text-white font-black uppercase tracking-[0.2em] h-14 rounded-2xl shadow-[0_20px_50px_rgba(59,130,246,0.3)] hover:scale-105 transition-all"
            >
              {isPending ? (
                  <>
                      <Loader2 className="w-6 h-6 mr-4 animate-spin" /> SEALING RECORD...
                  </>
              ) : (
                  <>
                    <ShieldCheck className="w-6 h-6 mr-4 text-emerald-400" />
                    Seal Asset & Stock
                  </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD NEW UNIT DIALOG --- */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">New Fiduciary Unit</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">Define a custom unit of measure for the global registry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-8 py-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Formal Unit Designation</Label>
              <Input 
                placeholder="e.g. Kilogram" 
                className="h-14 shadow-inner bg-slate-50 border-slate-100 rounded-2xl font-black text-lg"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">ISO-Aligned Abbreviation</Label>
              <Input 
                placeholder="e.g. kg" 
                className="h-14 shadow-inner bg-slate-50 border-slate-100 rounded-2xl font-mono font-black text-2xl uppercase text-blue-600"
                value={newUnitAbbr}
                onChange={(e) => setNewUnitAbbr(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-8 -mx-10 -mb-10 mt-4 rounded-b-[2.5rem] border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="font-black text-xs uppercase tracking-widest h-12 px-6">CANCEL</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="bg-slate-900 text-white font-black px-10 h-12 rounded-2xl shadow-xl">
               {isSavingUnit ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="mr-3 w-5 h-5 text-blue-400" />}
               REGISTER UNIT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}