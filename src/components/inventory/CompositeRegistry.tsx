'use client';

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Factory, ShieldCheck, Layers, Plus, Database, 
  Settings2, Loader2, Package, Beaker, Zap, Ruler,
  ArrowRight, CheckCircle2, AlertCircle, Scale, X, Tags, FolderPlus,
  Search, ClipboardList, Info, Trash2, Edit3, MoreHorizontal, DollarSign
} from "lucide-react";
import toast from 'react-hot-toast';

// --- UI COMPONENTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const supabase = createClient();

export default function CompositeRegistry() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // States
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Industrial Form State
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    uom_id: '',
    measurement_value: '', // Unit Size (e.g. 5)
    base_price: '',        // Retail Valuation
    cost_estimate: ''      // Production Cost per Unit
  });

  const [editData, setEditData] = useState<any>(null);
  const [newUnit, setNewUnit] = useState({ name: '', abbreviation: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  // --- 1. DATA QUERIES ---
  const { data: profile } = useQuery({
    queryKey: ['mfg_identity_registry'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('business_id, currency').limit(1).single();
      return data;
    }
  });

  const { data: designs, isLoading: isDesignsLoading } = useQuery({
    queryKey: ['composite_design_ledger', profile?.business_id],
    queryFn: async () => {
        if (!profile?.business_id) return [];
        const { data, error } = await supabase.from('composite_design_ledger_view').select('*').eq('business_id', profile?.business_id);
        if (error) throw error;
        return data || [];
    },
    enabled: !!profile?.business_id
  });

  const { data: categories } = useQuery({
    queryKey: ['mfg_registry_categories', profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) return [];
      const { data } = await supabase.from('categories').select('id, name').eq('business_id', profile?.business_id);
      return data || [];
    },
    enabled: !!profile?.business_id
  });

  const { data: uoms } = useQuery({
    queryKey: ['mfg_registry_uoms'],
    queryFn: async () => {
      const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation').order('name');
      return data || [];
    }
  });

  // --- 2. MUTATIONS ---

  const deleteDesignMutation = useMutation({
    mutationFn: async (productId: number) => {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;
    },
    onSuccess: () => {
        toast.success("Design removed from catalog.");
        queryClient.invalidateQueries({ queryKey: ['composite_design_ledger'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const updateDesignMutation = useMutation({
    mutationFn: async (payload: any) => {
        // 1. Update Product Name & Category
        const { error: pErr } = await supabase.from('products').update({ 
            name: payload.name, 
            category_id: parseInt(payload.category_id) 
        }).eq('id', payload.product_id);
        if (pErr) throw pErr;

        // 2. Update Variant Details
        const { error: vErr } = await supabase.from('product_variants').update({
            sku: payload.sku,
            price: parseFloat(payload.price),
            cost_price: parseFloat(payload.cost_price),
            measurement_value: parseFloat(payload.measurement_value),
            uom_id: payload.uom_id
        }).eq('id', payload.variant_id);
        if (vErr) throw vErr;
    },
    onSuccess: () => {
        toast.success("Master design updated.");
        setIsEditModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['composite_design_ledger'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  // --- 3. HANDLERS ---

  const handleRegisterDesign = async () => {
    if (!form.name || !form.uom_id || !form.category_id || !form.measurement_value) {
        return toast.error("Design name, size, metric, and classification are mandatory.");
    }
    setLoading(true);
    try {
      const { data: product, error: pErr } = await supabase.from('products').insert([{
          name: form.name,
          business_id: profile?.business_id,
          category_id: parseInt(form.category_id),
          is_active: true
      }]).select().single();
      if (pErr) throw pErr;

      const { error: vErr } = await supabase.from('product_variants').insert([{
          product_id: product.id,
          business_id: profile?.business_id,
          name: 'Standard Batch',
          sku: form.sku || `MFG-${Date.now()}`,
          price: parseFloat(form.base_price) || 0,
          cost_price: parseFloat(form.cost_estimate) || 0,
          measurement_value: parseFloat(form.measurement_value),
          is_composite: true, 
          is_raw_material: false,
          uom_id: form.uom_id,
          status: 'active'
      }]);
      if (vErr) throw vErr;

      toast.success(`${form.name} authorized.`);
      setForm({ name: '', sku: '', category_id: '', uom_id: '', base_price: '', cost_estimate: '', measurement_value: '' });
      queryClient.invalidateQueries({ queryKey: ['composite_design_ledger'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDesigns = useMemo(() => {
    return designs?.filter(d => d.product_name.toLowerCase().includes(searchTerm.toLowerCase())) || [];
  }, [designs, searchTerm]);

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl animate-in fade-in duration-700">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-10">
          <div className="flex items-center gap-5">
             <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-2xl"><Factory size={28} /></div>
             <div>
                 <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">Finished Good Designer</CardTitle>
                 <CardDescription className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">Define manufacturing master identities</CardDescription>
             </div>
          </div>
        </CardHeader>

        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Identity</Label>
              <Input placeholder="e.g. NIM Gloss White 5L" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-12 border-slate-200 rounded-2xl font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global SKU</Label>
              <Input placeholder="Auto-generated" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-12 border-slate-200 rounded-2xl font-mono" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Design Classification</Label>
              <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                <SelectTrigger className="h-12 border-slate-200 rounded-2xl font-bold"><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent className="rounded-2xl">{categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit size</Label>
                    <Input type="number" placeholder="e.g. 5" value={form.measurement_value} onChange={e => setForm({...form, measurement_value: e.target.value})} className="h-12 border-slate-200 rounded-2xl font-bold text-center" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Metric</Label>
                    <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
                        <SelectTrigger className="h-12 border-slate-200 rounded-2xl font-bold"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="rounded-2xl">{uoms?.map(u => <SelectItem key={u.id} value={u.id}>{u.abbreviation}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Est. Production cost ({profile?.currency})</Label>
              <Input type="number" value={form.cost_estimate} onChange={e => setForm({...form, cost_estimate: e.target.value})} className="h-12 border-blue-100 bg-blue-50/20 rounded-2xl font-black text-blue-600 text-lg text-center" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Retail Valuation ({profile?.currency})</Label>
              <Input type="number" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})} className="h-12 border-emerald-100 bg-emerald-50/20 rounded-2xl font-black text-emerald-600 text-lg text-center" />
            </div>

            <div className="lg:col-span-3 flex justify-end">
              <Button onClick={handleRegisterDesign} disabled={loading} className="px-12 bg-slate-900 hover:bg-blue-700 text-white font-black h-12 shadow-xl rounded-2xl uppercase tracking-widest text-xs">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="mr-2 h-5 w-5"/>} Authorize design
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- DESIGNED ASSET LEDGER --- */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-[2.5rem] animate-in slide-in-from-bottom duration-700">
        <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ClipboardList size={22} /></div>
                <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Designed Asset Ledger</CardTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Manufacturing Catalog</p>
                </div>
            </div>
            <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input placeholder="Filter designs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-11 h-11 border-slate-100 bg-slate-50/50 rounded-2xl text-xs font-bold" />
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="w-full">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-none">
                            <TableHead className="pl-10 h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest">Design Identity</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Unit size</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Production Cost</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Retail price</TableHead>
                            <TableHead className="pr-10 h-14 w-32"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isDesignsLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-200" /></TableCell></TableRow>
                        ) : filteredDesigns.map((design) => (
                            <TableRow key={design.variant_id} className="group hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                                <TableCell className="pl-10 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-slate-900 uppercase">{design.product_name}</span>
                                        <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase">{design.sku} • {design.category_name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-black text-slate-600">
                                    {design.measurement_value} <span className="text-[10px] text-slate-400 uppercase ml-1">{design.unit_abbr}</span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums font-bold text-blue-600">{design.cost_price.toLocaleString()}</TableCell>
                                <TableCell className="text-right tabular-nums font-black text-slate-900">{design.retail_price.toLocaleString()}</TableCell>
                                <TableCell className="pr-10 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditData(design); setIsEditModalOpen(true); }} className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit3 size={16} /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => confirm("Delete this design master?") && deleteDesignMutation.mutate(design.product_id)} className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </CardContent>
      </Card>

      {/* --- MODAL: EDIT DESIGN --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Master Design</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs uppercase font-bold mt-1">{editData?.product_name}</DialogDescription>
                </div>
                <DialogClose className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></DialogClose>
            </div>
            <div className="p-10 grid grid-cols-2 gap-8">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Product Name</Label>
                    <Input value={editData?.product_name || ''} onChange={e => setEditData({...editData, product_name: e.target.value})} className="h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Global SKU</Label>
                    <Input value={editData?.sku || ''} onChange={e => setEditData({...editData, sku: e.target.value})} className="h-12 rounded-xl font-mono" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Unit size</Label>
                    <Input type="number" value={editData?.measurement_value || ''} onChange={e => setEditData({...editData, measurement_value: e.target.value})} className="h-12 rounded-xl text-center font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Metric</Label>
                    <Select value={editData?.uom_id} onValueChange={v => setEditData({...editData, uom_id: v})}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">{uoms?.map(u => <SelectItem key={u.id} value={u.id}>{u.abbreviation}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Production cost</Label>
                    <Input type="number" value={editData?.cost_price || ''} onChange={e => setEditData({...editData, cost_price: e.target.value})} className="h-12 rounded-xl text-blue-600 font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Retail Price</Label>
                    <Input type="number" value={editData?.retail_price || ''} onChange={e => setEditData({...editData, retail_price: e.target.value})} className="h-12 rounded-xl text-emerald-600 font-bold" />
                </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t flex gap-4">
                <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="uppercase font-bold text-xs tracking-widest text-slate-400">Discard</Button>
                <Button onClick={() => updateDesignMutation.mutate({
                    product_id: editData.product_id,
                    variant_id: editData.variant_id,
                    name: editData.product_name,
                    sku: editData.sku,
                    price: editData.retail_price,
                    cost_price: editData.cost_price,
                    measurement_value: editData.measurement_value,
                    uom_id: editData.uom_id,
                    category_id: editData.category_id
                })} className="bg-slate-900 text-white font-black px-10 h-12 rounded-2xl uppercase tracking-widest text-xs flex-1">Authorize Updates</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}