'use client';

/**
 * --- FINISHED GOOD DESIGNER ---
 * VERSION: v6.3 ENTERPRISE (MEDIA & FORENSIC DELETE)
 * Use: Establishing master identities for manufactured goods with cost-unit tracking.
 * Logic: Composite Asset Birth + Optional Media Weld + Industrial Purge.
 */

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Factory, ShieldCheck, Layers, Plus, Database, 
  Settings2, Loader2, Package, Beaker, Zap, Ruler,
  ArrowRight, CheckCircle2, AlertCircle, Scale, X, Tags, FolderPlus,
  Search, ClipboardList, Info, Trash2, Edit3, MoreHorizontal, DollarSign,
  Calculator, Target, Camera, ImagePlus, Video
} from "lucide-react";
import toast from 'react-hot-toast';

// --- UI COMPONENTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const supabase = createClient();

export default function CompositeRegistry() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal States
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Master Design Form State
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    uom_id: '',
    measurement_value: '', 
    cost_estimate: '',      
    base_price: '',
    media_url: '' // Logic: Added media URL to state
  });

  const [editData, setEditData] = useState<any>(null);
  const [newUnit, setNewUnit] = useState({ name: '', abbreviation: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  // --- 1. SYSTEM CONTEXT QUERIES ---
  const { data: profile } = useQuery({
    queryKey: ['mfg_identity_registry'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('business_id, currency').limit(1).single();
      return data;
    }
  });

  // Fetch Existing Designs
  const { data: designs, isLoading: isDesignsLoading } = useQuery({
    queryKey: ['composite_design_ledger', profile?.business_id],
    queryFn: async () => {
        if (!profile?.business_id) return [];
        const { data, error } = await supabase
            .from('composite_design_ledger_view')
            .select('*')
            .eq('business_id', profile?.business_id)
            .order('product_name', { ascending: true });
        
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

  // --- 2. REGISTRY MUTATIONS ---

  const deleteDesignMutation = useMutation({
    mutationFn: async (productId: number) => {
        const { error } = await supabase.rpc('bulk_delete_products_v2', {
            p_product_ids: [productId]
        });
        if (error) throw error;
    },
    onSuccess: () => {
        toast.success("Industrial design and associated links purged.");
        queryClient.invalidateQueries({ queryKey: ['composite_design_ledger'] });
    },
    onError: (e: any) => toast.error(`Purge Failed: ${e.message}`)
  });

  const updateDesignMutation = useMutation({
    mutationFn: async (payload: any) => {
        const { error: pErr } = await supabase.from('products')
            .update({ name: payload.name, category_id: parseInt(payload.category_id) })
            .eq('id', payload.product_id);
        if (pErr) throw pErr;

        const { error: vErr } = await supabase.from('product_variants')
            .update({
                sku: payload.sku,
                price: parseFloat(payload.price),
                cost_price: parseFloat(payload.cost_price),
                measurement_value: parseFloat(payload.measurement_value),
                uom_id: payload.uom_id
            })
            .eq('id', payload.variant_id);
        if (vErr) throw vErr;
    },
    onSuccess: () => {
        toast.success("Master design identity updated.");
        setIsEditModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['composite_design_ledger'] });
    },
    onError: (e: any) => toast.error(`Update Error: ${e.message}`)
  });

  // --- 3. AUTONOMOUS LOGIC ---

  const filteredDesigns = useMemo(() => {
    if (!designs) return [];
    return designs.filter(d => 
        d.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [designs, searchTerm]);

  // Logic: Forensic Media Upload Handler
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.business_id) return;

    setUploadingMedia(true);
    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${profile.business_id}/designs/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('inventory-assets')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('inventory-assets')
            .getPublicUrl(filePath);

        setForm(prev => ({ ...prev, media_url: publicUrl }));
        toast.success("Industrial design media captured.");
    } catch (error: any) {
        toast.error(`Media Sync Error: ${error.message}`);
    } finally {
        setUploadingMedia(false);
    }
  };

  const generateForensicSKU = (name: string) => {
    if (!name || name.length < 2) return '';
    const prefix = "MFG-";
    const initials = name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `MFG-${initials}-${timestamp}`;
  };

  useEffect(() => {
    if (form.name && !form.sku) {
        setForm(prev => ({ ...prev, sku: generateForensicSKU(form.name) }));
    }
  }, [form.name]);

  // --- 4. REGISTRY HANDLERS ---

  const handleCreateUnit = async () => {
    if (!newUnit.name || !newUnit.abbreviation) return toast.error("Unit details required.");
    try {
        const { data, error } = await supabase.from('units_of_measure').insert([{ 
            name: newUnit.name, abbreviation: newUnit.abbreviation.toUpperCase() 
        }]).select().single();
        if (error) throw error;
        toast.success(`Unit '${data.name}' authorized.`);
        setForm(prev => ({ ...prev, uom_id: data.id }));
        setNewUnit({ name: '', abbreviation: '' });
        setIsUnitModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['mfg_registry_uoms'] });
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  const handleRegisterDesign = async () => {
    if (!form.name || !form.uom_id || !form.category_id || !form.measurement_value) {
        return toast.error("Identity, Size, Metric, and Classification are required.");
    }
    setLoading(true);
    try {
      // Logic: Using upgraded v1 onboarding function that supports p_media_url
      const { error } = await supabase.rpc('fn_industrial_material_onboard_v1', {
          p_name: form.name,
          p_sku: form.sku || generateForensicSKU(form.name),
          p_type: 'Liquid', // Default for Finished Goods
          p_quality: 'Standard',
          p_price: parseFloat(form.base_price) || 0,
          p_initial_qty: 0, // Designs start with 0 stock
          p_uom_id: form.uom_id,
          p_vendor_id: null,
          p_currency: profile?.currency,
          p_color: null,
          p_media_url: form.media_url || null // Media is optional
      });

      if (error) throw error;

      toast.success(`${form.name} design committed.`);
      setForm({ name: '', sku: '', category_id: '', uom_id: '', base_price: '', cost_estimate: '', measurement_value: '', media_url: '' });
      queryClient.invalidateQueries({ queryKey: ['composite_design_ledger'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
      
      {/* --- FORM SECTION --- */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                      <Factory size={28} />
                 </div>
                 <div>
                     <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">Finished Good Designer</CardTitle>
                     <CardDescription className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">
                          Establish master identities for manufactured goods.
                     </CardDescription>
                 </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <ShieldCheck className="text-emerald-500" size={16} />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Security Node: Active</span>
              </div>
          </div>
        </CardHeader>

        <CardContent className="p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Finished Asset Identity</Label>
              <Input placeholder="e.g. NIM Gloss White Paint 5L" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-12 border-slate-200 focus:ring-blue-500 font-bold rounded-2xl shadow-sm" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Global SKU / Lot Serial</Label>
              <Input placeholder="Auto-generated" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-12 border-slate-200 font-mono text-sm rounded-2xl shadow-sm" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Classification</Label>
              <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm"><SelectValue placeholder="Select Production Type" /></SelectTrigger>
                <SelectContent className="rounded-2xl">{categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unit Size</Label>
                    <Input type="number" placeholder="e.g. 5" value={form.measurement_value} onChange={e => setForm({...form, measurement_value: e.target.value})} className="h-12 border-slate-200 font-bold text-center rounded-2xl shadow-sm" />
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Metric</Label>
                        <button type="button" onClick={() => setIsUnitModalOpen(true)} className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase flex items-center gap-0.5"><Plus size={10}/>New</button>
                    </div>
                    <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
                        <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="rounded-2xl">{uoms?.map(u => <SelectItem key={u.id} value={u.id}>{u.abbreviation}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Cost per Unit ({profile?.currency})</Label>
              <Input type="number" value={form.cost_estimate} onChange={e => setForm({...form, cost_estimate: e.target.value})} className="h-12 border-blue-100 bg-blue-50/30 font-black text-lg text-blue-700 rounded-2xl shadow-sm text-center" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Retail Valuation ({profile?.currency})</Label>
              <Input type="number" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})} className="h-12 border-emerald-100 bg-emerald-50/30 font-black text-lg text-emerald-700 rounded-2xl shadow-sm text-center" />
            </div>

            {/* UI NODE: ASSET MEDIA UPLOAD (RESTORED) */}
            <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Visual Reference (Optional)</Label>
                <div className="relative group">
                    <Input 
                        type="file" 
                        accept="image/*,video/*" 
                        onChange={handleMediaUpload}
                        className="hidden" 
                        id="design-media-upload"
                    />
                    <label 
                        htmlFor="design-media-upload" 
                        className={cn(
                            "flex items-center justify-center gap-3 h-12 px-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                            form.media_url ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:border-blue-400 text-slate-400 hover:text-blue-600"
                        )}
                    >
                        {uploadingMedia ? <Loader2 className="animate-spin h-5 w-5" /> : form.media_url ? <CheckCircle2 size={18} /> : <Camera size={18} />}
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            {uploadingMedia ? "Uploading..." : form.media_url ? "Media Captured" : "Attach Photo/Video"}
                        </span>
                    </label>
                </div>
            </div>

            <div className="lg:col-span-2 flex justify-end items-end">
              <Button onClick={handleRegisterDesign} disabled={loading || uploadingMedia} className="px-12 bg-slate-900 hover:bg-blue-700 text-white font-black h-14 shadow-2xl rounded-2xl transition-all uppercase tracking-widest text-xs group">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform"/>} 
                Authorize Design
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- LEDGER SECTION --- */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-[2.5rem] animate-in slide-in-from-bottom duration-700">
        <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ClipboardList size={22} />
                </div>
                <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">Designed Asset Ledger</CardTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized manufacturing master identities</p>
                </div>
            </div>
            <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                    placeholder="Search Identity or SKU..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-11 h-11 border-slate-100 bg-slate-50/50 rounded-2xl text-xs font-bold"
                />
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="w-full">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="pl-10 h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest">Design Identity</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Output Metric</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Classification</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Production Cost</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-10">Retail price</TableHead>
                            <TableHead className="w-32"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isDesignsLoading ? (
                            <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="animate-spin h-8 w-8 text-slate-200 mx-auto" /></TableCell></TableRow>
                        ) : filteredDesigns.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-40 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No Designs Found</TableCell></TableRow>
                        ) : (
                            filteredDesigns.map((design) => (
                                <TableRow key={design.variant_id} className="group hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                                    <TableCell className="pl-10 py-6">
                                        <div className="flex items-center gap-4">
                                            {/* THUMBNAIL Logic */}
                                            {design.primary_media_url && (
                                                <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-100 shadow-sm shrink-0">
                                                    <img src={design.primary_media_url} className="h-full w-full object-cover" alt="design" />
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{design.product_name}</span>
                                                <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase">{design.sku}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-black text-slate-700">
                                        {design.measurement_value} <span className="text-[9px] text-slate-400 uppercase ml-1">{design.unit_abbr}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-bold px-3 py-1 rounded-lg uppercase text-[9px]">{design.category_name || 'General'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums font-bold text-blue-600">
                                        {design.cost_price?.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums font-black text-slate-900 pr-10">
                                        {design.retail_price?.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="pr-10 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditData(design); setIsEditModalOpen(true); }} className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={16} /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => confirm("Delete this master design identity?") && deleteDesignMutation.mutate(design.product_id)} className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </CardContent>
      </Card>

      {/* --- MODAL: EDIT MASTER DESIGN --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Master Identity</DialogTitle>
                    <DialogDescription className="text-slate-400 text-[10px] uppercase font-bold mt-1 tracking-widest">{editData?.product_name}</DialogDescription>
                </div>
                <DialogClose className="p-2 hover:bg-white/10 rounded-full text-slate-500"><X size={20}/></DialogClose>
            </div>
            <div className="p-10 grid grid-cols-2 gap-8">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Name</Label>
                    <Input value={editData?.product_name || ''} onChange={e => setEditData({...editData, product_name: e.target.value})} className="h-12 rounded-xl font-bold border-slate-100 bg-slate-50" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global SKU</Label>
                    <Input value={editData?.sku || ''} onChange={e => setEditData({...editData, sku: e.target.value})} className="h-12 rounded-xl font-mono border-slate-100 bg-slate-50" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Size</Label>
                    <Input type="number" value={editData?.measurement_value || ''} onChange={e => setEditData({...editData, measurement_value: e.target.value})} className="h-12 rounded-xl font-bold text-center border-slate-100 bg-slate-50" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</Label>
                    <Select value={editData?.category_id?.toString()} onValueChange={v => setEditData({...editData, category_id: v})}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">{categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Production Cost</Label>
                    <Input type="number" value={editData?.cost_price || ''} onChange={e => setEditData({...editData, cost_price: e.target.value})} className="h-12 rounded-xl font-black text-blue-600 border-blue-50 bg-blue-50/20" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retail valuation</Label>
                    <Input type="number" value={editData?.retail_price || ''} onChange={e => setEditData({...editData, retail_price: e.target.value})} className="h-12 rounded-xl font-black text-emerald-600 border-emerald-50 bg-emerald-50/20" />
                </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t flex gap-4">
                <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="uppercase font-bold text-[10px] tracking-[0.2em] text-slate-400 hover:text-slate-900">Discard Changes</Button>
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
                })} className="bg-slate-900 hover:bg-black text-white font-black px-12 h-12 rounded-2xl uppercase tracking-widest text-[10px] flex-1 shadow-2xl">Confirm Identity Update</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- METRIC & CATEGORY MODALS --- */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="max-w-sm rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
              <div className="bg-slate-900 p-8 text-white text-center">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center justify-center gap-3"><Scale className="text-blue-400" /> Metric Registry</DialogTitle>
              </div>
              <div className="p-8 space-y-6 bg-white">
                  <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</Label><Input value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} className="h-12 border-slate-200 font-bold rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Abbr</Label><Input value={newUnit.abbreviation} onChange={e => setNewUnit({...newUnit, abbreviation: e.target.value})} className="h-12 border-slate-200 font-black text-xl rounded-2xl" /></div>
              </div>
              <DialogFooter className="bg-slate-50 p-6 border-t flex gap-3">
                  <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="font-bold text-slate-400 uppercase text-[10px]">Discard</Button>
                  <Button onClick={handleCreateUnit} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-2xl shadow-xl uppercase text-[10px] flex-1">Save Metric</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent className="max-w-sm rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
              <div className="bg-slate-900 p-8 text-white text-center">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center justify-center gap-3"><FolderPlus className="text-blue-400" /> Sector Classification</DialogTitle>
              </div>
              <div className="p-8 space-y-6 bg-white">
                  <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</Label><Input value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="h-12 border-slate-200 font-bold rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logistics Note</Label><Input value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} className="h-12 border-slate-200 rounded-2xl" /></div>
              </div>
              <DialogFooter className="bg-slate-50 p-6 border-t flex gap-3">
                  <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)} className="font-bold text-slate-400 uppercase text-[10px]">Discard</Button>
                  <Button onClick={() => handleCreateCategory()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 rounded-2xl shadow-xl uppercase text-[10px] flex-1">Save Classification</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <CardFooter className="bg-slate-50/30 p-8 border-t border-slate-100 flex justify-between items-center opacity-30">
          <div className="flex items-center gap-3"><Package size={14} /><span className="text-[9px] font-bold uppercase tracking-widest">Sovereign OS Design Node v11.0</span></div>
          <Badge variant="outline" className="bg-white text-[9px] font-black border-slate-200 shadow-sm uppercase tracking-tighter">ISO-9001 Compliant Registry</Badge>
      </CardFooter>
    </div>
  );
}