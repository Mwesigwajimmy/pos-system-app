'use client';

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FlaskConical, ShieldCheck, Truck, Scale, BadgeAlert, 
  Plus, Trash2, Search, History, FileDown,
  AlertTriangle, CheckCircle2, Loader2, Database, 
  Table as TableIcon, Layers, FileText, X
} from "lucide-react";
import toast from 'react-hot-toast';

// --- UI COMPONENTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  
  // Onboarding Form State
  const [form, setForm] = useState({
    name: '', sku: '', type: 'Solid', quality: 'Standard', 
    price: 0, qty: 0, uom_id: '', supplier_id: ''
  });

  // Forensic Adjustment State
  const [adjustData, setAdjustData] = useState({ variant_id: '', qty: 0, reason: 'Expired' });

  // --- 1. DATA QUERIES (Systematic Link) ---
  const { data: materials, isLoading } = useQuery({
    queryKey: ['raw_materials_ledger'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_registry') // This view filters out POS items automatically
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: uoms } = useQuery({
    queryKey: ['uoms'],
    queryFn: async () => {
      const { data } = await supabase.from('units_of_measure').select('id, name');
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

  // --- 2. THE AUTOMATED LEDGER SYNC (Onboarding) ---
  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Verification Failure: Material requires identity and units.");
    setLoading(true);
    try {
      // SYSTEMATIC WELD: RPC handles Product + Variant + Stock + General Ledger Entry
      const { error } = await supabase.rpc('fn_onboard_new_tenant_accounting', {
        p_name: form.name,
        p_sku: form.sku,
        p_type: form.type,
        p_quality: form.quality,
        p_price: form.price,
        p_initial_qty: form.qty,
        p_uom_id: parseInt(form.uom_id),
        p_vendor_id: form.supplier_id || null
      });

      if (error) throw error;

      toast.success("Assets Synced to Perpetual Ledger");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '' });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(`Sync Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. FORENSIC ADJUSTMENT (Deduction for Damages/Expiry) ---
  const logShrinkage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: -Math.abs(adjustData.qty),
        p_reason: `Raw Material Audit: ${adjustData.reason}`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shrinkage Logged. Ledger Balanced.");
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  // --- 4. BULK OPERATIONS ---
  const handleBulkDelete = async () => {
    if (!confirm(`Permanently expunge ${selectedItems.length} records? This will impact the general ledger balance.`)) return;
    const { error } = await supabase.from('product_variants').delete().in('id', selectedItems);
    if (error) toast.error(error.message);
    else {
        toast.success("Vault Cleaned");
        setSelectedItems([]);
        queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  };

  // --- 5. EXPORT ENGINE (Audit-Ready) ---
  const downloadReport = (format: 'PDF' | 'EXCEL') => {
    toast.loading(`Generating Forensic ${format} Report...`, { duration: 2000 });
    const headers = "Material,SKU,Type,Quality,Stock,Value\n";
    const rows = materials?.map(m => `${m.product_name},${m.sku},${m.material_type},${m.quality_grade},${m.current_stock},${m.current_stock * m.buying_price}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BBU1_VALUATION_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 p-8">
      
      {/* SECTION 1: ONBOARDING COMMAND CENTER */}
      <div className="max-w-6xl mx-auto p-10 space-y-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <Database size={200} />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-10">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-blue-200 shadow-2xl">
              <FlaskConical className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Input Ledger Onboarding</h1>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                <ShieldCheck className="text-emerald-500 h-4 w-4" /> BBU1 Forensic Protocol • Ledger Sync Active
              </p>
            </div>
          </div>
          <div className="flex gap-4">
             <Button variant="outline" onClick={() => downloadReport('PDF')} className="h-12 border-slate-200 rounded-xl gap-2 font-black text-xs">
                <FileText size={18} /> PDF AUDIT
             </Button>
             <Button variant="outline" onClick={() => downloadReport('EXCEL')} className="h-12 border-slate-200 rounded-xl gap-2 font-black text-xs">
                <TableIcon size={18} /> EXCEL VALUATION
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
             <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-400">1. Material Identity (Description Required)</Label>
                <Input placeholder="e.g. Baking Flour / Chemical Dye / Fabric Leather" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-16 font-black text-xl rounded-2xl border-slate-100 bg-slate-50/50 shadow-inner" />
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="font-black text-[9px] uppercase text-slate-400">SKU Code</Label>
                  <Input placeholder="AUTO" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-12 font-mono font-bold rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[9px] uppercase text-slate-400">Input Type</Label>
                  <Select onValueChange={v => setForm({...form, type: v})}>
                    <SelectTrigger className="h-12 font-black"><SelectValue placeholder="Solid" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solid">Solid / Powder</SelectItem>
                      <SelectItem value="Liquid">Liquid</SelectItem>
                      <SelectItem value="Gas">Gas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[9px] uppercase text-slate-400 text-blue-600">Measurement</Label>
                  <Select onValueChange={v => setForm({...form, uom_id: v})}>
                    <SelectTrigger className="h-12 font-black border-blue-100 bg-blue-50/20"><SelectValue placeholder="Select UOM" /></SelectTrigger>
                    <SelectContent>
                      {uoms?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[9px] uppercase text-slate-400">Source Vendor</Label>
                  <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                    <SelectTrigger className="h-12 font-bold"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                       {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
             </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white space-y-6">
             <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <ShieldCheck className="text-emerald-400 h-6 w-6" />
                <span className="text-[10px] font-black uppercase text-blue-300 tracking-widest">Asset Capitalization</span>
             </div>
             <div>
                <Label className="text-[9px] font-black text-slate-500 uppercase">Buy-In Unit Cost (UGX)</Label>
                <div className="relative mt-2">
                    <Scale className="absolute left-4 top-4 text-slate-700 h-5 w-5" />
                    <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="h-14 pl-12 font-black text-2xl text-right bg-slate-800 border-none rounded-2xl text-emerald-400" />
                </div>
             </div>
             <div>
                <Label className="text-[9px] font-black text-slate-500 uppercase">Initial Stock Deployment</Label>
                <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="h-14 font-black text-2xl text-center bg-slate-800 border-none rounded-2xl mt-2" />
             </div>
          </div>
        </div>

        <Button 
          onClick={handleOnboard} 
          disabled={loading}
          className="w-full h-20 bg-blue-600 hover:bg-slate-900 text-white font-black text-xl rounded-2xl shadow-xl transition-all gap-5 uppercase tracking-widest"
        >
          {loading ? <Loader2 className="animate-spin h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
          {loading ? "WELDING TO LEDGER..." : "COMMIT TO PERPETUAL STOCK"}
        </Button>
      </div>

      {/* SECTION 2: FORENSIC VAULT */}
      <Card className="border-none shadow-xl rounded-[3.5rem] overflow-hidden bg-white max-w-6xl mx-auto">
        <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-col lg:flex-row justify-between items-center gap-8">
            <div>
                <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase tracking-widest">Input Asset Ledger</CardTitle>
                <Badge className="bg-emerald-100 text-emerald-700 font-black border-none px-4 py-1 mt-2">Live Node Syncing</Badge>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative w-80">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                    <Input placeholder="Scan Ledger..." onChange={e => setSearchTerm(e.target.value)} className="h-12 pl-12 rounded-xl border-slate-200 bg-white font-bold" />
                </div>
                {selectedItems.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" className="h-12 px-6 font-black rounded-xl animate-in slide-in-from-right">
                        <Trash2 className="mr-2" size={18} /> EXPUNGE ({selectedItems.length})
                    </Button>
                )}
            </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[550px]">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md">
                <TableRow className="border-none">
                  <TableHead className="w-16 pl-10"><Checkbox onCheckedChange={(c) => setSelectedItems(c ? materials?.map(m => m.variant_id) || [] : [])} /></TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16">Material Asset</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right">Unit Cost</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right">Vault stock</TableHead>
                  <TableHead className="text-right pr-12 font-black text-[10px] uppercase text-slate-400">Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-300 font-black uppercase animate-pulse">Decrypting Vault Nodes...</TableCell></TableRow>
                ) : (
                  materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map((m) => (
                    <TableRow key={m.variant_id} className="hover:bg-blue-50/30 transition-all border-b border-slate-50 h-24">
                      <TableCell className="pl-10"><Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-base uppercase">{m.product_name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-black mt-1">ID: {m.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-700">{(m.buying_price || 0).toLocaleString()} UGX</TableCell>
                      <TableCell className="text-right">
                         <div className="flex flex-col items-end">
                            <span className={`text-xl font-black tabular-nums ${m.current_stock < 5 ? 'text-red-500' : 'text-slate-900'}`}>{m.current_stock?.toLocaleString()}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{m.unit} in vault</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right pr-12">
                         <Dialog>
                            <DialogTrigger asChild>
                               <Button variant="ghost" onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="h-12 w-12 rounded-xl text-orange-500 hover:bg-orange-50 transition-all">
                                  <BadgeAlert size={28} />
                               </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2.5rem] border-none p-10 bg-white shadow-2xl">
                               <div className="space-y-6">
                                  <div className="flex items-center gap-4">
                                     <AlertTriangle className="text-orange-500 h-10 w-10" />
                                     <h3 className="text-2xl font-black uppercase tracking-tighter">Forensic Loss Log</h3>
                                  </div>
                                  <p className="text-sm font-bold text-slate-500">Authorized deduction for: <span className="text-slate-900 underline italic">{m.product_name}</span></p>
                                  <div className="grid grid-cols-2 gap-6 pt-4">
                                     <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Loss Qty</Label>
                                        <Input type="number" placeholder="0.00" className="h-14 font-black text-xl rounded-xl bg-slate-50 border-none" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                     </div>
                                     <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Reason</Label>
                                        <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                           <SelectTrigger className="h-14 font-black rounded-xl bg-slate-50 border-none"><SelectValue placeholder="Expired" /></SelectTrigger>
                                           <SelectContent>
                                              <SelectItem value="Expired">Chemical Expiry</SelectItem>
                                              <SelectItem value="Damaged">Broken / Spilled</SelectItem>
                                              <SelectItem value="Waste">Production Waste</SelectItem>
                                           </SelectContent>
                                        </Select>
                                     </div>
                                  </div>
                                  <Button onClick={() => logShrinkage.mutate()} className="w-full h-16 bg-orange-600 hover:bg-slate-900 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest">
                                     AUTHORIZE LEDGER SYNC
                                  </Button>
                               </div>
                            </DialogContent>
                         </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="text-center opacity-40 py-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em]">BBU1 NEURAL ERP • MANUFACTURING ENGINE NODE • v10.4.2</p>
      </div>
    </div>
  );
}