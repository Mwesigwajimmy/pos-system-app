'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
  SelectValue,
  SelectGroup,
  SelectLabel
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { 
  Plus, 
  Loader2, 
  Package, 
  CheckCircle2, 
  Search,
  Building2,
  MapPin,
  DollarSign,
  Trash2,
  Undo2,
  Layers
} from 'lucide-react';

import { Category } from '@/types/dashboard';

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

interface ProductManagementProps {
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

export default function ProductManagementConsole({ categories }: ProductManagementProps) {
  const [open, setOpen] = useState(false);
  const [uomSearchQuery, setUomSearchQuery] = useState(""); 
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [units, setUnits] = useState<Unit[]>([]);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbr, setNewUnitAbbr] = useState('');
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null); 
  const [uomId, setUomId] = useState<string | null>(null);
  const [taxCategoryCode, setTaxCategoryCode] = useState('STANDARD'); 
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...DEFAULT_VARIANT }]);
  const [activeTab, setActiveTab] = useState("configuration");
  const [attributes, setAttributes] = useState<AttributeBuilder[]>([
    { name: 'Color', inputValue: '', values: [] }
  ]);

  const { data: profile } = useQuery({
    queryKey: ['active_profile_currency'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('currency, business_id').eq('id', user?.id).single();
      return data;
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['business_locations', profile?.business_id],
    enabled: !!profile?.business_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('business_id', profile?.business_id)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (open) {
      const fetchUnits = async () => {
        const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation').eq('status', 'active'); 
        if (data) setUnits(data);
      };
      fetchUnits();
    }
  }, [open, supabase]);

  const filteredUnits = useMemo(() => {
    return units.filter(u => 
      u.name.toLowerCase().includes(uomSearchQuery.toLowerCase()) || 
      u.abbreviation.toLowerCase().includes(uomSearchQuery.toLowerCase())
    );
  }, [units, uomSearchQuery]);

  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !newUnitAbbr.trim()) return;
    setIsSavingUnit(true);
    try {
      const { data: newUnit, error } = await supabase.from('units_of_measure')
        .insert({ name: newUnitName, abbreviation: newUnitAbbr, business_id: profile?.business_id, status: 'active' })
        .select().single();
      if (error) throw error;
      setUnits(prev => [...prev, newUnit]);
      setUomId(String(newUnit.id));
      setIsUnitModalOpen(false);
      toast.success("Measurement unit added to system");
    } catch (err) { toast.error("Synchronization failed"); } finally { setIsSavingUnit(false); }
  };

  const generateVariants = () => {
    const validAttributes = attributes
      .map(attr => ({ name: attr.name.trim(), values: attr.inputValue.split(',').map(s => s.trim()).filter(Boolean) }))
      .filter(attr => attr.values.length > 0 && attr.name !== '');

    if (validAttributes.length === 0) return toast.error("Please add product options first");

    const cartesian = (arr: any[][]) => arr.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    let combinations = validAttributes.length === 1 ? validAttributes[0].values.map(v => [v]) : cartesian(validAttributes.map(a => a.values));

    setVariants(combinations.map((combo) => {
      const attrMap: Record<string, string> = {};
      validAttributes.forEach((attr, idx) => { attrMap[attr.name] = Array.isArray(combo) ? combo[idx] : combo; });
      return { 
          name: Array.isArray(combo) ? combo.join(' / ') : combo, 
          sku: '', 
          price: variants[0].price, 
          cost_price: variants[0].cost_price, 
          stock_quantity: 0, 
          units_per_pack: 1, 
          attributes: attrMap, 
          uom_id: null 
      };
    }));
    setActiveTab("preview"); 
  };

  const updateVariant = (index: number, field: keyof VariantDraft, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!locationId) throw new Error("Please select a storage branch");
      if (!productName.trim()) throw new Error("Please enter a product name");

      const { data: product, error: prodError } = await supabase.from('products').insert({
          name: productName,
          category_id: categoryId ? parseInt(categoryId) : null,
          uom_id: uomId || null, 
          business_id: profile?.business_id,
          location_id: locationId, 
          is_active: true,
          status: 'active',
          tax_category_code: taxCategoryCode.toUpperCase()
        }).select('id').single();

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
        location_id: locationId, 
        tax_category_code: taxCategoryCode.toUpperCase()
      }));

      const { error: varError } = await supabase.from('product_variants').insert(variantsPayload);
      if (varError) throw varError;
    },
    onSuccess: () => {
      toast.success("Product successfully added");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const resetForm = () => {
    setProductName(''); setCategoryId(null); setUomId(null); setTaxCategoryCode('STANDARD'); setLocationId(null); setUomSearchQuery("");
    setIsMultiVariant(false); setVariants([{ ...DEFAULT_VARIANT }]);
    setAttributes([{ name: 'Color', inputValue: '', values: [] }]); setActiveTab("configuration");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); setOpen(val); }}>
      <DialogTrigger asChild>
        <Button className="h-12 px-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest shadow-xl rounded-xl transition-all active:scale-95">
            <Plus size={18} className="mr-2" /> Add New Product
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-7xl w-full h-[100dvh] sm:h-[90vh] overflow-hidden flex flex-col p-0 border-none sm:rounded-[2rem] shadow-[0_40px_120px_rgba(0,0,0,0.25)] bg-white z-[9999] top-0 sm:top-1/2 !translate-y-0 sm:!translate-y-[-50%]">
        
        {/* HEADER SECTION - Clean, High-Contrast, Balanced */}
        <div className="px-8 sm:px-12 py-10 border-b border-slate-100 flex justify-between items-start bg-white shrink-0">
          <div className="space-y-1">
              <DialogTitle className="text-3xl font-bold text-slate-900 tracking-tight">Register Product</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-sm">
                Create and authorize official commercial inventory records.
              </DialogDescription>
          </div>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full h-10 border-slate-200 text-slate-500 font-bold px-6 text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all">
            <Undo2 size={14} className="mr-2" /> CANCEL REGISTRATION
          </Button>
        </div>

        {/* SCROLLABLE BODY SECTION */}
        <ScrollArea className="flex-1 w-full bg-white">
          <div className="p-8 sm:p-12 space-y-14">
            
            {/* 1. PRIMARY IDENTITY GRID - 4 Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Product Name</Label>
                    <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Full formal title" className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-semibold px-5 focus:bg-white transition-all shadow-sm" />
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Target Branch</Label>
                    <Select value={locationId || ''} onValueChange={setLocationId}>
                        <SelectTrigger className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-semibold px-5 text-slate-700">
                          <SelectValue placeholder="Select Location" />
                        </SelectTrigger>
                        <SelectContent>
                            {locations?.map(loc => (
                              <SelectItem key={loc.id} value={loc.id} className="font-semibold">{loc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Category</Label>
                    <Select value={categoryId || ''} onValueChange={setCategoryId}>
                        <SelectTrigger className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-semibold px-5 text-slate-700"><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>
                            {categories.map(c => <SelectItem key={c.id} value={String(c.id)} className="font-semibold">{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Tax Status</Label>
                    <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                      <SelectTrigger className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-semibold px-5 text-slate-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="STANDARD" className="font-semibold">Standard Business Tax</SelectItem>
                          <SelectItem value="EXEMPT" className="font-semibold">Tax Exempt (Zero Rated)</SelectItem>
                          <SelectItem value="REDUCED" className="font-semibold">Reduced Tax Rate</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 2. MEASUREMENT DETAILS HEADER */}
            <div className="space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                  <Package size={16} className="text-slate-400" />
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Structural Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Unit of Measure (UOM)</Label>
                        <div className="flex gap-4">
                          <Select value={uomId || ''} onValueChange={setUomId}>
                              <SelectTrigger className="flex-1 h-12 border-slate-100 bg-slate-50/50 rounded-xl font-semibold px-5">
                                <SelectValue placeholder="Select Units" />
                              </SelectTrigger>
                              <SelectContent className="p-0">
                                  <div className="p-3 bg-white border-b flex items-center gap-2 sticky top-0 z-10">
                                    <Search size={14} className="text-slate-300" />
                                    <input type="text" placeholder="Filter..." value={uomSearchQuery} onChange={(e) => setUomSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none font-semibold text-xs" onKeyDown={(e) => e.stopPropagation()} />
                                  </div>
                                  <ScrollArea className="h-60">
                                    <SelectGroup>
                                        <SelectItem value="pcs" className="font-semibold">Pieces (pcs)</SelectItem>
                                        <SelectItem value="box" className="font-semibold">Box (bx)</SelectItem>
                                        <SelectItem value="kg" className="font-semibold">Kilogram (kg)</SelectItem>
                                        {filteredUnits.map(u => (
                                          <SelectItem key={u.id} value={String(u.id)} className="font-semibold">{u.name} ({u.abbreviation})</SelectItem>
                                        ))}
                                    </SelectGroup>
                                  </ScrollArea>
                              </SelectContent>
                          </Select>
                          <Button variant="outline" onClick={() => setIsUnitModalOpen(true)} className="h-12 w-12 rounded-xl border-slate-100 text-slate-400 hover:bg-slate-50 transition-all">
                            <Plus size={20} />
                          </Button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50/30 border border-slate-100 h-12">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer">Product has variations (Size, Color, etc.)</Label>
                        <Switch checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                    </div>
                </div>
            </div>

            {/* 3. PRICING & INVENTORY MATRIX */}
            <div className="space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                  <DollarSign size={16} className="text-slate-400" />
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Inventory Matrix</span>
                </div>

                {!isMultiVariant ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Selling Price</Label>
                            <Input type="number" step="0.01" className="h-14 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-slate-900 text-lg px-6" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))} />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Buying Cost</Label>
                            <Input type="number" step="0.01" className="h-14 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-slate-500 text-lg px-6" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))} />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Initial Stock</Label>
                            <Input type="number" className="h-14 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-slate-900 text-lg px-6" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))} />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Unique SKU</Label>
                            <Input placeholder="AUTO" className="h-14 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-slate-900 uppercase tracking-wider px-6" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)} />
                        </div>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
                        <TabsList className="bg-slate-50 p-1.5 rounded-xl h-12 w-full max-w-sm border border-slate-100">
                            <TabsTrigger value="configuration" className="flex-1 rounded-lg font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">1. Properties</TabsTrigger>
                            <TabsTrigger value="preview" className="flex-1 rounded-lg font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm" disabled={variants.length <= 0}>2. Variation Matrix</TabsTrigger>
                        </TabsList>

                        <TabsContent value="configuration" className="space-y-8">
                            <div className="grid gap-6">
                              {attributes.map((attr, idx) => (
                                  <div key={idx} className="flex gap-6 items-end bg-slate-50/30 p-6 rounded-2xl border border-slate-100">
                                      <div className="w-1/3 space-y-3">
                                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property Label</Label>
                                          <Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} placeholder="e.g. Size" className="h-12 border-slate-100 bg-white rounded-xl font-semibold px-5" />
                                      </div>
                                      <div className="flex-1 space-y-3">
                                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Values (Comma separated)</Label>
                                          <Input value={attr.inputValue} onChange={e => { const updated = [...attributes]; updated[idx].inputValue = e.target.value; setAttributes(updated); }} placeholder="Small, Medium, Large" className="h-12 border-slate-100 bg-white rounded-xl font-semibold px-5" />
                                      </div>
                                      <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 h-12 w-12 transition-colors">
                                          <Trash2 size={20} />
                                      </Button>
                                  </div>
                              ))}
                            </div>
                            <div className="flex justify-between items-center pt-4">
                                <Button variant="ghost" onClick={() => setAttributes([...attributes, { name: '', inputValue: '', values: [] }])} className="h-12 px-6 text-slate-500 font-bold text-[10px] uppercase tracking-widest gap-2">
                                  <Plus size={16} /> ADD ANOTHER PROPERTY
                                </Button>
                                <Button onClick={generateVariants} className="h-12 px-8 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200">
                                  Generate Variation Matrix
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview">
                            <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                              <Table>
                                  <TableHeader className="bg-slate-50/50">
                                      <TableRow className="h-14 border-none">
                                          <TableHead className="px-8 font-bold uppercase text-slate-400 text-[10px] tracking-widest">Variation Identity</TableHead>
                                          <TableHead className="text-center font-bold uppercase text-slate-400 text-[10px] tracking-widest">Retail Price</TableHead>
                                          <TableHead className="text-center font-bold uppercase text-slate-400 text-[10px] tracking-widest">Unit Cost</TableHead>
                                          <TableHead className="text-center font-bold uppercase text-slate-400 text-[10px] tracking-widest">Initial Stock</TableHead>
                                          <TableHead className="px-8 text-right font-bold uppercase text-slate-400 text-[10px] tracking-widest">Unique SKU</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {variants.map((v, idx) => (
                                          <TableRow key={idx} className="h-20 border-b border-slate-50 last:border-none hover:bg-slate-50/30 transition-colors">
                                              <TableCell className="px-8 text-sm font-bold text-slate-900">{v.name}</TableCell>
                                              <TableCell className="text-center"><Input type="number" step="0.01" className="h-10 w-28 border-slate-100 text-slate-900 font-bold rounded-lg text-center mx-auto" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} /></TableCell>
                                              <TableCell className="text-center"><Input type="number" step="0.01" className="h-10 w-28 border-slate-100 text-slate-500 font-semibold rounded-lg text-center mx-auto" value={v.cost_price} onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))} /></TableCell>
                                              <TableCell className="text-center"><Input type="number" className="h-10 w-28 border-slate-100 text-slate-900 font-bold rounded-lg text-center mx-auto" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))} /></TableCell>
                                              <TableCell className="px-8"><Input className="h-10 border-slate-100 rounded-lg text-right font-semibold text-xs" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="AUTO" /></TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
          </div>
        </ScrollArea>

        {/* FOOTER SECTION - Clean, High Contrast Primary Action */}
        <DialogFooter className="px-8 sm:px-12 py-10 bg-slate-50 border-t border-slate-100 flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-4 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Product Node Ready for Authorization
          </div>
          <Button onClick={() => mutate()} disabled={isPending} className="h-14 w-full sm:w-auto px-16 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-[0.15em] rounded-xl shadow-[0_20px_40px_rgba(37,99,235,0.25)] transition-all active:scale-95 border-none">
            {isPending ? <Loader2 size={24} className="animate-spin" /> : (
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} />
                <span>AUTHORIZE & SAVE PRODUCT</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* MEASUREMENT NODE MODAL */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="max-w-md rounded-[1.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white z-[12000]">
          <div className="px-10 py-10 bg-slate-900 text-white">
            <h3 className="text-lg font-bold uppercase tracking-widest">Add Measurement Node</h3>
            <p className="text-slate-400 text-[10px] font-medium mt-1">Registering unique unit of measure.</p>
          </div>
          <div className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standard Name</Label>
              <Input placeholder="e.g. Metric Tonne" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-12 border-slate-100 bg-slate-50 font-semibold rounded-xl px-5" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abbreviation</Label>
              <Input placeholder="e.g. MT" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)} className="h-12 border-slate-100 bg-slate-50 font-bold rounded-xl px-5 uppercase" />
            </div>
          </div>
          <div className="px-10 py-8 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-12 px-6 font-bold text-[10px] uppercase tracking-widest text-slate-400">CANCEL</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="h-12 px-8 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg flex-1">
               {isSavingUnit ? <Loader2 className="animate-spin w-5 h-5" /> : "COMMIT NODE"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}