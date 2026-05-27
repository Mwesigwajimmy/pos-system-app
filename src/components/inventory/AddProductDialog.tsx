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
  Trash, 
  Wand2, 
  Loader2, 
  Package, 
  Search, 
  MapPin, 
  Building2, 
  DollarSign, 
  Tag, 
  Boxes,
  RotateCcw,
  LayoutGrid,
  Info
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
      toast.success("Measurement unit added");
    } catch (err) { toast.error("Failed to add unit"); } finally { setIsSavingUnit(false); }
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
      if (!locationId) throw new Error("Please select a target branch");
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
      toast.success("Product registered successfully");
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
        <Button className="h-10 px-6 bg-[#1a1a1a] hover:bg-black text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all">
            <Plus size={16} className="mr-2" /> Add New Product
        </Button>
      </DialogTrigger>
      
      {/* 
         CLEAN INTERFACE: Removed full-screen "Engine" look. 
         Now matches the Invoice form: Clean, White, Contained.
      */}
      <DialogContent className="sm:max-w-5xl w-full h-[95vh] sm:h-[85vh] overflow-hidden flex flex-col p-0 border-none rounded-xl shadow-2xl bg-[#f8fafc]">
        
        {/* HEADER: Matches the "Generate Tax Invoice" style */}
        <div className="px-8 py-10 bg-white border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-[#0F172A]">Register Product</h2>
                  <p className="text-sm text-slate-500 font-medium">Create and authorize official commercial inventory records.</p>
              </div>
              <Button variant="outline" onClick={() => setOpen(false)} className="w-fit h-10 px-4 border-slate-200 text-slate-600 font-bold text-xs uppercase gap-2 hover:bg-slate-50 rounded-lg">
                <RotateCcw size={14} /> Cancel Registration
              </Button>
          </div>
        </div>

        {/* CONTENT AREA: Integrated clean sections */}
        <ScrollArea className="flex-1 w-full bg-white">
          <div className="p-8 space-y-12">
            
            {/* Row 1: Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Name</Label>
                    <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Full formal title" className="h-12 border-slate-100 bg-[#f8fafc] rounded-xl font-medium px-4 focus:bg-white" />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Branch</Label>
                    <Select value={locationId || ''} onValueChange={setLocationId}>
                        <SelectTrigger className="h-12 border-slate-100 bg-[#f8fafc] rounded-xl font-medium px-4">
                          <SelectValue placeholder="Select Location" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                            {locations?.map(loc => (
                              <SelectItem key={loc.id} value={loc.id}>
                                <div className="flex items-center gap-2"><Building2 size={14} className="text-slate-400" /> {loc.name}</div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</Label>
                    <Select value={categoryId || ''} onValueChange={setCategoryId}>
                        <SelectTrigger className="h-12 border-slate-100 bg-[#f8fafc] rounded-xl font-medium px-4"><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent className="z-[10000]">
                            {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tax Status</Label>
                    <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                      <SelectTrigger className="h-12 border-slate-100 bg-[#f8fafc] rounded-xl font-medium px-4"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[10000]">
                          <SelectItem value="STANDARD">Standard Business Tax</SelectItem>
                          <SelectItem value="EXEMPT">Tax Exempt (Zero Rated)</SelectItem>
                          <SelectItem value="REDUCED">Reduced Tax Rate</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Section Header: Structural Details */}
            <div className="space-y-6 pt-2">
                <div className="flex items-center gap-3 text-slate-900 border-b border-slate-50 pb-4">
                    <LayoutGrid size={18} className="text-blue-600" />
                    <span className="text-xs font-black uppercase tracking-widest">Structural Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit of Measure (UOM)</Label>
                        <div className="flex gap-2">
                          <Select value={uomId || ''} onValueChange={setUomId}>
                              <SelectTrigger className="flex-1 h-12 border-slate-100 bg-[#f8fafc] rounded-xl font-medium px-4">
                                <SelectValue placeholder="Select Units" />
                              </SelectTrigger>
                              <SelectContent className="p-0 z-[10000]">
                                  <div className="p-2 bg-white border-b flex items-center gap-2 sticky top-0 z-10">
                                    <Search size={14} className="text-slate-300" />
                                    <input type="text" placeholder="Filter..." value={uomSearchQuery} onChange={(e) => setUomSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none font-medium text-xs" onKeyDown={(e) => e.stopPropagation()} />
                                  </div>
                                  <ScrollArea className="h-60">
                                    <SelectGroup>
                                        <SelectLabel className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase">Standards</SelectLabel>
                                        <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                                        <SelectItem value="box">Box (bx)</SelectItem>
                                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                        <SelectItem value="ltr">Liter (ltr)</SelectItem>
                                    </SelectGroup>
                                    {filteredUnits.length > 0 && (
                                      <SelectGroup>
                                        <SelectLabel className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase border-t mt-2">Custom</SelectLabel>
                                        {filteredUnits.map(u => (<SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.abbreviation})</SelectItem>))}
                                      </SelectGroup>
                                    )}
                                  </ScrollArea>
                              </SelectContent>
                          </Select>
                          <Button variant="outline" onClick={() => setIsUnitModalOpen(true)} className="h-12 w-12 rounded-xl border-slate-100 bg-[#f8fafc] text-blue-600 hover:bg-blue-50">
                            <Plus size={20} />
                          </Button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 px-5 rounded-xl bg-[#f8fafc] border border-slate-100 h-12">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-1 cursor-pointer">Product has variations (Size, Color, etc.)</Label>
                        <Switch checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                    </div>
                </div>
            </div>

            {/* Section: Inventory & Pricing */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 border-b border-slate-50 pb-4">
                    <DollarSign size={18} className="text-blue-600" />
                    <span className="text-xs font-black uppercase tracking-widest">Inventory & Pricing</span>
                </div>

                {!isMultiVariant ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retail Price</Label>
                            <Input type="number" step="0.01" className="h-12 border-slate-100 bg-[#f8fafc] rounded-xl font-bold text-slate-900" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Price</Label>
                            <Input type="number" step="0.01" className="h-12 border-slate-100 bg-[#f8fafc] rounded-xl font-bold text-slate-900" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Stock</Label>
                            <Input type="number" className="h-12 border-slate-100 bg-[#f8fafc] rounded-xl font-bold text-slate-900" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Code / SKU</Label>
                            <Input placeholder="Auto-generated" className="h-12 border-slate-100 bg-[#f8fafc] rounded-xl font-bold text-slate-900 uppercase" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)} />
                        </div>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-slate-100 p-1 rounded-lg h-10 w-fit">
                            <TabsTrigger value="configuration" className="rounded-md font-bold text-[10px] uppercase tracking-wider px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">1. Set Options</TabsTrigger>
                            <TabsTrigger value="preview" className="rounded-md font-bold text-[10px] uppercase tracking-wider px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm" disabled={variants.length <= 0}>2. Edit Matrix</TabsTrigger>
                        </TabsList>

                        <TabsContent value="configuration" className="space-y-6">
                            {attributes.map((attr, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row gap-4 items-end bg-[#f8fafc] p-6 rounded-xl border border-slate-100">
                                    <div className="w-full sm:w-1/4 space-y-2">
                                        <Label className="text-[9px] font-bold text-slate-400 uppercase">Property Name</Label>
                                        <Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} placeholder="e.g. Size" className="h-10 border-slate-100 bg-white rounded-lg font-medium" />
                                    </div>
                                    <div className="w-full flex-1 space-y-2">
                                        <Label className="text-[9px] font-bold text-slate-400 uppercase">Values (Comma separated)</Label>
                                        <Input value={attr.inputValue} onChange={e => { const updated = [...attributes]; updated[idx].inputValue = e.target.value; setAttributes(updated); }} placeholder="Small, Large, XL" className="h-10 border-slate-100 bg-white rounded-lg font-medium" />
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 h-10 w-10">
                                        <Trash size={18} />
                                    </Button>
                                </div>
                            ))}
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-dashed border-slate-200">
                                <Button variant="ghost" onClick={() => setAttributes([...attributes, { name: '', inputValue: '', values: [] }])} className="h-10 px-4 text-blue-600 font-bold text-[10px] uppercase gap-2 hover:bg-blue-50">
                                  <Plus size={16} /> Add Property
                                </Button>
                                <Button type="button" onClick={generateVariants} className="h-10 px-6 bg-[#0F172A] text-white font-bold text-[10px] uppercase tracking-wider rounded-lg">
                                  <Wand2 size={16} className="mr-2" /> Generate Matrix
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview">
                            <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                              <ScrollArea className="w-full">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="h-12">
                                            <TableHead className="px-6 font-bold uppercase text-slate-500 text-[9px] tracking-wider">Variation</TableHead>
                                            <TableHead className="text-center font-bold uppercase text-slate-500 text-[9px] tracking-wider">Retail Price</TableHead>
                                            <TableHead className="text-center font-bold uppercase text-slate-500 text-[9px] tracking-wider">Unit Cost</TableHead>
                                            <TableHead className="text-center font-bold uppercase text-slate-500 text-[9px] tracking-wider">Initial Stock</TableHead>
                                            <TableHead className="px-6 text-right font-bold uppercase text-slate-500 text-[9px] tracking-wider">Unique SKU</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {variants.map((v, idx) => (
                                            <TableRow key={idx} className="h-16 border-b border-slate-50 last:border-none">
                                                <TableCell className="px-6 text-xs font-bold text-slate-900">{v.name}</TableCell>
                                                <TableCell><Input type="number" step="0.01" className="h-9 w-24 border-slate-100 bg-[#f8fafc] font-bold text-center mx-auto rounded-md text-xs" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} /></TableCell>
                                                <TableCell><Input type="number" step="0.01" className="h-9 w-24 border-slate-100 bg-[#f8fafc] font-medium text-center mx-auto rounded-md text-xs text-slate-500" value={v.cost_price} onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))} /></TableCell>
                                                <TableCell><Input type="number" className="h-9 w-24 border-slate-100 bg-[#f8fafc] font-bold text-center mx-auto rounded-md text-xs text-blue-600" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))} /></TableCell>
                                                <TableCell className="px-6"><Input className="h-9 w-full border-slate-100 rounded-md uppercase text-[10px] font-bold text-right px-3 bg-[#f8fafc]" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="AUTO" /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <ScrollBar orientation="horizontal" />
                              </ScrollArea>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
            <div className="h-10" />
          </div>
        </ScrollArea>

        {/* FOOTER: Fixed clean action bar */}
        <div className="px-8 py-6 bg-slate-50 border-t flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <Info size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Manual entry node</span>
          </div>
          <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)} className="h-10 px-6 font-bold text-slate-500 uppercase tracking-widest text-[10px] hover:bg-slate-100 rounded-lg">Discard Draft</Button>
              <Button onClick={() => mutate()} disabled={isPending} className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm transition-all active:scale-95">
                {isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Authorize & Commit
              </Button>
          </div>
        </div>
      </DialogContent>

      {/* UNIT BUILDER: Kept separate for clean UX */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden border-none shadow-2xl bg-white z-[12000]">
          <DialogHeader className="px-8 py-8 bg-[#0F172A] text-white">
            <DialogTitle className="text-lg font-bold">New Measurement Unit</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">Register a new UOM for your inventory system.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name (e.g. Kilogram)</Label>
              <Input placeholder="Enter unit name" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-12 border-slate-100 bg-[#f8fafc] font-medium rounded-xl px-4" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abbreviation (e.g. KG)</Label>
              <Input placeholder="KG" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)} className="h-12 border-slate-100 bg-[#f8fafc] font-bold rounded-xl px-4 uppercase text-center text-lg" />
            </div>
          </div>
          <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-10 font-bold text-[10px] uppercase text-slate-400">Cancel</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase rounded-lg flex-1">
               {isSavingUnit ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}