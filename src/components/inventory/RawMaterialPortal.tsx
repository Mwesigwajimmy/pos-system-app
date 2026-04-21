'use client';

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FlaskConical, ShieldCheck, Truck, Scale, BadgeAlert, 
  Trash2, Search, History, FileDown, 
  AlertTriangle, CheckCircle2, Loader2, Database, 
  Table as TableIcon, Layers, FileText, X, Globe,
  ArrowDownToLine, Filter, Settings, Calculator, Plus, Download,
  Ruler
} from "lucide-react";
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// --- UI COMPONENTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const supabase = createClient();

export default function RawMaterialPortal() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Enterprise Onboarding Form
  const [form, setForm] = useState({
    name: '', sku: '', type: 'Solid', quality: 'Standard', 
    price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: ''
  });

  // Custom Unit State
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: '', abbreviation: '' });

  // Forensic Adjustment State
  const [adjustData, setAdjustData] = useState({ variant_id: '', qty: 0, reason: 'Expired' });

  // --- 1. SYSTEM IDENTITY & CURRENCY DATA ---
  const { data: profile } = useQuery({
    queryKey: ['business_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Forensic Audit Fix: Fetching 'currency' from profiles and limiting to 1 to bypass trigger duplicates
      const { data } = await supabase.from('profiles').select('*, business_name, currency').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';
  const businessName = profile?.business_name || 'Enterprise Manager';

  // --- 2. CORE DATA QUERIES ---
  const { data: materials, isLoading } = useQuery({
    queryKey: ['raw_materials_ledger'],
    queryFn: async () => {
      // The repaired View now contains business_id for full security isolation
      const { data, error } = await supabase.from('raw_material_registry').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: uoms } = useQuery({
    queryKey: ['uoms'],
    queryFn: async () => {
      const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation').order('name');
      return data || [];
    }
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors_raw'],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('id, name');
      return data || [];
    }
  });

  // --- 3. LOGIC HANDLERS ---

  // Handler: Create New Unit of Measure (Enterprise Grade)
  const handleCreateUnit = async () => {
    if (!newUnit.name || !newUnit.abbreviation) return toast.error("Required fields missing for industrial unit.");
    try {
        const { data, error } = await supabase.from('units_of_measure').insert([{ 
            name: newUnit.name, 
            abbreviation: newUnit.abbreviation.toUpperCase() 
        }]).select().single();
        if (error) throw error;
        toast.success(`Unit ${data.name} established.`);
        setForm({ ...form, uom_id: data.id }); // Using the UUID string directly
        setNewUnit({ name: '', abbreviation: '' });
        setIsUnitModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['uoms'] });
    } catch (e: any) {
        toast.error(`Industrial Metric Error: ${e.message}`);
    }
  };

  // Handler: Fully Integrated Onboarding
  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Material Identity and Unit of Measure are mandatory.");
    setLoading(true);
    try {
      // THE FINAL WELD: Calling the renamed function to avoid PGRST203 ambiguity
      const { error } = await supabase.rpc('fn_industrial_material_onboard_v1', {
        p_name: form.name,
        p_sku: form.sku,
        p_type: form.type,
        p_quality: form.quality,
        p_price: form.price,
        p_initial_qty: form.qty,
        p_uom_id: form.uom_id, 
        p_vendor_id: form.supplier_id || null,
        p_currency: businessCurrency
      });

      if (error) throw error;

      toast.success("Industrial asset successfully registered and valued in Ledger.");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: '' });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(`Enterprise Sync Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logShrinkage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: -Math.abs(adjustData.qty),
        p_reason: `Sovereign Adjustment: ${adjustData.reason}`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Industrial balance corrected in Ledger.");
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  const downloadForensicReport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
        const headers = "Identity,SKU,Type,Quality,Stock,Unit,UnitValue,TotalValue\n";
        const rows = materials?.map(m => `${m.product_name},${m.sku},${m.material_type},${m.quality_grade},${m.current_stock},${m.unit},${m.buying_price},${m.current_stock * m.buying_price}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Inventory_Forensics_${new Date().toISOString()}.csv`;
        link.click();
        return;
    }

    const doc = new jsPDF();
    (doc as any).autoTable({
        startY: 20,
        head: [['Material', 'SKU/Batch', 'Stock', 'Unit Value', 'Total Valuation']],
        body: materials?.map(m => [m.product_name, m.sku, `${m.current_stock} ${m.unit}`, `${m.buying_price} ${businessCurrency}`, `${(m.current_stock * m.buying_price).toLocaleString()} ${businessCurrency}`]),
    });
    doc.save(`Forensic_Valuation_Audit.pdf`);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Confirm removal of ${selectedItems.length} industrial records? Ledger impact will be permanent.`)) return;
    const { error } = await supabase.from('product_variants').delete().in('id', selectedItems);
    if (error) toast.error(error.message);
    else {
        toast.success("Registry records removed.");
        setSelectedItems([]);
        queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-900">
      
      {/* PAGE HEADER */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Raw Materials Ledger</h1>
          <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest">{businessName} • Industrial Protocol v10.5</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => downloadForensicReport('EXCEL')} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => downloadForensicReport('PDF')} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold">
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* MATERIAL ONBOARDING FORM */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <div className="flex items-center gap-2">
               <Plus className="h-5 w-5 text-blue-600" />
               <CardTitle className="text-lg font-bold uppercase tracking-tight">Onboard Production Asset</CardTitle>
            </div>
            <CardDescription className="font-medium text-slate-400">Initialize industrial material tracking for high-purity production cycles.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-2 space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Material / Chemical Name</Label>
                <Input placeholder="e.g. Purified Chemical Solvent" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-11 border-slate-200 focus:ring-blue-500 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SKU / Lot Identity</Label>
                <Input placeholder="Auto-generated if empty" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-11 border-slate-200 font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Physical State</Label>
                <Select onValueChange={v => setForm({...form, type: v})} defaultValue="Solid">
                  <SelectTrigger className="h-11 border-slate-200 font-bold"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solid">Solid / Powder</SelectItem>
                    <SelectItem value="Liquid">Liquid / Fluid</SelectItem>
                    <SelectItem value="Gas">Compressed Gas</SelectItem>
                    <SelectItem value="Component">Raw Assembly Part</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Purity / Grade</Label>
                <Select onValueChange={v => setForm({...form, quality: v})} defaultValue="Standard">
                  <SelectTrigger className="h-11 border-slate-200 font-bold"><SelectValue placeholder="Quality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pharmaceutical">Pharmaceutical (High Purity)</SelectItem>
                    <SelectItem value="Food Grade">Food Safe (FDA/WHO)</SelectItem>
                    <SelectItem value="Industrial">Standard Industrial</SelectItem>
                    <SelectItem value="Organic">Organic / Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DYNAMIC UNIT SELECTOR - FIXED OVERLAP */}
              <div className="space-y-2">
                <div className="flex flex-wrap justify-between items-end gap-1 mb-0.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unit of Measure</Label>
                    <button onClick={() => setIsUnitModalOpen(true)} className="text-[9px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase transition-colors shrink-0">
                        <Plus size={10} /> ADD NEW UNIT
                    </button>
                </div>
                <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
                  <SelectTrigger className="h-11 border-slate-200 font-bold"><SelectValue placeholder="Select Metric" /></SelectTrigger>
                  <SelectContent>
                    {uoms?.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Landed Cost ({businessCurrency})</Label>
                <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="h-11 border-slate-200 text-right font-black" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-blue-600">Initial Physical Stock</Label>
                <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="h-11 border-slate-200 text-right font-black text-blue-600 bg-blue-50/20" />
              </div>
              <div className="lg:col-span-3 space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Origin Supplier</Label>
                <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                  <SelectTrigger className="border-slate-200 font-bold h-11"><SelectValue placeholder="Link a Vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleOnboard} disabled={loading} className="w-full bg-slate-900 hover:bg-blue-700 text-white font-black h-11 shadow-xl rounded-2xl transition-all uppercase tracking-widest text-xs">
                  {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Database className="mr-2 h-4 w-4"/>} 
                  Commit Material
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CUSTOM UNIT MODAL */}
        <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
            <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-slate-900 p-8 text-white">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                        <Scale className="text-blue-400" /> Unit Definition
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs mt-2 leading-relaxed">
                        Create an industrial measurement standard for your production inventory.
                    </DialogDescription>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unit Name</Label>
                        <Input placeholder="e.g. Kilogram" value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} className="h-12 border-slate-200 focus:ring-blue-500 font-bold" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Industrial Abbreviation</Label>
                        <Input placeholder="e.g. KG" value={newUnit.abbreviation} onChange={e => setNewUnit({...newUnit, abbreviation: e.target.value})} className="h-12 border-slate-200 font-black text-xl" />
                    </div>
                </div>
                <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 flex gap-3">
                    <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="font-bold text-slate-400">Cancel</Button>
                    <Button onClick={handleCreateUnit} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-xl shadow-lg shadow-blue-600/20 uppercase tracking-widest text-xs">Save Unit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* LEDGER & VALUATION TABLE */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-[2.5rem]">
          <CardHeader className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Perpetual Valuation Ledger</CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400">Forensic audit of material stock levels and automated Balance Sheet integration.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search industrial lot..." 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-10 h-11 w-full md:w-80 border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold" 
                  />
               </div>
               {selectedItems.length > 0 && (
                 <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-11 px-6 font-black shadow-lg rounded-xl uppercase text-[10px] tracking-widest">
                   <Trash2 className="mr-2 h-4 w-4" /> Purge ({selectedItems.length})
                 </Button>
               )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-none">
                    <TableHead className="w-16 text-center border-r border-slate-100">
                      <Checkbox onCheckedChange={(c) => setSelectedItems(c ? materials?.map(m => m.variant_id) || [] : [])} />
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 px-8 tracking-widest">Batch Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 tracking-widest">Molecular Identity / SKU</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 text-right tracking-widest">Acquisition Cost</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 text-right tracking-widest">Physical Balance</TableHead>
                    <TableHead className="text-center pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-60 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                          <span className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Syncing Forensic Data...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : materials?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-slate-300 font-bold italic uppercase text-xs tracking-widest">No material data found in this sector.</TableCell>
                    </TableRow>
                  ) : (
                    materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                      <TableRow key={m.variant_id} className="hover:bg-slate-50/50 transition-all border-b border-slate-100 h-24 group">
                        <TableCell className="text-center border-r border-slate-100">
                          <Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} />
                        </TableCell>
                        <TableCell className="px-8">
                           {m.current_stock > 100 ? (
                             <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 shadow-none px-3 py-1 font-black text-[9px] uppercase tracking-wider">Operational</Badge>
                           ) : m.current_stock > 0 ? (
                             <Badge className="bg-orange-50 text-orange-700 border-orange-100 shadow-none px-3 py-1 font-black text-[9px] uppercase tracking-wider">Low Stock</Badge>
                           ) : (
                             <Badge className="bg-red-50 text-red-700 border-red-100 shadow-none px-3 py-1 font-black text-[9px] uppercase tracking-wider animate-pulse">Depleted</Badge>
                           )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-sm tracking-tight">{m.product_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-2 uppercase tracking-tighter">
                                <ShieldCheck size={10} className="text-blue-500" /> {m.sku} • {m.quality_grade} grade
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-700 text-sm">
                          {m.buying_price.toLocaleString()} <span className="text-[9px] text-slate-400 ml-1 font-bold">{businessCurrency}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-xl font-black tracking-tighter ${m.current_stock < 5 ? 'text-red-600' : 'text-slate-900'}`}>{m.current_stock?.toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center pr-8">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="text-slate-200 hover:text-orange-600 hover:bg-orange-50 h-10 w-10 p-0 rounded-2xl group-hover:text-slate-400 transition-all">
                                <BadgeAlert className="h-6 w-6" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[450px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden">
                              <DialogHeader className="bg-orange-500 p-8 text-white">
                                <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
                                  <AlertTriangle className="h-8 w-8" /> Stock Write-Off
                                </DialogTitle>
                                <DialogDescription className="text-orange-100 text-xs font-medium leading-relaxed mt-2">Deduct industrial waste for <span className="font-black text-white underline">{m.product_name}</span> from the Balance Sheet.</DialogDescription>
                              </DialogHeader>
                              <div className="p-8 space-y-8">
                                <div className="space-y-3">
                                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volume to Remove</Label>
                                  <div className="relative">
                                    <Input type="number" placeholder="0.00" className="h-20 border-slate-100 bg-slate-50 font-black text-4xl text-center focus:ring-orange-500 rounded-3xl" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{m.unit}</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Industrial Logic</Label>
                                  <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                    <SelectTrigger className="h-12 border-slate-200 font-bold rounded-xl"><SelectValue placeholder="Select forensic logic" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Waste">Production Waste / Scrap</SelectItem>
                                      <SelectItem value="Expired">Material Expiry</SelectItem>
                                      <SelectItem value="Damage">Accidental Spillage</SelectItem>
                                      <SelectItem value="Forensic">Audit Discrepancy</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
                                <Button onClick={() => logShrinkage.mutate()} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-14 rounded-2xl shadow-xl shadow-orange-600/20 uppercase tracking-[0.2em] text-xs">
                                  Confirm Ledger Burn
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SYSTEM STATUS FOOTER */}
      <footer className="max-w-7xl mx-auto mt-16 flex items-center justify-between border-t border-slate-100 pt-8 pb-10">
          <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Infrastructure Node</p>
             <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[9px] font-black bg-white border-slate-200">{businessCurrency} REPORTING</Badge>
                <Badge variant="outline" className="text-[9px] font-black bg-white border-slate-200 uppercase tracking-tighter">BigInt / UUID: SYNCED</Badge>
             </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                Ledger Sync: High Integrity
             </span>
          </div>
      </footer>
    </div>
  );
}