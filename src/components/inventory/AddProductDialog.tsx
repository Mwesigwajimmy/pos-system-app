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
    <div className="max-w-[1400px] mx-auto py-6 px-4 md:px-8 space-y-8 animate-in fade-in duration-500 bg-white min-h-screen">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-[11px] uppercase tracking-wider">
            <Activity size={14} /> Industrial Asset Registry
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Product Inventory</h1>
          <p className="text-xs font-medium text-slate-500">Manage finished goods and spec-based variants.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={generateReport} variant="outline" className="h-10 px-4 font-bold text-slate-600 uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
            <Download size={14} className="mr-2" /> Export PDF
          </Button>

          <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); setOpen(val); }}>
            <DialogTrigger asChild>
              <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest shadow-md rounded-lg transition-all active:scale-95">
                  <Plus size={16} className="mr-2" /> New Asset
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-hidden flex flex-col p-0 border border-slate-200 rounded-xl shadow-2xl bg-white">
              <DialogHeader className="px-8 py-6 border-b bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-white shadow-sm">
                        <Package size={20} />
                    </div>
                    <div className="space-y-0.5">
                        <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Asset Initialization</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Configure specifications and variant protocols.
                        </DialogDescription>
                    </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1">
                <div className="p-8 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Product Name</Label>
                          <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Official designation" className="h-11 border border-slate-200 bg-white rounded-lg font-medium px-4 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Category</Label>
                          <Select value={categoryId || ''} onValueChange={setCategoryId}>
                              <SelectTrigger className="h-11 border border-slate-200 bg-white rounded-lg font-medium px-4 focus:ring-1 focus:ring-blue-500"><SelectValue placeholder="Select Category" /></SelectTrigger>
                              <SelectContent>
                                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)} className="py-2 text-sm">{c.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tax Code</Label>
                          <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                            <SelectTrigger className="h-11 border border-slate-200 bg-white rounded-lg font-medium px-4 focus:ring-1 focus:ring-blue-500"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="STANDARD" className="text-sm">Standard Rate</SelectItem>
                                <SelectItem value="EXEMPT" className="text-sm">Exempt</SelectItem>
                                <SelectItem value="REDUCED" className="text-sm">Reduced Rate</SelectItem>
                            </SelectContent>
                          </Select>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end border-t border-slate-100 pt-8">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Unit of Measure</Label>
                          <div className="flex gap-2">
                            <Select value={uomId || ''} onValueChange={setUomId}>
                                <SelectTrigger className="flex-1 h-11 border border-slate-200 bg-white rounded-lg font-medium px-4 focus:ring-1 focus:ring-blue-500"><SelectValue placeholder="Base Metric" /></SelectTrigger>
                                <SelectContent>
                                    {units.map(u => <SelectItem key={u.id} value={String(u.id)} className="text-sm">{u.name} ({u.abbreviation})</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={() => setIsUnitModalOpen(true)} className="h-11 w-11 rounded-lg bg-white text-slate-600 border-slate-200 hover:bg-slate-50">
                              <Plus size={18} />
                            </Button>
                          </div>
                      </div>
                      <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-100 h-11">
                          <Switch checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                          <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer">Enable Multi-Variant Matrix</Label>
                      </div>
                  </div>

                  {!isMultiVariant ? (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 rounded-xl bg-slate-900 text-white shadow-lg">
                          <div className="space-y-2">
                              <Label className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Price ({businessCurrency})</Label>
                              <Input type="number" className="h-10 border-none bg-white/10 rounded-lg font-bold text-white text-center text-sm" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cost</Label>
                              <Input type="number" className="h-10 border-none bg-white/10 rounded-lg font-bold text-white text-center text-sm" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Stock</Label>
                              <Input type="number" className="h-10 border-none bg-white/10 rounded-lg font-bold text-white text-center text-sm" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Units/Pk</Label>
                              <Input type="number" className="h-10 border-none bg-white/10 rounded-lg font-bold text-white text-center text-sm" value={variants[0].units_per_pack} onChange={(e) => updateVariant(0, 'units_per_pack', Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">SKU</Label>
                              <Input placeholder="Auto" className="h-10 border-none bg-white/10 rounded-lg font-bold text-white text-center text-[10px] uppercase tracking-wider" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)} />
                          </div>
                      </div>
                  ) : (
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                          <TabsList className="bg-slate-100 p-1 rounded-lg h-11">
                              <TabsTrigger value="configuration" className="rounded-md px-6 font-bold text-[10px] uppercase tracking-widest">1. Attributes</TabsTrigger>
                              <TabsTrigger value="preview" className="rounded-md px-6 font-bold text-[10px] uppercase tracking-widest" disabled={variants.length <= 0}>2. Matrix Preview</TabsTrigger>
                          </TabsList>

                          <TabsContent value="configuration" className="space-y-6">
                                {attributes.map((attr, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-6 rounded-xl border border-slate-100">
                                        <div className="w-full md:w-1/3 space-y-2">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attribute (e.g. Size)</Label>
                                            <Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} placeholder="Title" className="h-10 border-slate-200 bg-white rounded-lg text-sm" />
                                        </div>
                                        <div className="w-full md:flex-1 space-y-2">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Values (Comma separated)</Label>
                                            <Input value={attr.inputValue} onChange={e => { const updated = [...attributes]; updated[idx].inputValue = e.target.value; setAttributes(updated); }} placeholder="Red, Green, Blue" className="h-10 border-slate-200 bg-white rounded-lg text-sm" />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 h-10 w-10">
                                            <Trash size={18} />
                                        </Button>
                                    </div>
                                ))}
                              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                  <Button variant="outline" onClick={() => setAttributes([...attributes, { name: '', inputValue: '', values: [] }])} className="h-10 px-6 text-blue-600 font-bold text-[10px] uppercase tracking-widest gap-2">
                                    <Plus size={16} /> Add Specification
                                  </Button>
                                  <Button type="button" onClick={generateVariants} className="h-10 px-8 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95">
                                    <Wand2 size={16} className="mr-2" /> Generate Matrix
                                  </Button>
                              </div>
                          </TabsContent>

                          <TabsContent value="preview">
                              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                                <ScrollArea className="w-full max-h-[400px]">
                                  <Table>
                                      <TableHeader className="bg-slate-50">
                                          <TableRow className="h-12">
                                              <TableHead className="px-6 font-bold uppercase text-slate-500 text-[10px] tracking-wider">Variant</TableHead>
                                              <TableHead className="text-center font-bold uppercase text-slate-500 text-[10px] tracking-wider">Price ({businessCurrency})</TableHead>
                                              <TableHead className="text-center font-bold uppercase text-slate-500 text-[10px] tracking-wider">Stock</TableHead>
                                              <TableHead className="px-6 text-right font-bold uppercase text-slate-500 text-[10px] tracking-wider">SKU</TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {variants.map((v, idx) => (
                                              <TableRow key={idx} className="h-14 hover:bg-slate-50 transition-all border-b last:border-none">
                                                  <TableCell className="px-6 text-xs font-bold text-slate-800 uppercase">{v.name}</TableCell>
                                                  <TableCell className="text-center"><Input type="number" className="h-9 w-24 border-slate-200 text-blue-600 font-bold rounded-md text-center text-sm mx-auto" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} /></TableCell>
                                                  <TableCell className="text-center"><Input type="number" className="h-9 w-24 border-slate-200 text-emerald-600 font-bold rounded-md text-center text-sm mx-auto" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))} /></TableCell>
                                                  <TableCell className="px-6"><Input className="h-9 w-32 border-slate-200 rounded-md uppercase text-[10px] font-bold text-right ml-auto" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="AUTO" /></TableCell>
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

              <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="hidden sm:flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 font-bold text-[9px] uppercase tracking-wider">
                  <ShieldCheck size={14} /> Verification: Active
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                    <Button variant="ghost" onClick={() => setOpen(false)} className="h-11 px-8 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Cancel</Button>
                    <Button onClick={() => mutate()} disabled={isPending} className="h-11 px-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95 flex-1 sm:flex-none">
                      {isPending ? <Loader2 size={16} className="animate-spin" /> : "Authorize Asset"}
                    </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search registry..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 border-slate-200 bg-white rounded-xl shadow-sm font-medium text-sm focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-8 px-4">
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Nodes</span>
                <p className="text-xl font-bold text-slate-900">{products?.length || 0}</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Currency</span>
                <p className="text-xl font-bold text-blue-600">{businessCurrency}</p>
              </div>
          </div>
        </div>

        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-14 border-none">
                    <TableHead className="pl-8 font-bold uppercase text-slate-500 text-[10px] tracking-wider">Product / Spec</TableHead>
                    <TableHead className="font-bold uppercase text-slate-500 text-[10px] tracking-wider">Category</TableHead>
                    <TableHead className="text-right font-bold uppercase text-slate-500 text-[10px] tracking-wider">Rate</TableHead>
                    <TableHead className="text-center font-bold uppercase text-slate-500 text-[10px] tracking-wider">Stock</TableHead>
                    <TableHead className="pr-8 text-right font-bold uppercase text-slate-500 text-[10px] tracking-wider">SKU</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isProductsLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-200" /></TableCell></TableRow>
                  ) : products?.length === 0 ? (
                     <TableRow><TableCell colSpan={5} className="h-64 text-center font-bold uppercase tracking-widest text-slate-300 text-[10px]">No registry entries</TableCell></TableRow>
                  ) : products?.filter(p => p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) || p.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((p: any) => (
                    <TableRow key={p.id} className="h-16 hover:bg-slate-50/50 border-b last:border-none group">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-4">
                          <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Palette size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{p.products?.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{p.name}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-[8px] uppercase tracking-wider px-3 py-1 rounded-full">
                          {p.products?.categories?.name || 'Unclassified'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800 text-sm">
                        {p.price.toLocaleString()} <span className="text-[9px] text-slate-400 uppercase ml-1">{businessCurrency}</span>
                      </TableCell>
                      <TableCell className="text-center">
                         <span className={`text-xs font-bold ${p.stock_quantity > 10 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {p.stock_quantity.toLocaleString()} <span className="text-[9px] text-slate-300 uppercase ml-0.5">units</span>
                         </span>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        <code className="text-[9px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-md border border-slate-100 uppercase tracking-widest">
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

      <footer className="pt-12 pb-10 flex justify-between items-center opacity-50 border-t border-slate-100">
        <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
           <ShieldCheck size={14} /> Asset Protocol v2.6.5
        </div>
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
           Last Sync: {new Date().toLocaleDateString()}
        </div>
      </footer>

      {/* UNIT DIALOG */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden border-none shadow-2xl bg-white">
          <DialogHeader className="px-8 py-6 bg-slate-900 text-white">
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Metric Definition</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit Name</Label>
              <Input placeholder="e.g. Kilogram" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-10 border-slate-200 font-medium rounded-lg text-sm px-4" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Symbol</Label>
              <Input placeholder="KG" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)} className="h-10 border-slate-200 font-bold rounded-lg text-center uppercase text-sm" />
            </div>
          </div>
          <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-10 font-bold text-[10px] uppercase tracking-widest text-slate-400">Abort</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg flex-1">
               {isSavingUnit ? <Loader2 className="animate-spin w-4 h-4" /> : "Commit Spec"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}