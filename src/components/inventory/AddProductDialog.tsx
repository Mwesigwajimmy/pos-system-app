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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  Info,
  Download,
  FileText,
  Search,
  Palette,
  ArrowRightLeft,
  Activity,
  ShieldCheck,
  Building2,
  MapPin,
  Tag,
  DollarSign,
  Briefcase,
  Layers3
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const businessCurrency = profile?.currency || 'USD';

  const { data: products, isLoading: isProductsLoading } = useQuery({
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
        <Button className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest shadow-lg rounded-xl transition-all active:scale-95">
            <Plus size={18} className="mr-2" /> Add Product
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-5xl h-[92vh] overflow-hidden flex flex-col p-0 border-none rounded-2xl shadow-2xl bg-white">
        <DialogHeader className="px-10 py-8 border-b bg-slate-50/50">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl text-white shadow-md">
                  <Package size={28} />
              </div>
              <div className="space-y-1">
                  <DialogTitle className="text-2xl font-bold text-slate-900">Product Registration</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Set up your stock items, variations, and business pricing.
                  </DialogDescription>
              </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-10 space-y-12">
            
            {/* Step 1: Product Basics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-3 lg:col-span-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Product Name</Label>
                    <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Full product name" className="h-12 border-slate-200 bg-white rounded-xl font-bold px-5" />
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-1.5"><MapPin size={12}/> Target Branch</Label>
                    <Select value={locationId || ''} onValueChange={setLocationId}>
                        <SelectTrigger className="h-12 border-blue-100 bg-blue-50/30 rounded-xl font-bold px-5 focus:ring-0 text-blue-700">
                          <SelectValue placeholder="Select Location" />
                        </SelectTrigger>
                        <SelectContent>
                            {locations?.map(loc => (
                              <SelectItem key={loc.id} value={loc.id} className="font-bold">
                                <div className="flex items-center gap-2">
                                  <Building2 size={14} className="text-slate-400" /> {loc.name}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</Label>
                    <Select value={categoryId || ''} onValueChange={setCategoryId}>
                        <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-bold px-5 focus:ring-0"><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>
                            {categories.map(c => <SelectItem key={c.id} value={String(c.id)} className="font-bold">{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tax Status</Label>
                    <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                      <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-bold px-5 focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="STANDARD" className="font-bold py-2 text-xs">Standard Business Tax</SelectItem>
                          <SelectItem value="EXEMPT" className="font-bold py-2 text-xs">Tax Exempt (Zero Rated)</SelectItem>
                          <SelectItem value="REDUCED" className="font-bold py-2 text-xs">Reduced Tax Rate</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Step 2: Measurements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end border-t border-slate-50 pt-10">
                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Unit of Measure (UOM)</Label>
                    <div className="flex gap-3">
                      <Select value={uomId || ''} onValueChange={setUomId}>
                          <SelectTrigger className="flex-1 h-12 border-slate-200 bg-white rounded-xl font-bold px-5 focus:ring-0">
                            <SelectValue placeholder="Select Unit (Box, Kg, etc.)" />
                          </SelectTrigger>
                          <SelectContent className="p-0">
                              <div className="p-2 bg-white border-b flex items-center gap-2 sticky top-0 z-10">
                                <Search size={14} className="text-slate-300" />
                                <input 
                                  type="text"
                                  placeholder="Search metrics..."
                                  value={uomSearchQuery}
                                  onChange={(e) => setUomSearchQuery(e.target.value)}
                                  className="w-full bg-transparent border-none outline-none font-bold text-xs"
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                              <ScrollArea className="h-64">
                                <SelectGroup>
                                    <SelectLabel className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase">Standard Metrics</SelectLabel>
                                    <SelectItem value="pcs" className="font-bold">Pieces (pcs)</SelectItem>
                                    <SelectItem value="box" className="font-bold">Box (bx)</SelectItem>
                                    <SelectItem value="ctn" className="font-bold">Carton (ctn)</SelectItem>
                                    <SelectItem value="kg" className="font-bold">Kilogram (kg)</SelectItem>
                                    <SelectItem value="g" className="font-bold">Gram (g)</SelectItem>
                                    <SelectItem value="ltr" className="font-bold">Liter (ltr)</SelectItem>
                                    <SelectItem value="ml" className="font-bold">Milliliter (ml)</SelectItem>
                                    <SelectItem value="mtr" className="font-bold">Meter (mtr)</SelectItem>
                                    <SelectItem value="pkt" className="font-bold">Packet (pkt)</SelectItem>
                                    <SelectItem value="dz" className="font-bold">Dozen (dz)</SelectItem>
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase border-t mt-2">Custom Measurements</SelectLabel>
                                    {filteredUnits.map(u => (
                                      <SelectItem key={u.id} value={String(u.id)} className="font-bold">
                                        {u.name} ({u.abbreviation})
                                      </SelectItem>
                                    ))}
                                </SelectGroup>
                              </ScrollArea>
                          </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => setIsUnitModalOpen(true)} className="h-12 w-12 rounded-xl border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors">
                        <Plus size={24} />
                      </Button>
                    </div>
                </div>
                <div className="flex items-center space-x-4 p-6 rounded-2xl bg-slate-50 border border-slate-100 h-14">
                    <Switch checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer">Product has variations (Size, Color, etc.)</Label>
                </div>
            </div>

            {/* Step 3: Prices & Stock */}
            {!isMultiVariant ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-10 rounded-2xl bg-slate-900 text-white shadow-xl">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                          <DollarSign size={10} /> Selling Price (Retail)
                        </Label>
                        <Input type="number" step="0.01" className="h-12 border-none bg-white/10 rounded-xl font-bold text-white text-center text-lg" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Buying Price (Cost)</Label>
                        <Input type="number" step="0.01" className="h-12 border-none bg-white/10 rounded-xl font-bold text-white text-center text-lg" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Available Stock</Label>
                        <Input type="number" className="h-12 border-none bg-white/10 rounded-xl font-bold text-white text-center text-lg" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Product Code / SKU</Label>
                        <Input placeholder="AUTO-SKU" className="h-12 border-none bg-white/10 rounded-xl font-bold text-white text-center uppercase text-[11px] tracking-widest" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)} />
                    </div>
                </div>
            ) : (
                /* Step 3: Multi-Variant Matrix */
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10 pb-20">
                    <TabsList className="bg-slate-50 p-1 rounded-xl h-12 w-full max-w-lg">
                        <TabsTrigger value="configuration" className="flex-1 rounded-lg font-bold text-[9px] uppercase tracking-widest h-10">1. Define Variations</TabsTrigger>
                        <TabsTrigger value="preview" className="flex-1 rounded-lg font-bold text-[9px] uppercase tracking-widest h-10" disabled={variants.length <= 0}>2. Edit Prices & Stock</TabsTrigger>
                    </TabsList>

                    <TabsContent value="configuration" className="space-y-8">
                        <div className="grid gap-6">
                          {attributes.map((attr, idx) => (
                              <div key={idx} className="flex gap-6 items-end bg-slate-50/50 p-8 rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="w-1/3 space-y-3">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Option Name (e.g. Size)</Label>
                                      <Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} placeholder="Property title" className="h-12 border-slate-200 bg-white rounded-xl font-bold px-5" />
                                  </div>
                                  <div className="flex-1 space-y-3">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Values (Separate with commas)</Label>
                                      <Input value={attr.inputValue} onChange={e => { const updated = [...attributes]; updated[idx].inputValue = e.target.value; setAttributes(updated); }} placeholder="Red, Blue, Green" className="h-12 border-slate-200 bg-white rounded-xl font-bold px-5" />
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 h-12 w-12 rounded-xl transition-colors">
                                      <Trash size={24} />
                                  </Button>
                              </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-dashed border-slate-200">
                            <Button variant="ghost" onClick={() => setAttributes([...attributes, { name: '', inputValue: '', values: [] }])} className="h-12 px-8 text-blue-600 font-bold text-[10px] uppercase tracking-widest gap-2">
                              <Plus size={20} /> Add Another Attribute
                            </Button>
                            <Button type="button" onClick={generateVariants} className="h-12 px-12 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-md">
                              <Wand2 size={20} className="mr-3" /> Generate Variety Matrix
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="preview">
                        <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                          <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="h-14 border-none">
                                        <TableHead className="px-10 font-bold uppercase text-slate-400 text-[10px] tracking-widest">Variation</TableHead>
                                        <TableHead className="text-center font-bold uppercase text-slate-400 text-[10px] tracking-widest">Selling Price</TableHead>
                                        <TableHead className="text-center font-bold uppercase text-slate-400 text-[10px] tracking-widest">Buying Price</TableHead>
                                        <TableHead className="text-center font-bold uppercase text-slate-400 text-[10px] tracking-widest">In Stock</TableHead>
                                        <TableHead className="px-10 text-right font-bold uppercase text-slate-400 text-[10px] tracking-widest">SKU Code</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {variants.map((v, idx) => (
                                        <TableRow key={idx} className="h-16 border-b border-slate-50 last:border-none group">
                                            <TableCell className="px-10 text-sm font-bold text-slate-900 uppercase">{v.name}</TableCell>
                                            <TableCell className="text-center"><Input type="number" step="0.01" className="h-10 w-32 border-slate-200 bg-blue-50/20 text-blue-600 font-black rounded-xl text-center mx-auto text-base" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} /></TableCell>
                                            <TableCell className="text-center"><Input type="number" step="0.01" className="h-10 w-32 border-slate-200 bg-slate-50 text-slate-600 font-bold rounded-xl text-center mx-auto text-base" value={v.cost_price} onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))} /></TableCell>
                                            <TableCell className="text-center"><Input type="number" className="h-10 w-32 border-slate-200 bg-emerald-50/20 text-emerald-600 font-black rounded-xl text-center mx-auto text-base" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))} /></TableCell>
                                            <TableCell className="px-10"><Input className="h-10 border-slate-200 rounded-xl uppercase text-[10px] font-black tracking-widest text-right px-4" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="AUTO-ID" /></TableCell>
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
        </ScrollArea>

        <DialogFooter className="px-10 py-8 bg-slate-50/50 border-t flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 font-bold text-[9px] uppercase tracking-widest">
            <ShieldCheck size={20} /> Secure Business System Sync: Active
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setOpen(false)} className="h-12 px-8 font-bold text-slate-400 uppercase tracking-widest text-[10px] transition-colors hover:text-slate-950">Cancel Entry</Button>
              <Button onClick={() => mutate()} disabled={isPending} className="h-12 px-16 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-blue-200 transition-all active:scale-95">
                {isPending ? <Loader2 size={18} className="animate-spin" /> : "Finalize & Save Product"}
              </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* CUSTOM UNIT BUILDER */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl bg-white">
          <DialogHeader className="px-10 py-8 bg-slate-900 text-white">
            <DialogTitle className="text-xl font-bold uppercase tracking-widest">New Measurement Unit</DialogTitle>
            <DialogDescription className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Register a custom measurement standard for your products</DialogDescription>
          </DialogHeader>
          <div className="p-10 space-y-8 bg-white">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Standard Name (e.g. Metric Tonne)</Label>
              <Input placeholder="Unit title" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-12 border-slate-200 bg-slate-50 font-bold rounded-xl px-5" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Symbol (e.g. MT)</Label>
              <Input placeholder="Code" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)} className="h-12 border-slate-200 bg-slate-50 font-black rounded-xl px-5 uppercase text-center text-lg" />
            </div>
          </div>
          <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-12 px-6 font-bold text-[10px] uppercase tracking-widest text-slate-400">Abort</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="h-12 px-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg flex-1">
               {isSavingUnit ? <Loader2 className="animate-spin w-5 h-5" /> : "Save Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}