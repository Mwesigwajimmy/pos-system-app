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
  DialogTitle 
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
import { Card, CardContent } from "@/components/ui/card";

import { 
  Plus, 
  Trash, 
  Wand2, 
  Loader2, 
  Search,
  LayoutGrid,
  DollarSign,
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  Package,
  Layers,
  ArrowLeft,
  ShieldCheck,
  Globe,
  Database
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

export default function ProductRegistrationTerminal({ categories }: ProductManagementProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // --- STATE MANAGEMENT ---
  const [uomSearchQuery, setUomSearchQuery] = useState(""); 
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

  // --- DATA FETCHING ---
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
    const fetchUnits = async () => {
      const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation').eq('status', 'active'); 
      if (data) setUnits(data);
    };
    fetchUnits();
  }, [supabase]);

  const filteredUnits = useMemo(() => {
    return units.filter(u => 
      u.name.toLowerCase().includes(uomSearchQuery.toLowerCase()) || 
      u.abbreviation.toLowerCase().includes(uomSearchQuery.toLowerCase())
    );
  }, [units, uomSearchQuery]);

  // --- LOGIC HANDLERS ---
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
    toast.success("Inventory matrix computed");
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
      toast.success("Product successfully added to registry");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
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
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-8 px-4 md:px-8 space-y-10 animate-in fade-in duration-500">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400 hover:text-slate-900 cursor-pointer transition-colors mb-2">
                <ArrowLeft size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Return to Inventory Ledger</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Register Product</h1>
            <div className="flex items-center gap-4">
               <p className="text-sm font-medium text-slate-500">Create and authorize official commercial inventory records.</p>
               <div className="h-4 w-px bg-slate-200 hidden md:block" />
               <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Database size={14} className="text-blue-500" /> System ID: PRD-REG-{profile?.business_id?.substring(0,6).toUpperCase()}
               </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <Button variant="outline" onClick={resetForm} className="h-12 px-6 border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-50 rounded-xl flex-1 md:flex-none">
               <RotateCcw size={16} /> Discard Draft
            </Button>
          </div>
        </div>

        {/* --- MAIN FORM CONTENT --- */}
        <div className="grid grid-cols-1 gap-12 pb-24">
            
            {/* SECTION 1: REGISTRY ATTRIBUTES */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-blue-50 rounded-lg"><Package size={20} className="text-blue-600" /></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Primary Registry Attributes</span>
                </div>

                <Card className="rounded-2xl border-slate-100 shadow-sm p-8 bg-slate-50/20">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Official Product Name</Label>
                            <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Full formal title" className="h-12 border-slate-200 bg-white rounded-xl font-bold text-slate-900 px-4 focus:ring-1 focus:ring-blue-100" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Target Storage Branch</Label>
                            <Select value={locationId || ''} onValueChange={setLocationId}>
                                <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-bold px-4">
                                  <SelectValue placeholder="Select Location" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations?.map(loc => (
                                      <SelectItem key={loc.id} value={loc.id} className="font-bold">
                                          {loc.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Inventory Category</Label>
                            <Select value={categoryId || ''} onValueChange={setCategoryId}>
                                <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-bold px-4">
                                  <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)} className="font-bold">{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tax Classification</Label>
                            <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                              <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-bold px-4">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="STANDARD" className="font-bold text-slate-900">Standard Business Tax</SelectItem>
                                  <SelectItem value="EXEMPT" className="font-bold text-emerald-600">Tax Exempt (Zero Rated)</SelectItem>
                                  <SelectItem value="REDUCED" className="font-bold text-amber-600">Reduced Tax Rate</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                    </div>
                </Card>
            </div>

            {/* SECTION 2: STRUCTURAL CONFIGURATION */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-purple-50 rounded-lg"><Layers size={20} className="text-purple-600" /></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Structural Configuration</span>
                </div>

                <Card className="rounded-2xl border-slate-100 shadow-sm p-8 bg-slate-50/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Metric Unit of Measure (UOM)</Label>
                            <div className="flex gap-2">
                              <Select value={uomId || ''} onValueChange={setUomId}>
                                  <SelectTrigger className="flex-1 h-12 border-slate-200 bg-white rounded-xl font-bold px-4">
                                    <SelectValue placeholder="Select Measurement Node" />
                                  </SelectTrigger>
                                  <SelectContent className="p-0">
                                      <div className="p-4 bg-slate-50 border-b flex items-center gap-2 sticky top-0 z-10">
                                        <Search size={14} className="text-slate-400" />
                                        <input 
                                          type="text"
                                          placeholder="Search metrics..."
                                          value={uomSearchQuery}
                                          onChange={(e) => setUomSearchQuery(e.target.value)}
                                          className="w-full bg-transparent border-none outline-none font-bold text-[11px] placeholder:text-slate-300"
                                        />
                                      </div>
                                      <ScrollArea className="h-64">
                                        <SelectGroup>
                                            <SelectLabel className="px-4 py-3 text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Global Standards</SelectLabel>
                                            <SelectItem value="pcs" className="font-bold">Pieces (pcs)</SelectItem>
                                            <SelectItem value="box" className="font-bold">Box (bx)</SelectItem>
                                            <SelectItem value="kg" className="font-bold">Kilogram (kg)</SelectItem>
                                            <SelectItem value="ltr" className="font-bold">Liter (ltr)</SelectItem>
                                        </SelectGroup>
                                        {filteredUnits.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel className="px-4 py-3 text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] border-t mt-4">Custom Node Registry</SelectLabel>
                                                {filteredUnits.map(u => (
                                                <SelectItem key={u.id} value={String(u.id)} className="font-bold">
                                                    {u.name} ({u.abbreviation})
                                                </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )}
                                      </ScrollArea>
                                  </SelectContent>
                              </Select>
                              <Button variant="outline" onClick={() => setIsUnitModalOpen(true)} className="h-12 w-12 rounded-xl border-slate-200 bg-white text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                                <Plus size={20} />
                              </Button>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 p-4 px-6 rounded-2xl bg-white border border-slate-200 h-12 shadow-sm transition-all hover:border-blue-200 group">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-1 cursor-pointer group-hover:text-slate-900">Define Product Variations (Size, Color, etc.)</Label>
                            <Switch checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* SECTION 3: INVENTORY MATRIX */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-amber-50 rounded-lg"><DollarSign size={20} className="text-amber-600" /></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Financial & Inventory Matrix</span>
                </div>

                {!isMultiVariant ? (
                    <Card className="rounded-2xl border-slate-100 shadow-sm p-8 bg-slate-50/20">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Retail Valuation</Label>
                                <Input type="number" step="0.01" className="h-12 border-slate-200 bg-white rounded-xl font-black text-slate-900 px-4 text-xl" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Acquisition Cost</Label>
                                <Input type="number" step="0.01" className="h-12 border-slate-200 bg-white rounded-xl font-black text-slate-400 px-4 text-xl" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Opening Stock Quantity</Label>
                                <Input type="number" className="h-12 border-slate-200 bg-white rounded-xl font-black text-blue-600 px-4 text-xl" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Unique Global SKU</Label>
                                <Input placeholder="Auto-generated if empty" className="h-12 border-slate-200 bg-white rounded-xl font-black uppercase text-xs tracking-widest px-4" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)} />
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-8 animate-in slide-in-from-top duration-300">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                            <TabsList className="bg-slate-100 p-1 rounded-xl h-12 w-full max-w-md border border-slate-200">
                                <TabsTrigger value="configuration" className="flex-1 rounded-lg font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">1. Property Nodes</TabsTrigger>
                                <TabsTrigger value="preview" className="flex-1 rounded-lg font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600" disabled={variants.length <= 0}>2. Multi-Variate Matrix</TabsTrigger>
                            </TabsList>

                            <TabsContent value="configuration" className="space-y-8">
                                <div className="grid gap-6">
                                  {attributes.map((attr, idx) => (
                                      <Card key={idx} className="flex flex-col sm:flex-row gap-8 items-end p-8 rounded-2xl border-slate-100 bg-slate-50/30">
                                          <div className="w-full sm:w-1/3 space-y-2">
                                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property Node (e.g. Size)</Label>
                                              <Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} placeholder="Property Name" className="h-11 border-slate-200 bg-white rounded-xl font-bold" />
                                          </div>
                                          <div className="w-full flex-1 space-y-2">
                                              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variation Values (Separated by Comma)</Label>
                                              <Input value={attr.inputValue} onChange={e => { const updated = [...attributes]; updated[idx].inputValue = e.target.value; setAttributes(updated); }} placeholder="Small, Medium, Large" className="h-11 border-slate-200 bg-white rounded-xl font-bold" />
                                          </div>
                                          <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 h-11 w-11 rounded-xl transition-all">
                                              <Trash size={20} />
                                          </Button>
                                      </Card>
                                  ))}
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-8 rounded-2xl border border-dashed border-slate-200 gap-6">
                                    <Button variant="ghost" onClick={() => setAttributes([...attributes, { name: '', inputValue: '', values: [] }])} className="h-12 px-8 text-blue-600 font-bold text-[10px] uppercase tracking-widest gap-2 hover:bg-blue-50 border border-blue-100 rounded-xl">
                                      <PlusCircle size={18} /> Add Property Node
                                    </Button>
                                    <Button type="button" onClick={generateVariants} className="h-12 px-10 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-xl transition-all active:scale-95 flex items-center gap-3">
                                      <Wand2 size={20} /> Compute Matrix
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="preview" className="animate-in fade-in duration-500">
                                <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-sm bg-white">
                                  <ScrollArea className="w-full">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow className="h-16 border-none">
                                                <TableHead className="px-10 font-black uppercase text-slate-400 text-[10px] tracking-[0.2em] min-w-[200px]">Variation Identity</TableHead>
                                                <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Retail Price</TableHead>
                                                <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Unit Cost</TableHead>
                                                <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Stock Vol.</TableHead>
                                                <TableHead className="px-10 text-right font-black uppercase text-slate-400 text-[10px] tracking-[0.2em] min-w-[150px]">Unique SKU</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {variants.map((v, idx) => (
                                                <TableRow key={idx} className="h-20 border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-all">
                                                    <TableCell className="px-10 text-xs font-black text-slate-900">{v.name}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Input type="number" step="0.01" className="h-10 w-28 border-slate-200 bg-white text-slate-900 font-black text-center mx-auto rounded-lg shadow-sm" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input type="number" step="0.01" className="h-10 w-28 border-slate-200 bg-white text-slate-400 font-bold text-center mx-auto rounded-lg shadow-sm" value={v.cost_price} onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))} />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input type="number" className="h-10 w-28 border-slate-200 bg-white text-blue-700 font-black text-center mx-auto rounded-lg shadow-sm" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))} />
                                                    </TableCell>
                                                    <TableCell className="px-10">
                                                        <Input className="h-10 w-full border-slate-200 rounded-lg uppercase text-[10px] font-black text-right px-4 bg-white shadow-sm" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="AUTO" />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <ScrollBar orientation="horizontal" />
                                  </ScrollArea>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>
            
            {/* --- FINAL ACTION FOOTER --- */}
            <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 px-6 py-3 rounded-full border border-emerald-100 font-black text-[10px] uppercase tracking-[0.3em] shadow-sm w-fit">
                        <CheckCircle2 size={16} />
                        Global Synchronization Nodes Active
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest pl-2">
                        <ShieldCheck size={14} className="text-blue-500" /> Authorized Registry Submission • Handshake Verified
                    </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <Button 
                        onClick={() => mutate()} 
                        disabled={isPending} 
                        className="h-16 flex-1 md:flex-none px-20 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-[0.4em] rounded-2xl shadow-2xl transition-all active:scale-95 border-none group"
                    >
                        {isPending ? <Loader2 size={24} className="animate-spin" /> : (
                            <span className="flex items-center gap-4">
                                Authorize & Commit Record
                                <Globe size={20} className="opacity-40 group-hover:opacity-100 transition-all" />
                            </span>
                        )}
                    </Button>
                </div>
            </div>
        </div>

        {/* --- SYSTEM FOOTER --- */}
        <footer className="pt-12 pb-12 text-center opacity-30 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] flex items-center justify-center gap-4">
                <LayoutGrid size={16} /> Cloud Inventory Ledger Registry • v4.1.0-STABLE
            </p>
        </footer>
      </div>

      {/* --- SEPARATE DIALOG FOR UNIT BUILDER --- */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl bg-white z-[12000]">
          <div className="px-8 py-10 bg-slate-900 text-white">
            <h3 className="text-2xl font-black tracking-tight">Register Metric Node</h3>
            <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold">New Inventory Unit Registry</p>
          </div>
          <div className="p-8 space-y-8 bg-white">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Metric Full Identity (e.g. Metric Tonne)</Label>
              <Input placeholder="Registry Name" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-14 border-slate-100 bg-slate-50/50 font-bold rounded-xl px-4" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Short Code / Abbr (e.g. MT)</Label>
              <Input placeholder="ABBR" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)} className="h-14 border-slate-100 bg-slate-50/50 font-black rounded-xl px-4 uppercase text-center text-2xl tracking-widest" />
            </div>
          </div>
          <div className="px-8 py-8 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-12 px-8 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900">Cancel</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex-1 shadow-lg shadow-blue-200 transition-all">
               {isSavingUnit ? <Loader2 className="animate-spin w-5 h-5" /> : "Commit Node"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}