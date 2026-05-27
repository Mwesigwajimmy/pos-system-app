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
  RotateCcw,
  X,
  PlusCircle,
  CheckCircle2
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

  // Profile and Currency Queries
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

  const businessCurrency = profile?.currency || 'USD';

  const { data: products } = useQuery({
    queryKey: ['inventoryProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id, name, sku, price, cost_price, stock_quantity,
          products ( name, categories ( name ) )
        `)
        .order('created_at', { ascending: false });
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

  const generateReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Stock Inventory Ledger", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} | Currency: ${businessCurrency}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Product / Variety', 'SKU', 'Selling Price', 'Stock Level']],
      body: products?.map((p: any) => [
        `${p.products?.name} - ${p.name}`,
        p.sku,
        `${p.price.toLocaleString()} ${businessCurrency}`,
        `${p.stock_quantity.toLocaleString()} units`
      ]),
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Stock_Inventory_Report_${Date.now()}.pdf`);
    toast.success("Inventory report generated");
  };

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
        <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all">
            <Plus size={16} className="mr-2" /> Add New Product
        </Button>
      </DialogTrigger>
      
      {/* 
         PROFESSIONAL DIALOG ARCHITECTURE:
         Correctly sized sm:max-w-4xl to ensure it doesn't hit sidebars.
      */}
      <DialogContent className="sm:max-w-4xl w-full flex flex-col p-0 border-none rounded-xl shadow-2xl bg-white overflow-hidden">
        
        {/* CLEAN HEADER: Just like the first image */}
        <div className="px-8 py-8 border-b shrink-0 bg-white">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <Package size={28} />
             </div>
             <div className="space-y-0.5">
                <h2 className="text-2xl font-bold text-slate-900">New Product</h2>
                <p className="text-sm font-medium text-slate-400">Setup product information, pricing, and stock levels.</p>
             </div>
          </div>
        </div>

        {/* FORM BODY */}
        <ScrollArea className="max-h-[75vh]">
          <div className="p-8 space-y-8">
            
            {/* Row 1: Product Basics (3 Column Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Product Name</Label>
                    <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Wireless Headphones" className="h-11 border-slate-200 bg-white rounded-lg font-semibold px-4" />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category</Label>
                    <Select value={categoryId || ''} onValueChange={setCategoryId}>
                        <SelectTrigger className="h-11 border-slate-200 bg-white rounded-lg font-semibold px-4">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                            {categories.map(c => <SelectItem key={c.id} value={String(c.id)} className="font-semibold">{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tax Rate</Label>
                    <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                      <SelectTrigger className="h-11 border-slate-200 bg-white rounded-lg font-semibold px-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                          <SelectItem value="STANDARD" className="font-semibold">Standard Rate</SelectItem>
                          <SelectItem value="EXEMPT" className="font-semibold">Tax Exempt</SelectItem>
                          <SelectItem value="REDUCED" className="font-semibold">Reduced Rate</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Row 2: Structural Details (2 Column Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Base Unit</Label>
                    <div className="flex gap-2">
                      <Select value={uomId || ''} onValueChange={setUomId}>
                          <SelectTrigger className="flex-1 h-11 border-slate-200 bg-white rounded-lg font-semibold px-4">
                            <SelectValue placeholder="Pcs, Kg, Box..." />
                          </SelectTrigger>
                          <SelectContent className="p-0 z-[10000]">
                              <div className="p-3 bg-slate-50 border-b flex items-center gap-2 sticky top-0 z-10">
                                <Search size={14} className="text-slate-400" />
                                <input 
                                  type="text"
                                  placeholder="Search metrics..."
                                  value={uomSearchQuery}
                                  onChange={(e) => setUomSearchQuery(e.target.value)}
                                  className="w-full bg-transparent border-none outline-none font-bold text-[11px]"
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                              <ScrollArea className="h-48">
                                <SelectGroup>
                                    <SelectItem value="pcs" className="font-semibold">Pieces (pcs)</SelectItem>
                                    <SelectItem value="box" className="font-semibold">Box (bx)</SelectItem>
                                    <SelectItem value="kg" className="font-semibold">Kilogram (kg)</SelectItem>
                                </SelectGroup>
                                {filteredUnits.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel className="px-4 py-2 text-[8px] font-black text-slate-300 uppercase tracking-wider border-t">Custom Units</SelectLabel>
                                        {filteredUnits.map(u => (
                                        <SelectItem key={u.id} value={String(u.id)} className="font-semibold">
                                            {u.name} ({u.abbreviation})
                                        </SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                              </ScrollArea>
                          </SelectContent>
                      </Select>
                      <Button variant="outline" type="button" onClick={() => setIsUnitModalOpen(true)} className="h-11 w-11 rounded-lg border-slate-200 bg-white text-blue-600 hover:bg-blue-50">
                        <Plus size={20} />
                      </Button>
                    </div>
                </div>
                <div className="flex items-center space-x-3 p-3 px-4 rounded-lg bg-slate-50/50 border border-slate-100 h-11">
                    <Label className="text-[11px] font-bold text-slate-500 flex-1 cursor-pointer">This product has variants (e.g. Size, Color)</Label>
                    <Switch checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                </div>
            </div>

            {/* Row 3: Inventory & Pricing */}
            <div className="space-y-4">
                {!isMultiVariant ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Selling Price</Label>
                            <Input type="number" step="0.01" className="h-10 border-slate-200 bg-white rounded-md font-bold text-slate-900" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cost Price</Label>
                            <Input type="number" step="0.01" className="h-10 border-slate-200 bg-white rounded-md font-medium" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Stock</Label>
                            <Input type="number" className="h-10 border-slate-200 bg-white rounded-md font-bold text-emerald-700" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Units/Pack</Label>
                            <Input type="number" className="h-10 border-slate-200 bg-white rounded-md font-medium" value={variants[0].units_per_pack} onChange={(e) => updateVariant(0, 'units_per_pack', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SKU</Label>
                            <Input placeholder="Auto" className="h-10 border-slate-200 bg-white rounded-md font-bold uppercase text-[10px]" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)} />
                        </div>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-slate-100 p-1 rounded-lg h-11 w-full max-w-md">
                            <TabsTrigger value="configuration" className="flex-1 rounded-md font-bold text-[10px] uppercase tracking-wider">1. Set Options</TabsTrigger>
                            <TabsTrigger value="preview" className="flex-1 rounded-md font-bold text-[10px] uppercase tracking-wider" disabled={variants.length <= 0}>2. Edit Matrix</TabsTrigger>
                        </TabsList>

                        <TabsContent value="configuration" className="space-y-4">
                            <div className="grid gap-3">
                              {attributes.map((attr, idx) => (
                                  <div key={idx} className="flex gap-3 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                                      <div className="w-1/3 space-y-1.5">
                                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Property Name</Label>
                                          <Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} placeholder="e.g. Size" className="h-9 border-slate-200" />
                                      </div>
                                      <div className="flex-1 space-y-1.5">
                                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Values (Comma separated)</Label>
                                          <Input value={attr.inputValue} onChange={e => { const updated = [...attributes]; updated[idx].inputValue = e.target.value; setAttributes(updated); }} placeholder="Small, Large, XL" className="h-9 border-slate-200" />
                                      </div>
                                      <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 h-9 w-9">
                                          <Trash size={16} />
                                      </Button>
                                  </div>
                              ))}
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <Button variant="outline" onClick={() => setAttributes([...attributes, { name: '', inputValue: '', values: [] }])} className="h-9 px-4 text-blue-600 font-bold text-[10px] uppercase gap-2 hover:bg-blue-50 border-blue-100">
                                  <PlusCircle size={16} /> New Group
                                </Button>
                                <Button type="button" onClick={generateVariants} className="h-9 px-6 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all active:scale-95">
                                  <Wand2 size={16} className="mr-2" /> Compute Matrix
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview">
                            <div className="rounded-lg border border-slate-100 overflow-hidden shadow-sm bg-white">
                              <ScrollArea className="w-full">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="h-12">
                                            <TableHead className="px-6 font-bold uppercase text-slate-400 text-[9px] tracking-widest">Variant</TableHead>
                                            <TableHead className="text-center font-bold uppercase text-slate-400 text-[9px] tracking-widest">Price</TableHead>
                                            <TableHead className="text-center font-bold uppercase text-slate-400 text-[9px] tracking-widest">Stock</TableHead>
                                            <TableHead className="px-6 text-right font-bold uppercase text-slate-400 text-[9px] tracking-widest">SKU</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {variants.map((v, idx) => (
                                            <TableRow key={idx} className="h-14">
                                                <TableCell className="px-6 text-xs font-bold text-slate-900">{v.name}</TableCell>
                                                <TableCell className="text-center"><Input type="number" step="0.01" className="h-8 w-24 border-slate-100 bg-slate-50 text-slate-900 font-bold text-center mx-auto rounded-md" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} /></TableCell>
                                                <TableCell className="text-center"><Input type="number" className="h-8 w-24 border-slate-100 bg-slate-50 text-blue-700 font-bold text-center mx-auto rounded-md" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))} /></TableCell>
                                                <TableCell className="px-6"><Input className="h-8 w-32 border-slate-100 rounded-md uppercase text-[10px] font-bold text-right ml-auto bg-slate-50" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="AUTO" /></TableCell>
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
          </div>
        </ScrollArea>

        {/* FIXED FOOTER: Action bar always visible at the bottom */}
        <div className="px-8 py-6 bg-slate-50 border-t flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={() => setOpen(false)} className="h-10 px-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] transition-all hover:text-red-500 rounded-lg">Cancel</Button>
          <Button onClick={() => mutate()} disabled={isPending} className="h-10 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg transition-all active:scale-95 border-none">
            {isPending ? <Loader2 size={18} className="animate-spin" /> : "Save Product"}
          </Button>
        </div>
      </DialogContent>

      {/* CUSTOM UNIT BUILDER: Same professional modal styling */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden border-none shadow-2xl bg-white z-[12000]">
          <DialogHeader className="px-8 py-6 bg-slate-900 text-white">
            <DialogTitle className="text-lg font-bold">Add New Unit</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">Create a measurement unit for your inventory.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-5 bg-white">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit Name</Label>
              <Input placeholder="e.g. Kilograms" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-11 border-slate-100 font-semibold rounded-lg px-4" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abbreviation</Label>
              <Input placeholder="e.g. KG" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)} className="h-11 border-slate-100 font-bold rounded-lg px-4 uppercase" />
            </div>
          </div>
          <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-10 px-6 font-bold text-[10px] uppercase text-slate-400">Cancel</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase rounded-lg flex-1">
               {isSavingUnit ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}