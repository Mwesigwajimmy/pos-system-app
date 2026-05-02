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
  Ruler, Activity, DollarSign
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const supabase = createClient();

export default function RawMaterialPortal() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    name: '', sku: '', type: 'Solid', quality: 'Standard', 
    price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: ''
  });

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: '', abbreviation: '' });
  const [adjustData, setAdjustData] = useState({ variant_id: '', qty: 0, reason: 'Forensic' });

  const { data: profile } = useQuery({
    queryKey: ['business_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'USD';
  const businessName = profile?.business_name || 'Enterprise Registry';

  const { data: materials, isLoading } = useQuery({
    queryKey: ['raw_materials_ledger'],
    queryFn: async () => {
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

  const ledgerStats = useMemo(() => {
    if (!materials) return { totalValuation: 0, count: 0 };
    const totalValuation = materials.reduce((acc, m) => acc + (Number(m.current_stock) * Number(m.buying_price)), 0);
    return { totalValuation, count: materials.length };
  }, [materials]);

  const handleCreateUnit = async () => {
    if (!newUnit.name || !newUnit.abbreviation) return toast.error("Required fields missing.");
    try {
        const { data, error } = await supabase.from('units_of_measure').insert([{ 
            name: newUnit.name, 
            abbreviation: newUnit.abbreviation.toUpperCase() 
        }]).select().single();
        if (error) throw error;
        toast.success("Measurement protocol established.");
        setForm({ ...form, uom_id: data.id }); 
        setNewUnit({ name: '', abbreviation: '' });
        setIsUnitModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['uoms'] });
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Authorization failed: Missing mandatory fields.");
    setLoading(true);
    try {
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
      toast.success("Material synchronized to national registry.");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: '' });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const logShrinkage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: -Math.abs(adjustData.qty),
        p_reason: `Registry Correction: ${adjustData.reason}`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ledger discrepancy corrected.");
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  const downloadReport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
        const headers = "Description,Lot-ID,Volume,Rate,Valuation\n";
        const rows = materials?.map(m => `${m.product_name},${m.sku},${m.current_stock} ${m.unit},${m.buying_price},${m.current_stock * m.buying_price}`).join("\n");
        const totalLine = `\nTOTAL VALUATION,,,,${ledgerStats.totalValuation}`;
        const blob = new Blob([headers + rows + totalLine], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Registry_Audit_${Date.now()}.csv`;
        link.click();
        return;
    }
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text("INVENTORY VALUATION MANIFEST", 14, 22);
    doc.setFontSize(10);
    doc.text(`Entity: ${businessName} | Date: ${new Date().toLocaleDateString()} | Currency: ${businessCurrency}`, 14, 30);
    (doc as any).autoTable({
        startY: 40,
        head: [['Asset Description', 'Lot ID', 'Current Balance', 'Unit Rate', 'Ledger Valuation']],
        body: materials?.map(m => [
          m.product_name, 
          m.sku, 
          `${m.current_stock} ${m.unit}`, 
          m.buying_price.toLocaleString(), 
          (m.current_stock * m.buying_price).toLocaleString()
        ]),
        headStyles: { fillColor: [15, 23, 42] },
        foot: [[{ content: 'CUMULATIVE LEDGER VALUATION', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `${ledgerStats.totalValuation.toLocaleString()} ${businessCurrency}`, styles: { fontStyle: 'bold' } }]]
    });
    doc.save(`Valuation_Manifest_${Date.now()}.pdf`);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Authorization required to purge ${selectedItems.length} records. Proceed?`)) return;
    const { error } = await supabase.from('product_variants').delete().in('id', selectedItems);
    if (error) toast.error(error.message);
    else {
        toast.success("Nodes purged from registry.");
        setSelectedItems([]);
        queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-12 space-y-12 animate-in fade-in duration-700">
      
      <header className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-100 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em]">
            <Activity size={14} /> Inventory Governance
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-slate-950">Raw Material Registry</h1>
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest leading-none">{businessName}</p>
        </div>
        
        <div className="flex items-center gap-4">
           <Button onClick={() => downloadReport('EXCEL')} variant="ghost" className="h-12 px-6 font-bold text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-900 transition-all">
             <Download size={16} className="mr-2" /> Export CSV
           </Button>
           <Button onClick={() => downloadReport('PDF')} variant="outline" className="h-12 px-8 border-slate-200 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-sm">
             <FileText size={16} className="mr-2" /> Print Manifest
           </Button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto space-y-12 pb-24">
        
        <Card className="border-none shadow-[0_32px_64px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="px-12 py-10 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/20">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-blue-600">
                 <Database size={24} />
               </div>
               <CardTitle className="text-xl font-bold text-slate-900 uppercase tracking-tight">Material Enrollment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
              <div className="lg:col-span-2 space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Asset Identity</Label>
                <Input placeholder="Enter chemical or item name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-14 border-none bg-slate-50 rounded-[1.25rem] shadow-inner font-bold px-6 focus:ring-4 focus:ring-blue-500/5 transition-all" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Legacy SKU / Lot ID</Label>
                <Input placeholder="Registry Ref" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-14 border-none bg-slate-50 rounded-[1.25rem] shadow-inner font-mono text-sm px-6 uppercase" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Physical State</Label>
                <Select onValueChange={v => setForm({...form, type: v})} defaultValue="Solid">
                  <SelectTrigger className="h-14 border-none bg-slate-50 rounded-[1.25rem] shadow-inner font-bold px-6"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="Solid" className="font-bold py-3">Powder / Solid</SelectItem>
                    <SelectItem value="Liquid" className="font-bold py-3">Liquid / Fluid</SelectItem>
                    <SelectItem value="Gas" className="font-bold py-3">Compressed Gas</SelectItem>
                    <SelectItem value="Component" className="font-bold py-3">Discrete Part</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quality Classification</Label>
                <Select onValueChange={v => setForm({...form, quality: v})} defaultValue="Standard">
                  <SelectTrigger className="h-14 border-none bg-slate-50 rounded-[1.25rem] shadow-inner font-bold px-6"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="Pharmaceutical" className="font-bold py-3">Pharma Grade</SelectItem>
                    <SelectItem value="Food Grade" className="font-bold py-3">Nutritional Grade</SelectItem>
                    <SelectItem value="Industrial" className="font-bold py-3">Industrial Grade</SelectItem>
                    <SelectItem value="Organic" className="font-bold py-3">Premium Organic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Metric Standard</Label>
                <div className="flex gap-2">
                  <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
                    <SelectTrigger className="h-14 border-none bg-slate-50 rounded-[1.25rem] shadow-inner font-bold px-6 flex-1"><SelectValue placeholder="Metric" /></SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {uoms?.map(u => <SelectItem key={u.id} value={u.id} className="font-bold py-3">{u.abbreviation}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" onClick={() => setIsUnitModalOpen(true)} className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">
                    <Plus size={24} />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Acquisition Rate ({businessCurrency})</Label>
                <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="h-14 border-none bg-slate-50 rounded-[1.25rem] shadow-inner font-bold text-right px-6" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-1">Opening Stock Reserve</Label>
                <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="h-14 border-none bg-blue-50/50 rounded-[1.25rem] shadow-inner font-bold text-right text-blue-700 px-6" />
              </div>
              <div className="lg:col-span-3 space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Authorized Supply Chain Node</Label>
                <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                  <SelectTrigger className="h-14 border-none bg-slate-50 rounded-[1.25rem] shadow-inner font-bold px-8"><SelectValue placeholder="Select verified supply partner" /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {vendors?.map(v => <SelectItem key={v.id} value={v.id} className="font-bold py-4">{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleOnboard} disabled={loading} className="w-full h-14 bg-slate-950 hover:bg-black text-white font-bold rounded-[1.25rem] shadow-2xl transition-all uppercase tracking-[0.2em] text-[10px]">
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Authorize Enrollment"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          <Card className="lg:col-span-3 border-none shadow-sm bg-white overflow-hidden rounded-[2.5rem]">
            <CardHeader className="px-12 py-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold text-slate-950 tracking-tight">Inventory Ledger</CardTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Resource Nodes: {ledgerStats.count}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative w-full md:w-[350px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search registry..." 
                      onChange={e => setSearchTerm(e.target.value)} 
                      className="h-14 pl-12 border-none bg-slate-50/50 rounded-2xl shadow-inner font-bold text-sm focus:bg-white transition-all" 
                    />
                </div>
                {selectedItems.length > 0 && (
                  <Button onClick={handleBulkDelete} variant="destructive" className="h-14 px-8 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-red-200 transition-transform active:scale-95">
                    Purge Nodes
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full whitespace-nowrap">
                <Table>
                  <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                    <TableRow className="h-16">
                      <TableHead className="w-20 text-center border-r border-slate-100">
                        <Checkbox onCheckedChange={(c) => setSelectedItems(c ? materials?.map(m => m.variant_id) || [] : [])} />
                      </TableHead>
                      <TableHead className="px-10 font-bold uppercase text-slate-400 text-[10px] tracking-widest">Audit Status</TableHead>
                      <TableHead className="font-bold uppercase text-slate-400 text-[10px] tracking-widest">Material Identity</TableHead>
                      <TableHead className="text-right font-bold uppercase text-slate-400 text-[10px] tracking-widest">Unit Rate</TableHead>
                      <TableHead className="text-right font-bold uppercase text-slate-400 text-[10px] tracking-widest">Ledger Balance</TableHead>
                      <TableHead className="px-10 text-right font-bold uppercase text-slate-400 text-[10px] tracking-widest">Total Valuation</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={7} className="h-64 text-center opacity-30"><Loader2 className="h-10 w-10 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : materials?.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-64 text-center opacity-20 font-bold uppercase tracking-widest">Zero Registry Data</TableCell></TableRow>
                    ) : (
                      materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                        <TableRow key={m.variant_id} className="h-24 hover:bg-slate-50/30 transition-all border-b border-slate-50 group">
                          <TableCell className="text-center border-r border-slate-50">
                            <Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} />
                          </TableCell>
                          <TableCell className="px-10">
                             {m.current_stock > 100 ? (
                               <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[9px] uppercase px-4 py-1.5 rounded-full shadow-sm">Operational</Badge>
                             ) : m.current_stock > 0 ? (
                               <Badge className="bg-amber-50 text-amber-600 border-none font-bold text-[9px] uppercase px-4 py-1.5 rounded-full shadow-sm">Low Reserve</Badge>
                             ) : (
                               <Badge className="bg-rose-50 text-rose-600 border-none font-bold text-[9px] uppercase px-4 py-1.5 rounded-full shadow-sm">Exhausted</Badge>
                             )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm tracking-tight">{m.product_name}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lot: {m.sku} — {m.quality_grade}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-slate-900 text-sm tabular-nums">{m.buying_price.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 ml-1 font-bold">{businessCurrency}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className={`text-base font-bold tabular-nums ${m.current_stock < 50 ? 'text-rose-500' : 'text-slate-900'}`}>{m.current_stock?.toLocaleString()}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.unit}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-10 text-right font-black text-slate-950 text-sm tabular-nums">
                            {(m.current_stock * m.buying_price).toLocaleString()}
                          </TableCell>
                          <TableCell className="pr-10 text-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="h-12 w-12 text-slate-200 hover:text-slate-950 rounded-2xl transition-all">
                                  <BadgeAlert size={22} />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
                                <div className="bg-slate-950 px-10 py-8 text-white">
                                  <DialogTitle className="text-xl font-bold uppercase tracking-widest">Ledger Correction</DialogTitle>
                                  <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Handshake Node: {m.product_name}</DialogDescription>
                                </div>
                                <div className="p-10 space-y-12">
                                  <div className="space-y-4">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-center block">Authorized Deduction Quantity</Label>
                                    <div className="relative">
                                      <Input type="number" className="h-28 border-none bg-slate-50 font-black text-7xl text-center rounded-[2rem] shadow-inner text-slate-950" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                      <span className="absolute right-10 top-1/2 -translate-y-1/2 font-black text-slate-200 uppercase text-xs tracking-widest">{m.unit}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Regulatory Context</Label>
                                    <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                      <SelectTrigger className="h-14 border-none bg-slate-50 font-bold rounded-2xl shadow-inner px-8 text-sm outline-none"><SelectValue placeholder="Reason for correction" /></SelectTrigger>
                                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="Waste" className="font-bold py-3 px-6">Production Scrap</SelectItem>
                                        <SelectItem value="Expired" className="font-bold py-3 px-6">Metric Expiry</SelectItem>
                                        <SelectItem value="Damage" className="font-bold py-3 px-6">Damaged in Logistics</SelectItem>
                                        <SelectItem value="Forensic" className="font-bold py-3 px-6">Forensic Audit Correction</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter className="p-10 bg-slate-50/50 border-t border-slate-100">
                                  <Button onClick={() => logShrinkage.mutate()} className="w-full h-16 bg-slate-950 hover:bg-black text-white font-bold rounded-[1.5rem] shadow-2xl uppercase tracking-[0.2em] text-[10px] transition-all active:scale-[0.98]">
                                    Commit Correction
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
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.5rem] bg-slate-900 text-white p-10 space-y-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><DollarSign size={120} /></div>
             <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Cumulative Asset Value</p>
                <h4 className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">
                  {ledgerStats.totalValuation.toLocaleString()}
                </h4>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{businessCurrency} Consolidated</p>
             </div>
             <div className="pt-8 border-t border-white/10 space-y-6">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                   <span>Inventory Depth</span>
                   <span className="text-white">{ledgerStats.count} Nodes</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                   <span>Registry Cycle</span>
                   <span className="text-white">Active</span>
                </div>
             </div>
             <Button onClick={() => downloadReport('PDF')} className="w-full h-16 bg-white hover:bg-slate-100 text-slate-950 font-bold uppercase tracking-[0.2em] text-[10px] rounded-[1.25rem] shadow-2xl transition-all">
                Registry Manifest
             </Button>
          </Card>
        </div>
      </div>

      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
              <div className="bg-slate-950 px-10 py-8 text-white">
                  <DialogTitle className="text-xl font-bold uppercase tracking-widest">Global Metric Standard</DialogTitle>
              </div>
              <div className="p-10 space-y-8">
                  <div className="space-y-3">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Official Designation</Label>
                      <Input placeholder="e.g. Metric Tonne" value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} className="h-14 border-none bg-slate-50 rounded-2xl shadow-inner px-6 font-bold" />
                  </div>
                  <div className="space-y-3">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Registry Symbol</Label>
                      <Input placeholder="e.g. MT" value={newUnit.abbreviation} onChange={e => setNewUnit({...newUnit, abbreviation: e.target.value})} className="h-14 border-none bg-slate-50 rounded-2xl shadow-inner px-6 text-center font-black uppercase text-xl" />
                  </div>
              </div>
              <DialogFooter className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                  <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-12 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Discard</Button>
                  <Button onClick={handleCreateUnit} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 rounded-2xl shadow-xl shadow-blue-200 uppercase tracking-widest text-[10px] flex-1">Establish Protocol</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <footer className="max-w-[1600px] mx-auto mt-24 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 pt-12 pb-20 opacity-30">
          <div className="flex items-center gap-8">
             <div className="flex items-center gap-3">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Ledger Standard v2.6.4</span>
             </div>
             <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Autonomous Data Environment</span>
          </div>
          <div className="flex items-center gap-4 bg-white border border-slate-100 px-6 py-2.5 rounded-full shadow-sm">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nodes Synchronized</span>
          </div>
      </footer>
    </div>
  );
}