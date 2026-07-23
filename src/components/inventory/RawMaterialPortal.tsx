'use client';

/**
 * --- RAW MATERIAL REGISTRY ---
 * VERSION: v4.9 OMEGA (AGRI-INPUT WELDED)
 * Use: Enterprise management for raw material inventory and supplier tracking.
 * Logic: Restock/Waste + Price Adj + Bulk Delete + Identity & Supplier Editing + Optional Agri-Input DNA.
 */

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FlaskConical, ShieldCheck, Truck, Scale, BadgeAlert, 
  Trash2, Search, History, Package, FileDown, 
  AlertTriangle, CheckCircle2, Loader2, Database, 
  Table as TableIcon, Layers, FileText, X, Globe,
  ArrowDownToLine, Filter, Settings, Calculator, Plus, Download,
  Ruler, Activity, DollarSign, Warehouse, Edit3, UserCheck,
  ImagePlus, Camera, Video, FileWarning,
  Sprout, // Added for Agri-Weld
  Syringe, // Added for Agri-Weld
  Milk // Added for Agri-Weld
} from "lucide-react";
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch"; // Added for Agri Toggle
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const supabase = createClient();

export default function RawMaterialPortal() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    name: '', sku: '', type: 'Solid', quality: 'Standard', 
    price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: '',
    color: '',
    imageUrl: '' 
  });

  // --- AGRI-DNA STATE (OPTIONAL) ---
  const [isAgriInput, setIsAgriInput] = useState(false);
  const [agriCategory, setAgriCategory] = useState('General');

  // Modal States
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeAdjustVariantId, setActiveAdjustVariantId] = useState<string | null>(null);
  const [newUnit, setNewUnit] = useState({ name: '', abbreviation: '' });
  const [adjustData, setAdjustData] = useState({ variant_id: '', qty: 0, reason: 'Restock', price: 0 });
  const [editData, setEditData] = useState({ variant_id: '', name: '', product_id: '', supplier_id: '' });

  // 1. DATA: Identity Handshake
  const { data: profile } = useQuery({
    queryKey: ['active_profile_context'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || '---';
  const businessName = profile?.business_name || 'Business Registry';

  // 2. DATA: Pull Materials
  const { data: materials, isLoading } = useQuery({
    queryKey: ['raw_materials_ledger'],
    queryFn: async () => {
      const { data, error } = await supabase.from('raw_material_registry').select('*');
      if (error) throw error;
      return data;
    }
  });

  // 3. DATA: Measurement Units
  const { data: uoms } = useQuery({
    queryKey: ['uoms'],
    queryFn: async () => {
      const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation').order('name');
      return data || [];
    }
  });

  // 4. DATA: Suppliers
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers_raw_registry'],
    queryFn: async () => {
      const { data } = await supabase.from('suppliers').select('id, name').order('name', { ascending: true });
      return data || [];
    }
  });

  // 5. MATH: Ledger Statistics
  const ledgerStats = useMemo(() => {
    if (!materials) return { totalValuation: 0, count: 0 };
    const totalValuation = materials.reduce((acc, m) => acc + (Number(m.current_stock) * Number(m.buying_price)), 0);
    return { totalValuation, count: materials.length };
  }, [materials]);

  // HANDLER: Media Upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile?.business_id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('inventory-assets')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('inventory-assets')
            .getPublicUrl(fileName);

        setForm(prev => ({ ...prev, imageUrl: publicUrl }));
        toast.success("Industrial asset media captured.");
    } catch (error: any) {
        toast.error(`Media Error: ${error.message}`);
    } finally {
        setUploading(false);
    }
  };

  // HANDLER: Create Unit
  const handleCreateUnit = async () => {
    if (!newUnit.name || !newUnit.abbreviation) return toast.error("Required fields missing.");
    try {
        const { data, error } = await supabase.from('units_of_measure').insert([{ 
            name: newUnit.name, 
            abbreviation: newUnit.abbreviation.toUpperCase() 
        }]).select().single();
        if (error) throw error;
        toast.success("Unit created.");
        setForm({ ...form, uom_id: data.id }); 
        setNewUnit({ name: '', abbreviation: '' });
        setIsUnitModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['uoms'] });
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  // HANDLER: Onboard (Updated with Agri Weld)
  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Please provide material name and unit.");
    setLoading(true);
    try {
      // Logic: Mapping Agri Category into the Type for forensic tracking
      const finalType = isAgriInput ? `Agri-${agriCategory}` : form.type;

      const { error } = await supabase.rpc('fn_industrial_material_onboard_v1', {
        p_name: form.name, 
        p_sku: form.sku, 
        p_type: finalType, 
        p_quality: form.quality,
        p_price: form.price, 
        p_initial_qty: form.qty, 
        p_uom_id: form.uom_id, 
        p_vendor_id: form.supplier_id ? parseInt(form.supplier_id) : null, 
        p_currency: businessCurrency, 
        p_color: form.color,
        p_media_url: form.imageUrl || null 
      });
      if (error) throw error;
      toast.success("Material authorized.");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: '', color: '', imageUrl: '' });
      setIsAgriInput(false);
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // MUTATION: Delete
  const deleteSelectedMutation = useMutation({
    mutationFn: async () => {
      if (selectedItems.length === 0) return;
      const { error } = await supabase.from('product_variants').delete().in('id', selectedItems);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Materials removed.");
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  // MUTATION: Update Identity
  const updateMaterialMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('products')
        .update({ 
            name: editData.name,
            preferred_vendor_id: editData.supplier_id || null 
        })
        .eq('id', editData.product_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Identity updated.");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  // MUTATION: Adjustment (Updated with Spinner Loading & Automatic Close)
  const logAdjustment = useMutation({
    mutationFn: async () => {
      const isDeduction = ['Waste', 'Damage'].includes(adjustData.reason);
      const direction = isDeduction ? -1 : 1;

      // Call RPC function only - RPC updates stock_levels, inventory, and product_variants atomically
      const { error: stockError } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: Math.abs(adjustData.qty) * direction,
        p_reason: `Sync: ${adjustData.reason}`
      });

      if (stockError) throw stockError;
    },
    onSuccess: async () => {
      toast.success("Ledger synchronized.");
      setActiveAdjustVariantId(null); // Closes the modal cleanly so user sees updated balance
      await queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    },
    onError: (e: any) => {
      toast.error(`Sync Error: ${e.message}`);
    }
  });

  const downloadReport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
        const headers = "Description,SKU,Stock,Price,Value\n";
        const rows = materials?.map(m => `${m.product_name},${m.sku},${m.current_stock} ${m.unit},${m.buying_price},${m.current_stock * m.buying_price}`).join("\n");
        const url = window.URL.createObjectURL(new Blob([headers + rows], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `Material_Registry_${Date.now()}.csv`;
        link.click();
        return;
    }
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.text("RAW MATERIAL REGISTRY REPORT", 14, 22);
    (doc as any).autoTable({
        startY: 40,
        head: [['Description', 'SKU', 'Stock', 'Price', 'Total']],
        body: materials?.map(m => [m.product_name, m.sku, `${m.current_stock} ${m.unit}`, m.buying_price, (m.current_stock * m.buying_price)])
    });
    doc.save(`Material_Audit_${Date.now()}.pdf`);
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 1. HEADER */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-slate-100 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest">
                <Activity size={16} /> Inventory Governance
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Raw Material Registry</h1>
            <p className="text-sm font-medium text-slate-500">Business Unit: {businessName}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-8 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Materials</p>
                <p className="text-xl font-bold text-slate-900">{ledgerStats.count}</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registry Value</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">
                    {ledgerStats.totalValuation.toLocaleString()} <span className="text-[10px] font-bold text-slate-400 ml-1">{businessCurrency}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <Button onClick={() => downloadReport('EXCEL')} variant="outline" className="h-11 px-5 font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                 <Download size={16} className="mr-2" /> EXCEL
               </Button>
               <Button onClick={() => downloadReport('PDF')} variant="outline" className="h-11 px-5 font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                 <FileText size={16} className="mr-2" /> PDF
               </Button>
            </div>
          </div>
      </header>

      {/* 2. ENROLLMENT FORM */}
      <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-md font-bold text-slate-900 uppercase tracking-wider">Material Enrollment</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Material Description</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-11 rounded-xl border-slate-200 focus:ring-blue-600 shadow-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">SKU / Registry ID</Label>
              <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-11 rounded-xl font-mono text-xs uppercase" />
            </div>

            {/* THE AGRI-INPUT WELD (OPTIONAL) */}
            <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center space-x-3 p-3 rounded-xl bg-emerald-50/30 border border-emerald-100 h-11">
                    <Sprout className={cn("h-4 w-4", isAgriInput ? "text-emerald-600" : "text-slate-300")} />
                    <Label className="text-[11px] font-bold text-slate-500 flex-1 cursor-pointer">Agricultural Input</Label>
                    <Switch checked={isAgriInput} onCheckedChange={setIsAgriInput} />
                </div>
            </div>

            {isAgriInput ? (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label className="text-[11px] font-bold text-emerald-700 uppercase ml-1">Agri Category</Label>
                    <Select onValueChange={setAgriCategory} defaultValue="Seed">
                        <SelectTrigger className="h-11 rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-900 font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Seed">Seed / Seedling</SelectItem>
                            <SelectItem value="Fertilizer">Fertilizer / Soil Input</SelectItem>
                            <SelectItem value="Medicine">Medicine / Vaccine</SelectItem>
                            <SelectItem value="Feed">Animal Feed / Nutrition</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Physical State</Label>
                    <Select onValueChange={v => setForm({...form, type: v})} defaultValue="Solid">
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Solid">Solid / Powder</SelectItem>
                        <SelectItem value="Liquid">Liquid / Fluid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Quality Standard</Label>
              <Select onValueChange={v => setForm({...form, quality: v})} defaultValue="Standard">
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Unit of Measure</Label>
              <div className="flex gap-2">
                <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
                  <SelectTrigger className="h-11 rounded-xl flex-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {uoms?.map(u => <SelectItem key={u.id} value={u.id}>{u.abbreviation}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setIsUnitModalOpen(true)} className="h-11 w-11 rounded-xl"><Plus size={16} /></Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Price per Unit ({businessCurrency})</Label>
              <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="h-11 rounded-xl text-right font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-blue-600 uppercase ml-1">Opening Quantity</Label>
              <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="h-11 border-blue-100 bg-blue-50/30 rounded-xl font-bold text-right text-blue-700 shadow-inner" />
            </div>
            
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Verified Supply Partner</Label>
              <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Identify Supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Material Color</Label>
              <Input placeholder="e.g. White" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="h-11 rounded-xl border-slate-200 shadow-sm" />
            </div>

            <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Asset Media (Optional)</Label>
                <div className="relative group">
                    <Input type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" id="media-upload" />
                    <label htmlFor="media-upload" className={cn(
                            "flex items-center justify-center gap-3 h-11 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                            form.imageUrl ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:border-blue-400 text-slate-400 hover:text-blue-600"
                        )}>
                        {uploading ? <Loader2 className="animate-spin h-4 w-4" /> : form.imageUrl ? <CheckCircle2 size={16} /> : <Camera size={16} />}
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            {uploading ? "Uploading..." : form.imageUrl ? "Media Captured" : "Attach Photo/Video"}
                        </span>
                    </label>
                </div>
            </div>

            <div className="flex items-end">
              <Button onClick={handleOnboard} disabled={loading || uploading} className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl shadow-lg uppercase text-[10px] active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Authorize Entry"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. MATERIAL LEDGER TABLE */}
      <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="px-8 py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20">
          <div className="space-y-0.5">
            <CardTitle className="text-xl font-bold text-slate-900">Current Inventory Ledger</CardTitle>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Real-time balancing of warehouse stock</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
              {selectedItems.length > 0 && (
                <Button onClick={() => deleteSelectedMutation.mutate()} variant="destructive" className="h-11 px-6 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 animate-in slide-in-from-right-4 transition-all">
                  <Trash2 size={16} className="mr-2" /> Remove ({selectedItems.length})
                </Button>
              )}
              <div className="relative w-full md:w-[400px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search narratives or SKUs..." onChange={e => setSearchTerm(e.target.value)} className="h-11 pl-11 rounded-xl shadow-sm" />
              </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="h-14 border-none">
                  <TableHead className="w-16 text-center border-r border-slate-100">
                    <Checkbox onCheckedChange={(c) => setSelectedItems(c ? materials?.map(m => m.variant_id) || [] : [])} />
                  </TableHead>
                  <TableHead className="px-6 font-bold uppercase text-slate-500 text-[10px] tracking-widest">Status</TableHead>
                  <TableHead className="font-bold uppercase text-slate-500 text-[10px] tracking-widest">Material Identity</TableHead>
                  <TableHead className="text-right font-bold uppercase text-slate-500 text-[10px] tracking-widest">Unit Rate</TableHead>
                  <TableHead className="text-right font-bold uppercase text-slate-500 text-[10px] tracking-widest">Balance</TableHead>
                  <TableHead className="px-10 text-right font-bold uppercase text-slate-500 text-[10px] tracking-widest">Valuation</TableHead>
                  <TableHead className="w-24 text-center font-bold uppercase text-slate-500 text-[10px] tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                  <TableRow key={m.variant_id} className="h-20 hover:bg-slate-50/50 transition-colors border-b last:border-none">
                    <TableCell className="text-center">
                      <Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} />
                    </TableCell>
                    <TableCell className="px-6">
                        <Badge variant="outline" className={cn("border-none font-bold text-[9px] uppercase px-3 py-1 rounded-md", m.current_stock > 50 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                            {m.current_stock > 50 ? 'Healthy' : 'Low Stock'}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        {m.primary_media_url && (
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-100 shadow-sm shrink-0">
                                <img src={m.primary_media_url} className="h-full w-full object-cover" alt="asset" />
                            </div>
                        )}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                {/* AGRI ICON HANDSHAKE IN TABLE */}
                                {String(m.type).startsWith('Agri-') && <Sprout size={12} className="text-emerald-500" />}
                                <span className="font-bold text-slate-900 text-[15px]">{m.product_name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.sku}</span>
                                {m.color && <Badge variant="outline" className="h-4 px-1.5 text-[8px] text-slate-500 uppercase">{m.color}</Badge>}
                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter bg-blue-50 px-1.5 rounded">{m.type}</span>
                            </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm tabular-nums">{m.buying_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn("text-base font-bold tabular-nums", m.current_stock < 20 ? 'text-rose-600' : 'text-slate-900')}>{m.current_stock?.toLocaleString()}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{m.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 text-right font-bold text-slate-900 text-sm tabular-nums">{(m.current_stock * m.buying_price).toLocaleString()}</TableCell>
                    <TableCell className="pr-6">
                        <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setEditData({ variant_id: m.variant_id, name: m.product_name, product_id: m.product_id, supplier_id: m.preferred_vendor_id }); setIsEditModalOpen(true); }} className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full flex items-center justify-center transition-all">
                                <Edit3 size={18} />
                            </button>

                            <Dialog 
                              open={activeAdjustVariantId === m.variant_id} 
                              onOpenChange={(open) => {
                                if (open) {
                                  setActiveAdjustVariantId(m.variant_id);
                                  setAdjustData({ variant_id: m.variant_id, qty: 0, reason: 'Restock', price: m.buying_price });
                                } else {
                                  setActiveAdjustVariantId(null);
                                }
                              }}
                            >
                                <DialogTrigger asChild>
                                <button className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all">
                                    <BadgeAlert size={20} />
                                </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden bg-white">
                                    <div className="bg-slate-900 p-8 text-white text-center">
                                        <DialogTitle className="text-lg font-bold uppercase tracking-widest">Inventory Correction</DialogTitle>
                                        <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">{m.product_name}</DialogDescription>
                                    </div>
                                    <div className="p-10 space-y-8">
                                        <div className="space-y-4">
                                            <Label className="text-[11px] font-bold text-slate-400 uppercase text-center block tracking-widest">Adjustment Quantity</Label>
                                            <div className="relative">
                                                <Input type="number" className="h-16 border-slate-100 bg-slate-50 font-black text-3xl text-center rounded-2xl shadow-inner" onChange={e => setAdjustData(prev => ({ ...prev, qty: Number(e.target.value) }))} />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-300 uppercase text-[11px]">{m.unit}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-[11px] font-bold text-slate-400 uppercase text-center block tracking-widest">Correction: Price per Unit</Label>
                                            <div className="relative">
                                                <Input type="number" value={adjustData.price} className="h-16 border-slate-100 bg-white font-bold text-2xl text-center rounded-2xl text-blue-600 shadow-sm" onChange={e => setAdjustData(prev => ({ ...prev, price: Number(e.target.value) }))} />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-300 uppercase text-[11px]">{businessCurrency}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Identify Purpose</Label>
                                            <Select value={adjustData.reason} onValueChange={v => setAdjustData(prev => ({ ...prev, reason: v }))}>
                                            <SelectTrigger className="h-12 border-slate-200 bg-white font-semibold rounded-xl text-sm"><SelectValue placeholder="Reason for change" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Restock">Restock / Incoming Shipment</SelectItem>
                                                <SelectItem value="Waste">Production Waste / Spoiled Crop</SelectItem>
                                                <SelectItem value="Damage">Material Damage</SelectItem>
                                                <SelectItem value="Audit">Audit Correction</SelectItem>
                                            </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter className="p-8 bg-slate-50 border-t">
                                        <Button 
                                          onClick={() => logAdjustment.mutate()} 
                                          disabled={logAdjustment.isPending}
                                          className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                        >
                                            {logAdjustment.isPending ? (
                                              <>
                                                <Loader2 className="animate-spin h-5 w-5" />
                                                <span>Synchronizing...</span>
                                              </>
                                            ) : (
                                              "Confirm Synchronization"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
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

      {/* MODAL: EDIT NAME & SUPPLIER */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-sm rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
              <div className="bg-slate-900 p-8 text-white text-center">
                  <DialogTitle className="text-sm font-bold uppercase tracking-widest">Update Identity Master</DialogTitle>
              </div>
              <div className="p-8 space-y-6">
                  <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">New Material Name</Label>
                      <Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="h-11 border-slate-200 rounded-xl font-bold text-slate-900" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Primary Supplier Link</Label>
                      <Select value={editData.supplier_id || "none"} onValueChange={v => setEditData({...editData, supplier_id: v === "none" ? "" : v})}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Fix Supplier Link" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- No Supplier Linked --</SelectItem>
                          {suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                  </div>
              </div>
              <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex gap-4">
                  <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="h-11 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Cancel</Button>
                  <Button onClick={() => updateMaterialMutation.mutate()} className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-xl shadow-lg uppercase text-[10px] flex-1">Authorize Changes</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* MODAL: MEASUREMENT UNIT */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="max-w-sm rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
              <div className="bg-slate-900 p-8 text-white text-center">
                  <DialogTitle className="text-sm font-bold uppercase tracking-widest">Add Metric</DialogTitle>
              </div>
              <div className="p-8 space-y-6 bg-white">
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Name</Label><Input value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} className="h-12 border-slate-200 font-bold rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Abbr</Label><Input value={newUnit.abbreviation} onChange={e => setNewUnit({...newUnit, abbreviation: e.target.value})} className="h-12 border-slate-200 font-black text-xl rounded-2xl" /></div>
              </div>
              <DialogFooter className="bg-slate-50 p-6 border-t flex gap-3">
                  <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="font-bold text-slate-400 uppercase text-[10px]">Discard</Button>
                  <Button onClick={handleCreateUnit} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-2xl shadow-xl uppercase text-[10px] flex-1">Authorize Unit</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <footer className="flex flex-col md:flex-row items-center justify-between border-t border-slate-100 pt-10 pb-16 opacity-30">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Business Standard V4.9 • Material Integrity Node</span>
             </div>
             <div className="h-4 w-px bg-slate-200 hidden md:block" />
             <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Agri-Input Support Active</span>
          </div>
          <div className="flex items-center gap-3 mt-6 md:mt-0">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Link Active: {profile?.business_name}</span>
          </div>
      </footer>
    </div>
  );
}