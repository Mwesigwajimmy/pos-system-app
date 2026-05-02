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
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER SECTION WITH INTEGRATED STATS */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-[11px] uppercase tracking-wider">
              <Activity size={14} /> Inventory Governance
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">Raw Material Registry</h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{businessName}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-6 pr-6 border-r border-slate-100">
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Global Assets</p>
                <p className="text-lg font-bold text-slate-900">{ledgerStats.count} <span className="text-[10px] text-slate-400">Nodes</span></p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registry Value</p>
                <p className="text-lg font-bold text-blue-600 tabular-nums">{ledgerStats.totalValuation.toLocaleString()} <span className="text-[10px] uppercase">{businessCurrency}</span></p>
              </div>
            </div>

            <div className="flex items-center gap-2">
               <Button onClick={() => downloadReport('EXCEL')} variant="outline" size="sm" className="h-9 px-4 font-bold text-slate-600 uppercase text-[10px] tracking-widest hover:bg-slate-50">
                 <Download size={14} className="mr-2" /> CSV
               </Button>
               <Button onClick={() => downloadReport('PDF')} variant="outline" size="sm" className="h-9 px-4 border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm">
                 <FileText size={14} className="mr-2" /> Manifest
               </Button>
            </div>
          </div>
        </header>

        {/* MATERIAL ENROLLMENT FORM */}
        <Card className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardHeader className="px-6 py-5 border-b border-slate-50 bg-slate-50/20">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-blue-600">
                 <Database size={18} />
               </div>
               <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">Material Enrollment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Asset Identity</Label>
                <Input placeholder="Material name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-10 border-slate-200 bg-white rounded-lg font-medium px-4 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">SKU / Lot ID</Label>
                <Input placeholder="Registry Ref" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-10 border-slate-200 bg-white rounded-lg font-mono text-xs px-4 uppercase" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Physical State</Label>
                <Select onValueChange={v => setForm({...form, type: v})} defaultValue="Solid">
                  <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-medium px-4"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solid" className="py-2 text-sm">Solid / Powder</SelectItem>
                    <SelectItem value="Liquid" className="py-2 text-sm">Liquid / Fluid</SelectItem>
                    <SelectItem value="Gas" className="py-2 text-sm">Compressed Gas</SelectItem>
                    <SelectItem value="Component" className="py-2 text-sm">Discrete Part</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Quality Class</Label>
                <Select onValueChange={v => setForm({...form, quality: v})} defaultValue="Standard">
                  <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-medium px-4"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pharmaceutical" className="py-2 text-sm">Pharmaceutical Grade</SelectItem>
                    <SelectItem value="Food Grade" className="py-2 text-sm">Food Grade</SelectItem>
                    <SelectItem value="Industrial" className="py-2 text-sm">Industrial Grade</SelectItem>
                    <SelectItem value="Organic" className="py-2 text-sm">Organic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Measurement</Label>
                <div className="flex gap-2">
                  <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
                    <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-medium px-4 flex-1"><SelectValue placeholder="Metric" /></SelectTrigger>
                    <SelectContent>
                      {uoms?.map(u => <SelectItem key={u.id} value={u.id} className="py-2 text-sm">{u.abbreviation}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setIsUnitModalOpen(true)} className="h-10 w-10 rounded-lg text-slate-600 border-slate-200 hover:bg-slate-50">
                    <Plus size={18} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Rate ({businessCurrency})</Label>
                <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="h-10 border-slate-200 bg-white rounded-lg font-medium text-right px-4" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">Opening Reserve</Label>
                <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="h-10 border border-blue-100 bg-blue-50/30 rounded-lg font-bold text-right text-blue-700 px-4" />
              </div>
              <div className="lg:col-span-3 space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Verified Supply Partner</Label>
                <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                  <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg font-medium px-4"><SelectValue placeholder="Select Supply Partner" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => <SelectItem key={v.id} value={v.id} className="py-2 text-sm">{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleOnboard} disabled={loading} className="w-full h-10 bg-slate-900 hover:bg-black text-white font-bold rounded-lg shadow-md transition-all uppercase tracking-widest text-[10px]">
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Authorize Enrollment"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FULL WIDTH INVENTORY LEDGER */}
        <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden rounded-xl">
          <CardHeader className="px-6 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/10">
            <div className="space-y-0.5">
              <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Registry Ledger</CardTitle>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time balancing protocol</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-full md:w-[350px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input 
                    placeholder="Filter by material name or SKU..." 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="h-10 pl-10 border-slate-200 bg-white rounded-lg font-medium text-xs focus:ring-1 focus:ring-blue-500" 
                  />
              </div>
              {selectedItems.length > 0 && (
                <Button onClick={handleBulkDelete} variant="destructive" className="h-10 px-4 rounded-lg font-bold uppercase text-[9px] tracking-widest shadow-sm">
                  Purge Selection
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-12">
                    <TableHead className="w-16 text-center border-r border-slate-100">
                      <Checkbox onCheckedChange={(c) => setSelectedItems(c ? materials?.map(m => m.variant_id) || [] : [])} />
                    </TableHead>
                    <TableHead className="px-6 font-bold uppercase text-slate-500 text-[10px] tracking-wider">Status</TableHead>
                    <TableHead className="font-bold uppercase text-slate-500 text-[10px] tracking-wider">Material / Identity</TableHead>
                    <TableHead className="text-right font-bold uppercase text-slate-500 text-[10px] tracking-wider">Rate</TableHead>
                    <TableHead className="text-right font-bold uppercase text-slate-500 text-[10px] tracking-wider">Balance</TableHead>
                    <TableHead className="px-6 text-right font-bold uppercase text-slate-500 text-[10px] tracking-wider">Valuation</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-200" /></TableCell></TableRow>
                  ) : materials?.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-48 text-center font-bold uppercase tracking-widest text-slate-300 text-[10px]">No registry nodes found</TableCell></TableRow>
                  ) : (
                    materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                      <TableRow key={m.variant_id} className="h-16 hover:bg-slate-50/50 transition-all border-b last:border-none group">
                        <TableCell className="text-center border-r border-slate-50">
                          <Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} />
                        </TableCell>
                        <TableCell className="px-6">
                           {m.current_stock > 100 ? (
                             <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[8px] uppercase px-3 py-1 rounded-full">Operational</Badge>
                           ) : m.current_stock > 0 ? (
                             <Badge className="bg-amber-50 text-amber-600 border-none font-bold text-[8px] uppercase px-3 py-1 rounded-full">Low</Badge>
                           ) : (
                             <Badge className="bg-rose-50 text-rose-600 border-none font-bold text-[8px] uppercase px-3 py-1 rounded-full">Critical</Badge>
                           )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm tracking-tight">{m.product_name}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{m.sku} — {m.quality_grade}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-slate-800 text-xs tabular-nums">{m.buying_price.toLocaleString()}</span>
                          <span className="text-[9px] text-slate-400 ml-1 font-bold">{businessCurrency}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-sm font-bold tabular-nums ${m.current_stock < 50 ? 'text-rose-500' : 'text-slate-900'}`}>{m.current_stock?.toLocaleString()}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{m.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-right font-bold text-slate-900 text-xs tabular-nums">
                          {(m.current_stock * m.buying_price).toLocaleString()}
                        </TableCell>
                        <TableCell className="pr-6 text-center">
                          <Dialog>
                            <DialogTrigger asChild>
                              <button onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="h-8 w-8 text-slate-300 hover:text-slate-950 rounded-lg flex items-center justify-center transition-all">
                                <BadgeAlert size={18} />
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden border-none shadow-2xl bg-white">
                              <div className="bg-slate-900 px-8 py-6 text-white">
                                <DialogTitle className="text-sm font-bold uppercase tracking-widest">Registry Correction</DialogTitle>
                                <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{m.product_name}</DialogDescription>
                              </div>
                              <div className="p-8 space-y-8">
                                <div className="space-y-4">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">Quantity to Deduct</Label>
                                  <div className="relative">
                                    <Input type="number" className="h-16 border-slate-100 bg-slate-50 font-black text-3xl text-center rounded-xl shadow-inner text-slate-900" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-300 uppercase text-[10px] tracking-widest">{m.unit}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Adjustment Logic</Label>
                                  <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                    <SelectTrigger className="h-10 border-slate-200 bg-white font-medium rounded-lg px-4 text-xs"><SelectValue placeholder="Select Reason" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Waste" className="text-sm py-2">Production Waste</SelectItem>
                                      <SelectItem value="Expired" className="text-sm py-2">Expiry / Obsolescence</SelectItem>
                                      <SelectItem value="Damage" className="text-sm py-2">Logistical Damage</SelectItem>
                                      <SelectItem value="Forensic" className="text-sm py-2">Audit Reconciliation</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter className="p-8 bg-slate-50 border-t flex flex-col gap-3">
                                <Button onClick={() => logShrinkage.mutate()} className="w-full h-11 bg-slate-900 hover:bg-black text-white font-bold rounded-lg shadow-md uppercase tracking-widest text-[10px]">
                                  Commit Adjustment
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
      </div>

      {/* UNIT DIALOG */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden border-none shadow-2xl bg-white">
              <div className="bg-slate-950 px-8 py-6 text-white">
                  <DialogTitle className="text-xs font-bold uppercase tracking-widest">Metric Definition</DialogTitle>
              </div>
              <div className="p-8 space-y-6">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Unit Name</Label>
                      <Input placeholder="e.g. Kilogram" value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} className="h-10 border-slate-200 bg-white rounded-lg px-4 font-medium text-sm" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Symbol</Label>
                      <Input placeholder="KG" value={newUnit.abbreviation} onChange={e => setNewUnit({...newUnit, abbreviation: e.target.value})} className="h-10 border-slate-200 bg-white rounded-lg px-4 text-center font-bold uppercase text-sm" />
                  </div>
              </div>
              <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex gap-3">
                  <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-10 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Discard</Button>
                  <Button onClick={handleCreateUnit} className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-lg shadow-md uppercase tracking-widest text-[10px] flex-1">Authorize</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <footer className="max-w-[1400px] mx-auto mt-12 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 pt-8 pb-12 opacity-40">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <ShieldCheck size={14} />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Ledger Standard v2.6.4</span>
             </div>
             <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Enterprise Environment</span>
          </div>
          <div className="flex items-center gap-3 bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm mt-4 md:mt-0">
             <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Network Synchronized</span>
          </div>
      </footer>
    </div>
  );
}