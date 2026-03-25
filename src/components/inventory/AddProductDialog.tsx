'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// UI Components
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import { 
  Plus, 
  Trash, 
  Wand2, 
  Loader2, 
  Package, 
  Layers, 
  Save, 
  Calculator, 
  CheckCircle2, 
  X,
  Info
} from 'lucide-react';

import { Category } from '@/types/dashboard';

// --- Interfaces ---
interface Unit {
  id: string;
  name: string;
  abbreviation: string;
}

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
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Reference Data State
  const [units, setUnits] = useState<Unit[]>([]);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbr, setNewUnitAbbr] = useState('');
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // Form State
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [uomId, setUomId] = useState<string | null>(null);
  const [taxCategoryCode, setTaxCategoryCode] = useState('STANDARD'); 
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...DEFAULT_VARIANT }]);
  const [activeTab, setActiveTab] = useState("configuration");
  const [attributes, setAttributes] = useState<AttributeBuilder[]>([
    { name: 'Size', inputValue: '', values: [] }
  ]);

  // Fetch Units
  useEffect(() => {
    if (open) {
      const fetchUnits = async () => {
        const { data, error } = await supabase
          .from('units_of_measure')
          .select('id, name, abbreviation')
          .eq('status', 'active'); 
        if (data) setUnits(data);
      };
      fetchUnits();
    }
  }, [open, supabase]);

  // Handle New Unit Creation
  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !newUnitAbbr.trim()) {
      toast.error("Enter unit name and abbreviation.");
      return;
    }
    setIsSavingUnit(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user?.id).single();

      const { data: newUnit, error } = await supabase
        .from('units_of_measure')
        .insert({
          name: newUnitName,
          abbreviation: newUnitAbbr,
          business_id: profile?.business_id,
          status: 'active'
        })
        .select().single();

      if (error) throw error;
      setUnits(prev => [...prev, newUnit]);
      setUomId(String(newUnit.id));
      toast.success("Unit added");
      setNewUnitName('');
      setNewUnitAbbr('');
      setIsUnitModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to add unit.");
    } finally {
      setIsSavingUnit(false);
    }
  };

  // Variant Generation Logic
  const generateVariants = () => {
    const validAttributes = attributes
      .map(attr => ({
        name: attr.name.trim(),
        values: attr.inputValue.split(',').map(s => s.trim()).filter(Boolean)
      }))
      .filter(attr => attr.values.length > 0 && attr.name !== '');

    if (validAttributes.length === 0) {
      toast.error("Define at least one attribute with values.");
      return;
    }

    const cartesianProduct = (arr: any[][]) => arr.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    let combinations: string[][];
    if (validAttributes.length === 1) {
        combinations = validAttributes[0].values.map(v => [v]);
    } else {
        combinations = cartesianProduct(validAttributes.map(a => a.values));
    }

    const newVariants: VariantDraft[] = combinations.map((combo) => {
      const comboArr = Array.isArray(combo) ? combo : [combo];
      const attrMap: Record<string, string> = {};
      validAttributes.forEach((attr, idx) => { attrMap[attr.name] = comboArr[idx]; });

      return {
        name: comboArr.join(' / '),
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
    setActiveTab("preview"); 
  };

  const updateVariant = (index: number, field: keyof VariantDraft, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  // Submission Logic
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!productName.trim()) throw new Error("Product name is required.");
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('business_id, tenant_id').eq('id', user?.id).single();
      
      const { data: product, error: prodError } = await supabase.from('products').insert({
          name: productName,
          category_id: categoryId ? parseInt(categoryId) : null,
          uom_id: uomId || null, 
          business_id: profile?.business_id,
          tenant_id: profile?.tenant_id,
          is_active: true,
          status: 'active',
          tax_category_code: taxCategoryCode.toUpperCase()
        }).select().single();

      if (prodError) throw prodError;

      const variantsPayload = variants.map(v => ({
        product_id: product.id,
        name: v.name,
        sku: v.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        price: Number(v.price),
        selling_price: Number(v.price), 
        cost_price: Number(v.cost_price),
        stock_quantity: Number(v.stock_quantity),
        status: 'active', 
        units_per_pack: Number(v.units_per_pack) || 1, 
        attributes: v.attributes,
        uom_id: v.uom_id || uomId || null, 
        business_id: profile?.business_id,
        tenant_id: profile?.tenant_id,
        tax_category_code: taxCategoryCode.toUpperCase()
      }));

      const { error: varError } = await supabase.from('product_variants').insert(variantsPayload);
      if (varError) throw varError;
      return product;
    },
    onSuccess: () => {
      toast.success("Product saved successfully");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save.");
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
      <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); setOpen(val); }}>
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add New Product
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-[850px] max-h-[95vh] overflow-hidden flex flex-col p-0 border-none rounded-2xl shadow-2xl">
          <DialogHeader className="p-8 border-b bg-white">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                    <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <DialogTitle className="text-2xl font-bold text-slate-900">New Product</DialogTitle>
                    <DialogDescription className="text-slate-500">
                      Setup product information, pricing, and stock levels.
                    </DialogDescription>
                </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-tight">Product Name</Label>
                      <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Wireless Headphones" className="h-10 border-slate-200 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-tight">Category</Label>
                      <Select value={categoryId || ''} onValueChange={setCategoryId}>
                          <SelectTrigger className="h-10 border-slate-200"><SelectValue placeholder="Select Category" /></SelectTrigger>
                          <SelectContent>
                              {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-tight">Tax Rate</Label>
                      <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                        <SelectTrigger className="h-10 border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="STANDARD">Standard Rate</SelectItem>
                            <SelectItem value="EXEMPT">Tax Exempt</SelectItem>
                            <SelectItem value="REDUCED">Reduced Rate</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
              </div>

              {/* Unit & Mode Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end border-t border-slate-50 pt-8">
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-tight">Base Unit</Label>
                      <div className="flex gap-2">
                        <Select value={uomId || ''} onValueChange={setUomId}>
                            <SelectTrigger className="flex-1 h-10 border-slate-200"><SelectValue placeholder="Pcs, Kg, Box..." /></SelectTrigger>
                            <SelectContent>
                                {units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.abbreviation})</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200 text-blue-600 hover:bg-blue-50" onClick={() => setIsUnitModalOpen(true)} type="button">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-100 h-11">
                      <Switch checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                      <Label className="text-sm font-semibold text-slate-600">This product has variants (e.g. Size, Color)</Label>
                  </div>
              </div>

              {/* Inventory Details */}
              {!isMultiVariant ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 shadow-sm">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-blue-700 uppercase">Selling Price</Label>
                          <Input type="number" className="h-10 border-slate-200 bg-white" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Cost Price</Label>
                          <Input type="number" className="h-10 border-slate-200 bg-white" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-emerald-600 uppercase">Stock</Label>
                          <Input type="number" className="h-10 border-slate-200 bg-white" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Units/Pack</Label>
                          <Input type="number" className="h-10 border-slate-200 bg-white" value={variants[0].units_per_pack} onChange={(e) => updateVariant(0, 'units_per_pack', Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">SKU</Label>
                          <Input placeholder="Auto" className="h-10 border-slate-200 bg-white" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)} />
                      </div>
                  </div>
              ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                      <TabsList className="bg-slate-100 p-1 rounded-xl">
                          <TabsTrigger value="configuration" className="rounded-lg px-8 py-2">1. Attributes</TabsTrigger>
                          <TabsTrigger value="preview" className="rounded-lg px-8 py-2" disabled={variants.length <= 0}>2. Variants</TabsTrigger>
                      </TabsList>

                      <TabsContent value="configuration" className="space-y-6">
                          <div className="grid gap-4">
                            {attributes.map((attr, idx) => (
                                <div key={idx} className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="w-1/3 space-y-2">
                                        <Label className="text-xs font-bold text-slate-600 uppercase">Attribute Name</Label>
                                        <Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} placeholder="e.g. Size" className="h-10 bg-white" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-xs font-bold text-slate-600 uppercase">Values (Comma separated)</Label>
                                        <Input value={attr.inputValue} onChange={e => { const updated = [...attributes]; updated[idx].inputValue = e.target.value; setAttributes(updated); }} placeholder="S, M, L" className="h-10 bg-white" />
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 h-10 w-10">
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-xl border border-dashed border-blue-200">
                              <Button variant="outline" size="sm" onClick={() => setAttributes([...attributes, { name: '', inputValue: '', values: [] }])} className="border-blue-200 text-blue-700 bg-white hover:bg-blue-50">
                                <Plus className="w-4 h-4 mr-2" /> Add Attribute
                              </Button>
                              <Button type="button" size="sm" onClick={generateVariants} className="bg-slate-900 text-white shadow-md">
                                <Wand2 className="w-4 h-4 mr-2" /> Generate Matrix
                              </Button>
                          </div>
                      </TabsContent>

                      <TabsContent value="preview">
                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              <ScrollArea className="max-h-[400px]">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold text-slate-500 uppercase">Variant</TableHead>
                                            <TableHead className="text-xs font-bold text-slate-500 uppercase">Price</TableHead>
                                            <TableHead className="text-xs font-bold text-slate-500 uppercase">Cost</TableHead>
                                            <TableHead className="text-xs font-bold text-slate-500 uppercase">Stock</TableHead>
                                            <TableHead className="text-xs font-bold text-slate-500 uppercase">SKU</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {variants.map((v, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-xs font-bold text-slate-800">{v.name}</TableCell>
                                                <TableCell><Input type="number" className="h-8 w-24 text-blue-600 font-bold" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} /></TableCell>
                                                <TableCell><Input type="number" className="h-8 w-24" value={v.cost_price} onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))} /></TableCell>
                                                <TableCell><Input type="number" className="h-8 w-24 text-emerald-600 font-bold" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))} /></TableCell>
                                                <TableCell><Input className="h-8 w-32 uppercase text-[10px] tracking-wider" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="Auto" /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                              </ScrollArea>
                          </div>
                      </TabsContent>
                  </Tabs>
              )}
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t flex justify-between items-center sm:justify-between">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-slate-500 font-bold px-8">
              Cancel
            </Button>
            <Button onClick={() => mutate()} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-12 h-11 shadow-lg shadow-blue-200">
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Save Product</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW UNIT DIALOG */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
          <DialogHeader className="p-8 bg-white border-b">
            <DialogTitle className="text-xl font-bold">Add New Unit</DialogTitle>
            <DialogDescription>Create a measurement unit for your inventory.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Unit Name</Label>
              <Input placeholder="e.g. Kilogram" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-10 border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Abbreviation</Label>
              <Input placeholder="e.g. kg" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)} className="h-10 border-slate-200 uppercase font-mono" />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="font-bold">Cancel</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="bg-slate-900 text-white px-6">
               {isSavingUnit ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}