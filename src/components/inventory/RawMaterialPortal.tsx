'use client';

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FlaskConical, ShieldCheck, Truck, Scale, BadgeAlert, 
  Plus, Trash2, FileDownloader, Search, History, 
  AlertTriangle, CheckCircle2, Loader2, Database, 
  ArrowDownToLine, Table as TableIcon, Filter, Layers
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const supabase = createClient();

export default function RawMaterialPortal() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Form State
  const [form, setForm] = useState({
    name: '', sku: '', type: 'Solid', quality: 'Standard', 
    price: 0, qty: 0, uom_id: '', supplier_id: ''
  });

  // Adjustment State
  const [adjustData, setAdjustData] = useState({ variant_id: '', qty: 0, reason: 'Damaged' });

  // --- 1. DATA QUERIES ---
  const { data: materials, isLoading } = useQuery({
    queryKey: ['raw_materials_ledger'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_registry') // Using the View we created earlier
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

  // --- 2. AUTOMATED MUTATIONS ---

  // ONBOARDING: Creates Product -> Variant -> Stock -> GL Entry (Automated via RPC)
  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Please fill all identity fields.");
    setLoading(true);
    try {
      // We use a custom RPC 'onboard_raw_material_v2' to handle the GL Link and Stock in one transaction
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

      toast.success("Material Synced to Forensic Ledger");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '' });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(`Sync Failure: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ADJUSTMENT: Handles Expiry/Damages with audit log
  const handleAdjustment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: -Math.abs(adjustData.qty), // Always deduction
        p_reason: `Raw Material Audit: ${adjustData.reason}`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shrinkage Logged & Ledger Adjusted");
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  // BULK DELETE
  const handleBulkDelete = async () => {
    if (!confirm(`Permanently expunge ${selectedItems.length} records from the vault?`)) return;
    const { error } = await supabase.from('product_variants').delete().in('id', selectedItems);
    if (error) toast.error(error.message);
    else {
        toast.success("Ledger Cleaned");
        setSelectedItems([]);
        queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  };

  // --- 3. EXPORT LOGIC ---
  const exportData = (type: 'CSV' | 'EXCEL') => {
    // Basic CSV Generator logic
    const headers = "Name,SKU,Type,Quality,Stock,Unit,Value(UGX)\n";
    const rows = materials?.map(m => `${m.product_name},${m.sku},${m.material_type},${m.quality_grade},${m.current_stock},${m.unit},${m.current_stock * m.buying_price}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BBU1_Material_Audit_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast.success(`Exporting ${type} Audit Trail...`);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      
      {/* SECTION 1: DYNAMIC ONBOARDING PORTAL */}
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
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Raw Input Registry</h1>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                <ShieldCheck className="text-emerald-500 h-4 w-4" /> Sovereign Infrastructure • Forensic Accounting Active
              </p>
            </div>
          </div>
          <div className="flex gap-4">
             <Button variant="outline" onClick={() => exportData('CSV')} className="h-12 px-6 font-black rounded-xl border-slate-200 gap-2">
                <TableIcon size={18} /> EXPORT AUDIT
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* LEFT: Material DNA */}
          <div className="lg:col-span-2 space-y-8">
             <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase text-slate-400 tracking-widest">A. Material Identity (Search Registry)</Label>
                <Input placeholder="e.g. Caustic Soda / Industrial Wheat / Leather Hide" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-16 font-black text-xl rounded-2xl border-slate-200 shadow-inner" />
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="font-black text-[9px] uppercase text-slate-400">Material SKU</Label>
                  <Input placeholder="RM-XXXX" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-12 font-mono font-bold rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[9px] uppercase text-slate-400">Input Phase</Label>
                  <Select onValueChange={v => setForm({...form, type: v})}>
                    <SelectTrigger className="h-12 font-black"><SelectValue placeholder="Solid" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solid">Solid / Powder</SelectItem>
                      <SelectItem value="Liquid">Liquid / Fluid</SelectItem>
                      <SelectItem value="Gas">Gaseous State</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[9px] uppercase text-slate-400">Quality Matrix</Label>
                  <Select onValueChange={v => setForm({...form, quality: v})}>
                    <SelectTrigger className="h-12 font-black"><SelectValue placeholder="Standard" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pharma">Pharma Grade</SelectItem>
                      <SelectItem value="Premium">Premium Food</SelectItem>
                      <SelectItem value="Industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[9px] uppercase text-slate-400 text-blue-600">Measurement Unit</Label>
                  <Select onValueChange={v => setForm({...form, uom_id: v})}>
                    <SelectTrigger className="h-12 font-black border-blue-100 bg-blue-50/20"><SelectValue placeholder="Select UOM" /></SelectTrigger>
                    <SelectContent>
                      {uoms?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
             </div>
          </div>

          {/* RIGHT: Financial Initialization (Automatic GL Sync) */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white space-y-8">
             <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-400 h-6 w-6" />
                <span className="text-[10px] font-black uppercase text-blue-300 tracking-[0.3em]">Capitalization Audit</span>
             </div>
             
             <div className="space-y-6">
                <div className="space-y-2">
                   <Label className="font-black text-[9px] uppercase text-slate-500">Buy-In Landed Cost (UGX)</Label>
                   <div className="relative">
                      <Scale className="absolute left-4 top-4 text-slate-700 h-5 w-5" />
                      <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="h-14 pl-12 font-black text-2xl text-right bg-slate-800 border-none rounded-2xl text-emerald-400" />
                   </div>
                </div>

                <div className="space-y-2">
                   <Label className="font-black text-[9px] uppercase text-slate-500">Initial Stock Deployment</Label>
                   <div className="relative">
                      <Layers className="absolute left-4 top-4 text-slate-700 h-5 w-5" />
                      <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="h-14 pl-12 font-black text-2xl text-center bg-slate-800 border-none rounded-2xl" />
                   </div>
                </div>

                <div className="space-y-2">
                   <Label className="font-black text-[9px] uppercase text-slate-500">Primary Source Vendor</Label>
                   <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                    <SelectTrigger className="h-12 font-bold bg-slate-800 border-none rounded-xl"><SelectValue placeholder="Select Supplier..." /></SelectTrigger>
                    <SelectContent>
                       {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
             </div>
          </div>
        </div>

        <Button 
          onClick={handleOnboard} 
          disabled={loading}
          className="w-full h-20 bg-blue-600 hover:bg-slate-900 text-white font-black text-xl rounded-[1.5rem] shadow-[0_20px_50px_rgba(37,_99,_235,_0.3)] transition-all gap-5 uppercase tracking-[0.2em]"
        >
          {loading ? <Loader2 className="animate-spin h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
          {loading ? "INITIALIZING ASSETS..." : "COMMIT TO PERPETUAL LEDGER"}
        </Button>
      </div>

      {/* SECTION 2: THE FORENSIC MATERIAL VAULT (Management & Reports) */}
      <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] rounded-[3.5rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
                <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Inventory Valuation Ledger</CardTitle>
                <div className="flex gap-4 items-center">
                    <Badge variant="outline" className="font-black text-[10px] py-1 px-4 border-2 border-emerald-100 text-emerald-600 bg-white">SECURE STORAGE ACTIVE</Badge>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nodes: {materials?.length || 0} Components</span>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-80">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                    <Input placeholder="Scan SKU or Material..." value={filter} onChange={e => setFilter(e.target.value)} className="h-12 pl-12 rounded-2xl border-slate-100 bg-white font-bold" />
                </div>
                {selectedItems.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" className="h-12 px-6 font-black rounded-2xl animate-in zoom-in">
                        <Trash2 className="mr-2" size={18} /> EXPUNGE ({selectedItems.length})
                    </Button>
                )}
            </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md">
                <TableRow className="border-none">
                  <TableHead className="w-16 pl-10 h-16"><Checkbox onCheckedChange={(checked) => setSelectedItems(checked ? materials?.map(m => m.variant_id) || [] : [])} /></TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 tracking-widest">Asset Identity</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-center">Batch Logic</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right">Landed Cost</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right">Warehouse Stock</TableHead>
                  <TableHead className="text-right pr-10 font-black text-[10px] uppercase text-slate-400 h-16">Operations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-64 text-center text-slate-300 font-black uppercase animate-pulse">Scanning Cloud Vault...</TableCell></TableRow>
                ) : (
                  materials?.filter(m => m.product_name.toLowerCase().includes(filter.toLowerCase())).map((m) => (
                    <TableRow key={m.variant_id} className="hover:bg-blue-50/30 transition-all border-b border-slate-50 group h-24">
                      <TableCell className="pl-10"><Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(checked) => setSelectedItems(prev => checked ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-base uppercase tracking-tight">{m.product_name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-black mt-1">FINGERPRINT: {m.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="inline-flex flex-col gap-1 items-center bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-inner">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{m.material_type}</span>
                            <Badge variant="outline" className="text-[8px] font-black uppercase text-blue-600 border-blue-100 bg-white">{m.quality_grade}</Badge>
                         </div>
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-base tabular-nums">{m.buying_price.toLocaleString()}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">UGX / {m.unit}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex flex-col items-end">
                            <span className={`text-xl font-black tabular-nums ${m.current_stock < 10 ? 'text-red-500' : 'text-slate-900'}`}>{m.current_stock.toLocaleString()}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total In Vault</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                         {/* ADJUSTMENT DIALOG */}
                         <Dialog>
                            <DialogTrigger asChild>
                               <Button variant="ghost" onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="h-12 w-12 rounded-2xl hover:bg-white shadow-sm transition-all text-orange-500">
                                  <BadgeAlert size={24} />
                               </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2.5rem] border-none shadow-2xl bg-white p-10">
                               <div className="space-y-6">
                                  <div className="flex items-center gap-4">
                                     <AlertTriangle className="text-orange-500 h-8 w-8" />
                                     <h3 className="text-2xl font-black tracking-tighter uppercase">Forensic Adjustment</h3>
                                  </div>
                                  <p className="text-xs text-slate-500 font-bold leading-relaxed">Log loss for <span className="text-slate-900 underline italic">{m.product_name}</span>. This action permanently adjusts the ledger.</p>
                                  
                                  <div className="grid grid-cols-2 gap-6">
                                     <div className="space-y-2">
                                        <Label className="font-black text-[9px] uppercase text-slate-400">Deduction Qty</Label>
                                        <Input type="number" placeholder="Enter Amount" className="h-14 font-black text-xl rounded-2xl bg-slate-50 border-none" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                     </div>
                                     <div className="space-y-2">
                                        <Label className="font-black text-[9px] uppercase text-slate-400">Forensic Reason</Label>
                                        <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                           <SelectTrigger className="h-14 font-black rounded-2xl bg-slate-50 border-none"><SelectValue placeholder="Damaged" /></SelectTrigger>
                                           <SelectContent>
                                              <SelectItem value="Damaged">Broken / Damaged</SelectItem>
                                              <SelectItem value="Expired">Chemical Expiry</SelectItem>
                                              <SelectItem value="Waste">Production Spill</SelectItem>
                                              <SelectItem value="Theft">Unexplained Loss</SelectItem>
                                           </SelectContent>
                                        </Select>
                                     </div>
                                  </div>
                                  <Button onClick={() => handleAdjustment.mutate()} className="w-full h-16 bg-orange-600 hover:bg-slate-900 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest">
                                     AUTHORIZE DEDUCTION
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

      {/* FINAL SYSTEM AUDIT FOOTER */}
      <div className="text-center opacity-40 pb-20">
        <div className="inline-flex items-center gap-6 px-10 py-4 bg-white rounded-full shadow-sm border border-slate-100">
           <ShieldCheck size={18} className="text-emerald-500" />
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">
              BBU1 NEURAL ERP • MANUFACTURING PROTOCOL v10.4.2 • ALL NODES SYNCED
           </p>
        </div>
      </div>
    </div>
  );
}