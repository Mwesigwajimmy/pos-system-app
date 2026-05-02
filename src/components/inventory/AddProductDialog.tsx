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
  ShieldCheck
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
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [units, setUnits] = useState<Unit[]>([]);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbr, setNewUnitAbbr] = useState('');
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [uomId, setUomId] = useState<string | null>(null);
  const [taxCategoryCode, setTaxCategoryCode] = useState('STANDARD'); 
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...DEFAULT_VARIANT }]);
  const [activeTab, setActiveTab] = useState("configuration");
  const [attributes, setAttributes] = useState<AttributeBuilder[]>([
    { name: 'Color Palette', inputValue: '', values: [] }
  ]);

  const { data: profile } = useQuery({
    queryKey: ['active_profile_currency'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('currency, business_id').eq('id', user?.id).single();
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

  const generateReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Operational Product Ledger", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} | Base Currency: ${businessCurrency}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Product / Variant', 'SKU', 'Valuation', 'Stock Level']],
      body: products?.map((p: any) => [
        `${p.products?.name} - ${p.name}`,
        p.sku,
        `${p.price.toLocaleString()} ${businessCurrency}`,
        `${p.stock_quantity.toLocaleString()} units`
      ]),
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.save(`Product_Registry_Report_${Date.now()}.pdf`);
    toast.success("Operational protocol generated");
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
      toast.success("Measurement node authorized");
    } catch (err) { toast.error("System synchronization failed"); } finally { setIsSavingUnit(false); }
  };

  const generateVariants = () => {
    const validAttributes = attributes
      .map(attr => ({ name: attr.name.trim(), values: attr.inputValue.split(',').map(s => s.trim()).filter(Boolean) }))
      .filter(attr => attr.values.length > 0 && attr.name !== '');

    if (validAttributes.length === 0) return toast.error("Specify variant parameters");

    const cartesian = (arr: any[][]) => arr.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    let combinations = validAttributes.length === 1 ? validAttributes[0].values.map(v => [v]) : cartesian(validAttributes.map(a => a.values));

    setVariants(combinations.map((combo) => {
      const attrMap: Record<string, string> = {};
      validAttributes.forEach((attr, idx) => { attrMap[attr.name] = Array.isArray(combo) ? combo[idx] : combo; });
      return { name: Array.isArray(combo) ? combo.join(' / ') : combo, sku: '', price: 0, cost_price: 0, stock_quantity: 0, units_per_pack: 1, attributes: attrMap, uom_id: null };
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
      const { data: product, error: prodError } = await supabase.from('products').insert({
          name: productName,
          category_id: categoryId ? parseInt(categoryId) : null,
          uom_id: uomId || null, 
          business_id: profile?.business_id,
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
        tax_category_code: taxCategoryCode.toUpperCase()
      }));

      const { error: varError } = await supabase.from('product_variants').insert(variantsPayload);
      if (varError) throw varError;
    },
    onSuccess: () => {
      toast.success("Registry entry finalized");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setOpen(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setProductName(''); setCategoryId(null); setUomId(null); setTaxCategoryCode('STANDARD');
    setIsMultiVariant(false); setVariants([{ ...DEFAULT_VARIANT }]);
    setAttributes([{ name: 'Color Palette', inputValue: '', values: [] }]); setActiveTab("configuration");
  };

  return (
    <div className="max-w-[1600px] mx-auto py-12 px-10 space-y-12 animate-in fade-in duration-700 bg-white min-h-screen">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-100 pb-12">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest">
            <Activity size={14} /> Industrial Asset Registry
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tighter">Product Inventory</h1>
          <p className="text-sm font-medium text-slate-500">Corporate repository for finished goods and spec-based variants.</p>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={generateReport} variant="ghost" className="h-12 px-6 font-bold text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-900 transition-all">
            <Download size={16} className="mr-2" /> Registry Manifest
          </Button>

          <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); setOpen(val); }}>
            <DialogTrigger asChild>
              <Button className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-600/20 rounded-2xl transition-all active:scale-95">
                  <Plus size={18} className="mr-2" /> Initialize New Asset
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[1000px] h-[92vh] overflow-hidden flex flex-col p-0 border-none rounded-[2rem] shadow-2xl bg-white">
              <DialogHeader className="px-12 py-10 border-b bg-white">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-xl shadow-slate-200">
                        <Package size={32} />
                    </div>
                    <div className="space-y-0.5">
                        <DialogTitle className="text-3xl font-bold text-slate-900 tracking-tight">Asset Initialization</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                          Configure base specifications and variant protocols.
                        </DialogDescription>
                    </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 bg-white">
                <div className="p-12 space-y-16">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                      <div className="space-y-4">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Commercial Designation</Label>
                          <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Official product name" className="h-14 border-none bg-slate-50 rounded-2xl font-bold px-6 shadow-inner" />
                      </div>
                      <div className="space-y-4">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Strategic Classification</Label>
                          <Select value={categoryId || ''} onValueChange={setCategoryId}>
                              <SelectTrigger className="h-14 border-none bg-slate-50 rounded-2xl font-bold shadow-inner px-6 focus:ring-0"><SelectValue placeholder="Select Category" /></SelectTrigger>
                              <SelectContent className="rounded-2xl border-none shadow-2xl">
                                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)} className="font-bold py-4">{c.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-4">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Taxation Authority</Label>
                          <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                            <SelectTrigger className="h-14 border-none bg-slate-50 rounded-2xl font-bold shadow-inner px-6 focus:ring-0"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="STANDARD" className="font-bold py-4">Standard Operational Rate</SelectItem>
                                <SelectItem value="EXEMPT" className="font-bold py-4">Registry Exempt</SelectItem>
                                <SelectItem value="REDUCED" className="font-bold py-4">Reduced Regulatory Rate</SelectItem>
                            </SelectContent>
                          </Select>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end border-t border-slate-50 pt-12">
                      <div className="space-y-4">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Metric Measurement Unit</Label>
                          <div className="flex gap-4">
                            <Select value={uomId || ''} onValueChange={setUomId}>
                                <SelectTrigger className="flex-1 h-14 border-none bg-slate-50 rounded-2xl font-bold shadow-inner px-6 focus:ring-0"><SelectValue placeholder="Base Metric" /></SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {units.map(u => <SelectItem key={u.id} value={String(u.id)} className="font-bold py-4">{u.name} ({u.abbreviation})</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" onClick={() => setIsUnitModalOpen(true)} className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                              <Plus size={24} />
                            </Button>
                          </div>
                      </div>
                      <div className="flex items-center space-x-6 p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 h-16 shadow-sm">
                          <Switch checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorize Multi-Variant Spec (Color Palette, Logic)</Label>
                      </div>
                  </div>

                  {!isMultiVariant ? (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 p-12 rounded-[3rem] bg-slate-900 text-white shadow-2xl">
                          <div className="space-y-3">
                              <Label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Base Rate ({businessCurrency})</Label>
                              <Input type="number" className="h-14 border-none bg-white/10 rounded-2xl font-bold text-white shadow-inner text-center" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))} />
                          </div>
                          <div className="space-y-3">
                              <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Registry Cost</Label>
                              <Input type="number" className="h-14 border-none bg-white/10 rounded-2xl font-bold text-white shadow-inner text-center" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))} />
                          </div>
                          <div className="space-y-3">
                              <Label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">On-Hand Reserve</Label>
                              <Input type="number" className="h-14 border-none bg-white/10 rounded-2xl font-bold text-white shadow-inner text-center" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))} />
                          </div>
                          <div className="space-y-3">
                              <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Units / Pack</Label>
                              <Input type="number" className="h-14 border-none bg-white/10 rounded-2xl font-bold text-white shadow-inner text-center" value={variants[0].units_per_pack} onChange={(e) => updateVariant(0, 'units_per_pack', Number(e.target.value))} />
                          </div>
                          <div className="space-y-3">
                              <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Global SKU</Label>
                              <Input placeholder="Auto-Reference" className="h-14 border-none bg-white/10 rounded-2xl font-bold text-white shadow-inner text-center uppercase text-[11px] tracking-widest" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)} />
                          </div>
                      </div>
                  ) : (
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10 pb-32">
                          <TabsList className="bg-slate-50 p-1.5 rounded-2xl border border-slate-100 h-16">
                              <TabsTrigger value="configuration" className="rounded-xl px-16 font-bold text-[10px] uppercase tracking-widest h-12">1. Attribute Specifications</TabsTrigger>
                              <TabsTrigger value="preview" className="rounded-xl px-16 font-bold text-[10px] uppercase tracking-widest h-12" disabled={variants.length <= 0}>2. Final Matrix Preview</TabsTrigger>
                          </TabsList>

                          <TabsContent value="configuration" className="space-y-10 animate-in slide-in-from-left-2 duration-500">
                              <div className="grid gap-8">
                                {attributes.map((attr, idx) => (
                                    <div key={idx} className="flex gap-8 items-end bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                        <div className="w-1/3 space-y-4">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Attribute Node (e.g. Color Palette)</Label>
                                            <Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} placeholder="Spec title" className="h-14 border-none bg-white rounded-2xl shadow-inner font-bold px-6" />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Registry Values (Separate with Comma)</Label>
                                            <Input value={attr.inputValue} onChange={e => { const updated = [...attributes]; updated[idx].inputValue = e.target.value; setAttributes(updated); }} placeholder="Industrial Red, Slate Gray, Cobalt Blue" className="h-14 border-none bg-white rounded-2xl shadow-inner font-bold px-6" />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 h-14 w-14 rounded-2xl transition-colors">
                                            <Trash size={24} />
                                        </Button>
                                    </div>
                                ))}
                              </div>
                              <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
                                  <Button variant="ghost" onClick={() => setAttributes([...attributes, { name: '', inputValue: '', values: [] }])} className="h-14 px-8 text-blue-600 font-bold text-[10px] uppercase tracking-widest gap-3">
                                    <Plus size={20} /> Add Attribute Spec
                                  </Button>
                                  <Button type="button" onClick={generateVariants} className="h-14 px-12 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-2xl transition-all active:scale-95">
                                    <Wand2 size={20} className="mr-3" /> Execute Matrix Logic
                                  </Button>
                              </div>
                          </TabsContent>

                          <TabsContent value="preview" className="animate-in fade-in duration-1000">
                              <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm bg-white">
                                <ScrollArea className="w-full">
                                  <Table>
                                      <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                                          <TableRow className="h-16 border-none hover:bg-transparent">
                                              <TableHead className="px-10 font-black uppercase text-slate-400 text-[10px] tracking-widest">Generated Specification</TableHead>
                                              <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-widest">Rate ({businessCurrency})</TableHead>
                                              <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-widest">Reserve Stock</TableHead>
                                              <TableHead className="px-10 text-right font-black uppercase text-slate-400 text-[10px] tracking-widest">Registry SKU</TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {variants.map((v, idx) => (
                                              <TableRow key={idx} className="h-20 hover:bg-slate-50/30 transition-all border-b border-slate-50 last:border-none">
                                                  <TableCell className="px-10 text-sm font-bold text-slate-950 uppercase tracking-tight">{v.name}</TableCell>
                                                  <TableCell className="text-center"><Input type="number" className="h-12 w-36 border-none bg-slate-50 text-blue-600 font-black rounded-2xl text-center shadow-inner mx-auto text-lg" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} /></TableCell>
                                                  <TableCell className="text-center"><Input type="number" className="h-12 w-36 border-none bg-slate-50 text-emerald-600 font-black rounded-2xl text-center shadow-inner mx-auto text-lg" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))} /></TableCell>
                                                  <TableCell className="px-10"><Input className="h-12 border-none bg-slate-50 rounded-2xl uppercase text-[10px] font-black tracking-[0.2em] shadow-inner text-right px-6" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="AUTO-ID" /></TableCell>
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
                <ScrollBar orientation="vertical" />
              </ScrollArea>

              <DialogFooter className="px-12 py-10 bg-slate-50/50 border-t flex flex-col sm:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-4 text-emerald-600 bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 font-bold text-[10px] uppercase tracking-widest">
                  <ShieldCheck size={20} /> Integrity Verification: Active
                </div>
                <div className="flex gap-6 w-full sm:w-auto">
                    <Button variant="ghost" onClick={() => setOpen(false)} className="h-16 px-12 font-bold text-slate-400 uppercase tracking-widest text-[11px] transition-colors hover:text-slate-950">Discard Handshake</Button>
                    <Button onClick={() => mutate()} disabled={isPending} className="h-16 px-20 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-[0_20px_40px_-10px_rgba(37,99,235,0.3)] transition-all active:scale-95">
                      {isPending ? <Loader2 size={22} className="animate-spin" /> : "Authorize & Post Asset"}
                    </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="space-y-12">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
          <div className="relative w-full md:w-[500px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <Input 
              placeholder="Search registry by identifier or spec..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-16 pl-14 border-none bg-white rounded-3xl shadow-sm font-bold text-sm tracking-tight focus:shadow-xl transition-all"
            />
          </div>
          <div className="flex items-center gap-12 px-12">
              <div className="text-right space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Nodes</span>
                <p className="text-3xl font-bold text-slate-900 tracking-tighter">{products?.length || 0}</p>
              </div>
              <div className="h-12 w-px bg-slate-200" />
              <div className="text-right space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reporting Ledger</span>
                <p className="text-3xl font-bold text-blue-600 uppercase tracking-tighter">{businessCurrency}</p>
              </div>
          </div>
        </div>

        <Card className="rounded-[3.5rem] border-none shadow-[0_48px_80px_-15px_rgba(0,0,0,0.06)] overflow-hidden bg-white">
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-50">
                  <TableRow className="h-20 border-none hover:bg-transparent">
                    <TableHead className="pl-12 font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Product Node / Specification</TableHead>
                    <TableHead className="font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Sector Category</TableHead>
                    <TableHead className="text-right font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Acquisition Rate</TableHead>
                    <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Ledger Balance</TableHead>
                    <TableHead className="pr-12 text-right font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Registry Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isProductsLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-96 text-center opacity-30"><Loader2 size={48} className="animate-spin mx-auto text-slate-200" /></TableCell></TableRow>
                  ) : products?.length === 0 ? (
                     <TableRow><TableCell colSpan={5} className="h-96 text-center opacity-20 font-black uppercase tracking-[0.4em]">Zero Registry Nodes Found</TableCell></TableRow>
                  ) : products?.filter(p => p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) || p.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((p: any) => (
                    <TableRow key={p.id} className="h-24 hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-none group">
                      <TableCell className="pl-12">
                        <div className="flex items-center gap-6">
                          <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            <Palette size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-base tracking-tight">{p.products?.name}</span>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{p.name}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
                          {p.products?.categories?.name || 'Unclassified'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900 text-base tabular-nums">
                        {p.price.toLocaleString()} <span className="text-[10px] text-slate-300 font-bold uppercase ml-1">{businessCurrency}</span>
                      </TableCell>
                      <TableCell className="text-center">
                         <span className={`text-sm font-black tabular-nums ${p.stock_quantity > 10 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {p.stock_quantity.toLocaleString()} <span className="text-[10px] font-bold text-slate-300 uppercase ml-1">units</span>
                         </span>
                      </TableCell>
                      <TableCell className="pr-12 text-right">
                        <code className="text-[10px] font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 uppercase tracking-[0.15em] shadow-sm">
                          {p.sku}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      <footer className="pt-24 pb-20 flex justify-between items-center opacity-30 border-t border-slate-100">
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em]">
           <ShieldCheck size={16} /> Distributed Asset Protocol v2.6.5
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           Ledger Sync: {new Date().toLocaleDateString()} | Node: PRODUCT-REG-X
        </div>
      </footer>

      {/* UNIT DIALOG */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
          <DialogHeader className="px-12 py-10 bg-slate-950 text-white border-none">
            <DialogTitle className="text-2xl font-bold uppercase tracking-widest">Metric Definition</DialogTitle>
            <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Register new measurement standard</DialogDescription>
          </DialogHeader>
          <div className="p-12 space-y-10 bg-white">
            <div className="space-y-4">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Standard Name</Label>
              <Input placeholder="e.g. Metric Tonne" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-14 border-none bg-slate-50 font-bold rounded-2xl shadow-inner px-6" />
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Symbol</Label>
              <Input placeholder="MT" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)} className="h-14 border-none bg-slate-50 font-black rounded-2xl shadow-inner px-6 uppercase text-center text-xl" />
            </div>
          </div>
          <DialogFooter className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex gap-6">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-14 px-8 font-bold text-[10px] uppercase tracking-widest text-slate-400">Abort</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-200 flex-1">
               {isSavingUnit ? <Loader2 className="animate-spin w-5 h-5" /> : "Commit Spec"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}