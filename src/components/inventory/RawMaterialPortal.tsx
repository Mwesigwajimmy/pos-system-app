'use client';

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FlaskConical, ShieldCheck, Truck, Scale, BadgeAlert, 
  Trash2, Search, History, FileDown, 
  AlertTriangle, CheckCircle2, Loader2, Database, 
  Table as TableIcon, Layers, FileText, X, Globe,
  ArrowDownToLine, Filter, Settings, Calculator
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const supabase = createClient();

export default function RawMaterialPortal() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Enterprise Onboarding Form (Zero Hardcoding)
  const [form, setForm] = useState({
    name: '', sku: '', type: 'Solid', quality: 'Standard', 
    price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: ''
  });

  // Forensic Adjustment State
  const [adjustData, setAdjustData] = useState({ variant_id: '', qty: 0, reason: 'Expired' });

  // --- 1. SYSTEM IDENTITY & CURRENCY DATA ---
  const { data: profile } = useQuery({
    queryKey: ['business_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, reporting_currency').eq('id', user?.id).single();
      return data;
    }
  });

  const businessCurrency = profile?.reporting_currency || 'USD';
  const businessName = profile?.business_name || 'Enterprise Sovereign';

  // --- 2. CORE DATA QUERIES (Linked Architecture) ---
  const { data: materials, isLoading } = useQuery({
    queryKey: ['raw_materials_ledger'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_registry') // Integrated SQL View
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

  // --- 3. THE AUTOMATED LEDGER SYNC (Onboarding) ---
  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Audit Failure: Identity and Measurement required.");
    setLoading(true);
    try {
      // SYSTEMATIC WELD: RPC handles Product + Variant + Stock + GL Entry in one atomic operation
      const { error } = await supabase.rpc('fn_onboard_new_tenant_accounting', {
        p_name: form.name,
        p_sku: form.sku,
        p_type: form.type,
        p_quality: form.quality,
        p_price: form.price,
        p_initial_qty: form.qty,
        p_uom_id: parseInt(form.uom_id),
        p_vendor_id: form.supplier_id || null,
        p_currency: businessCurrency // Multi-currency dynamic link
      });

      if (error) throw error;

      toast.success("Assets Synced to Sovereign Ledger");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: '' });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(`Sync Failure: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. FORENSIC LOSS LOGGING (Shrinkage Control) ---
  const logShrinkage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: -Math.abs(adjustData.qty),
        p_reason: `Manual Asset Adjustment: ${adjustData.reason}`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shrinkage Logged. Perpetual Ledger Balanced.");
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  // --- 5. ENTERPRISE REPORTING (jsPDF Professional) ---
  const downloadForensicReport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
        const headers = "Material,SKU,Type,Quality,Stock,Unit,UnitValue,TotalValue\n";
        const rows = materials?.map(m => `${m.product_name},${m.sku},${m.material_type},${m.quality_grade},${m.current_stock},${m.unit},${m.buying_price},${m.current_stock * m.buying_price}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${businessName.replace(/\s/g, '_')}_Material_Valuation.csv`;
        link.click();
        return;
    }

    // Professional jsPDF Integration
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // DYNAMIC BRANDING HEADER
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(businessName.toUpperCase(), 15, 25);
    
    doc.setFontSize(9);
    doc.setTextColor(59, 130, 246);
    doc.text("FORENSIC INVENTORY VALUATION CERTIFICATE • MRP v10.4.2", 15, 35);

    // REPORT METADATA
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(`Generated: ${timestamp}`, 15, 55);
    doc.text(`Reporting Currency: ${businessCurrency}`, 15, 60);

    const tableData = materials?.map(m => [
        m.product_name,
        m.sku,
        m.material_type,
        m.quality_grade,
        `${m.current_stock} ${m.unit}`,
        `${m.buying_price.toLocaleString()} ${businessCurrency}`,
        `${(m.current_stock * m.buying_price).toLocaleString()} ${businessCurrency}`
    ]);

    (doc as any).autoTable({
        startY: 70,
        head: [['Material Identity', 'SKU', 'Type', 'Grade', 'Current Stock', 'Landed Cost', 'Net Value']],
        body: tableData,
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 }
    });

    const totalVal = materials?.reduce((sum, m) => sum + (m.current_stock * m.buying_price), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFillColor(241, 245, 249);
    doc.rect(120, finalY - 10, 75, 20, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text("TOTAL LEDGER VALUATION:", 125, finalY + 2);
    doc.setFontSize(14);
    doc.text(`${totalVal?.toLocaleString()} ${businessCurrency}`, 190, finalY + 2, { align: 'right' });

    doc.save(`${businessName.replace(/\s/g, '_')}_FORENSIC_AUDIT.pdf`);
    toast.success("Forensic Report Downloaded");
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to expunge ${selectedItems.length} assets from the perpetual ledger?`)) return;
    const { error } = await supabase.from('product_variants').delete().in('id', selectedItems);
    if (error) toast.error(error.message);
    else {
        toast.success("Vault Nodes Cleaned");
        setSelectedItems([]);
        queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  };

  return (
    <div className="p-8 space-y-12 animate-in fade-in duration-1000 bg-slate-50/30 min-h-screen">
      
      {/* SECTION 1: ONBOARDING TERMINAL */}
      <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden max-w-6xl mx-auto">
        <CardHeader className="bg-slate-900 p-12 text-white flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-8">
                <div className="h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-blue-500/20 shadow-2xl">
                    <FlaskConical className="h-10 w-10 text-white" />
                </div>
                <div>
                    <CardTitle className="text-4xl font-black tracking-tighter uppercase">Input Initialization</CardTitle>
                    <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.5em] mt-2 flex items-center gap-3">
                        <ShieldCheck className="text-emerald-500 h-4 w-4" /> Sovereign Protocol • Forensic Ledger Sync Active
                    </p>
                </div>
            </div>
            <div className="flex gap-4">
                <Button onClick={() => downloadForensicReport('PDF')} variant="outline" className="h-14 border-slate-700 text-white hover:bg-slate-800 rounded-2xl gap-3 text-xs font-black uppercase">
                    <FileText size={20} /> Audit PDF
                </Button>
                <Button onClick={() => downloadForensicReport('EXCEL')} variant="outline" className="h-14 border-slate-700 text-white hover:bg-slate-800 rounded-2xl gap-3 text-xs font-black uppercase">
                    <TableIcon size={20} /> Valuation Excel
                </Button>
            </div>
        </CardHeader>

        <CardContent className="p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Asset Identity DNA */}
            <div className="lg:col-span-2 space-y-10">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. Material Identity Profile</Label>
                    <Input placeholder="Material Description (e.g. Industrial Leather / Powdered Concentrate)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-16 font-black text-2xl border-slate-100 bg-slate-50/50 rounded-2xl shadow-inner focus:bg-white" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-slate-400">Unique SKU</Label>
                        <Input placeholder="AUTO" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-12 font-mono font-bold rounded-xl bg-white border-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-slate-400">Material Unit</Label>
                        <Select onValueChange={v => setForm({...form, uom_id: v})}>
                            <SelectTrigger className="h-12 font-black"><SelectValue placeholder="Unit" /></SelectTrigger>
                            <SelectContent>
                                {uoms?.map(u => <SelectItem key={u.id} value={u.id.toString()} className="font-bold">{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-slate-400">Quality Matrix</Label>
                        <Select onValueChange={v => setForm({...form, quality: v})}>
                            <SelectTrigger className="h-12 font-black"><SelectValue placeholder="Standard" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Premium" className="font-bold">Premium Grade</SelectItem>
                                <SelectItem value="Standard" className="font-bold">Standard Grade</SelectItem>
                                <SelectItem value="Industrial" className="font-bold">Industrial Grade</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-slate-400">Source Vendor</Label>
                        <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                            <SelectTrigger className="h-12 font-black"><SelectValue placeholder="Vendor" /></SelectTrigger>
                            <SelectContent>
                                {vendors?.map(v => <SelectItem key={v.id} value={v.id} className="font-bold">{v.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Financial Ledger Weld */}
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-8 shadow-2xl relative group">
                <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />
                <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                    <ShieldCheck className="text-emerald-400 h-8 w-8" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Capitalization Handshake</span>
                </div>
                <div className="space-y-6">
                    <div>
                        <Label className="text-[9px] font-black text-slate-500 uppercase">Unit Landed Cost ({businessCurrency})</Label>
                        <div className="relative mt-2">
                            <Scale className="absolute left-4 top-4 text-slate-700 h-5 w-5" />
                            <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="h-14 pl-12 font-black text-2xl text-right bg-slate-800 border-none rounded-2xl text-emerald-400 shadow-inner" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[9px] font-black text-slate-500 uppercase">Opening Vault Volume</Label>
                        <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="h-14 font-black text-2xl text-center bg-slate-800 border-none rounded-2xl mt-2 shadow-inner" />
                    </div>
                </div>
                <Button onClick={handleOnboard} disabled={loading} className="w-full h-20 bg-blue-600 hover:bg-white hover:text-blue-600 text-white font-black text-xl rounded-3xl transition-all shadow-[0_20px_50px_rgba(37,_99,_235,_0.3)] uppercase tracking-[0.2em]">
                    {loading ? <Loader2 className="animate-spin h-8 w-8" /> : <Database className="mr-3 h-6 w-6"/>} Sync Assets
                </Button>
            </div>
        </CardContent>
      </Card>

      {/* SECTION 2: PERPETUAL LEDGER VAULT */}
      <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] rounded-[3.5rem] overflow-hidden bg-white max-w-6xl mx-auto">
          <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-col lg:flex-row justify-between items-center gap-10">
             <div className="flex items-center gap-6">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Valuation Ledger</h3>
                <div className="flex items-center gap-3 px-5 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Sovereign Sync Active</span>
                </div>
             </div>
             <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-96">
                    <Search className="absolute left-5 top-4 text-slate-300 h-5 w-5" />
                    <Input placeholder="Scan Registry Identity..." onChange={e => setSearchTerm(e.target.value)} className="pl-14 h-14 rounded-2xl bg-white border-slate-100 font-bold shadow-sm" />
                </div>
                {selectedItems.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" className="h-14 px-8 font-black rounded-2xl animate-in zoom-in gap-3 shadow-xl">
                        <Trash2 size={20} /> EXPUNGE ({selectedItems.length})
                    </Button>
                )}
             </div>
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[600px]">
                <Table>
                    <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md">
                        <TableRow className="border-none">
                            <TableHead className="w-20 pl-12"><Checkbox onCheckedChange={(c) => setSelectedItems(c ? materials?.map(m => m.variant_id) || [] : [])} /></TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 tracking-widest">Asset fingerprint</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right">Landed unit cost</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right">Perpetual Stock</TableHead>
                            <TableHead className="text-right pr-12 font-black text-[10px] uppercase text-slate-400">Controls</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-300 font-black uppercase animate-pulse tracking-[0.5em]">Scanning Cloud Vault...</TableCell></TableRow>
                        ) : (
                            materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                                <TableRow key={m.variant_id} className="hover:bg-blue-50/20 border-b border-slate-50 h-28 transition-all group">
                                    <TableCell className="pl-12"><Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} /></TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 text-lg uppercase tracking-tight">{m.product_name}</span>
                                            <div className="flex gap-3 mt-1.5">
                                                <Badge variant="outline" className="text-[8px] font-black uppercase text-blue-600 bg-blue-50 border-blue-100">{m.sku}</Badge>
                                                <span className="text-[9px] text-slate-400 font-black uppercase self-center opacity-40">{m.material_type} • {m.quality_grade}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-black text-slate-900 text-lg tabular-nums">{m.buying_price.toLocaleString()}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{businessCurrency} / {m.unit}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-3xl font-black tabular-nums ${m.current_stock < 5 ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>{m.current_stock?.toLocaleString()}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase">{m.unit} verified in storage</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-12">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="h-14 w-14 rounded-3xl text-orange-500 hover:bg-orange-50 transition-all border border-transparent hover:border-orange-100">
                                                    <BadgeAlert size={32} />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="rounded-[3rem] border-none p-12 bg-white shadow-2xl max-w-lg">
                                                <div className="space-y-8">
                                                    <div className="flex items-center gap-5">
                                                        <AlertTriangle className="text-orange-500 h-10 w-10" />
                                                        <h3 className="text-3xl font-black uppercase tracking-tighter">Forensic Loss Log</h3>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-500 leading-relaxed italic border-l-4 border-orange-200 pl-6">
                                                        Authorized ledger adjustment for: <span className="text-slate-900 underline">{m.product_name}</span>. This will permanently deduct value from the balance sheet.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-8 pt-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Deduction Qty</Label>
                                                            <Input type="number" placeholder="0.00" className="h-14 font-black text-2xl rounded-2xl bg-slate-50 border-none shadow-inner" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Audit Reason</Label>
                                                            <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                                                <SelectTrigger className="h-14 font-black rounded-2xl bg-slate-50 border-none shadow-inner"><SelectValue placeholder="Expired" /></SelectTrigger>
                                                                <SelectContent className="rounded-2xl shadow-2xl">
                                                                    <SelectItem value="Expired" className="font-bold">Chemical Expiry</SelectItem>
                                                                    <SelectItem value="Damaged" className="font-bold">Spilled / Broken</SelectItem>
                                                                    <SelectItem value="Theft" className="font-bold">Unexplained Shortage</SelectItem>
                                                                    <SelectItem value="Waste" className="font-bold">Production Waste</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <Button onClick={() => logShrinkage.mutate()} className="w-full h-20 bg-orange-600 hover:bg-slate-900 text-white font-black rounded-[2rem] shadow-xl uppercase transition-all tracking-[0.2em] text-sm">
                                                        Authorize Ledger Deduction
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

      {/* FINAL SYSTEM AUTHENTICATION FOOTER */}
      <div className="text-center opacity-40 py-20">
          <div className="inline-flex items-center gap-6 px-12 py-5 bg-white rounded-full shadow-sm border border-slate-100">
             <ShieldCheck size={20} className="text-emerald-500" />
             <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 italic">
                Sovereign Infrastructure Node • BBU1 Enterprise Engine • v10.4.2 Verified
             </p>
          </div>
      </div>
    </div>
  );
}