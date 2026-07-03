'use client';

/**
 * --- RAW MATERIAL REGISTRY ---
 * VERSION: v4.0 PROFESSIONAL (CLEAN)
 * Use: Enterprise management for raw material inventory and supplier tracking.
 * Logic: Dynamic currency detection + multi-tenant supplier integration.
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
  Ruler, Activity, DollarSign, Warehouse
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
  const [adjustData, setAdjustData] = useState({ variant_id: '', qty: 0, reason: 'Manual Correction' });

  // 1. DATA: Identity Handshake (Determines dynamic currency)
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

  // 4. DATA: Suppliers (Switched to 'suppliers' table per instructions)
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

  const handleCreateUnit = async () => {
    if (!newUnit.name || !newUnit.abbreviation) return toast.error("Required fields missing.");
    try {
        const { data, error } = await supabase.from('units_of_measure').insert([{ 
            name: newUnit.name, 
            abbreviation: newUnit.abbreviation.toUpperCase() 
        }]).select().single();
        if (error) throw error;
        toast.success("Unit of measure created.");
        setForm({ ...form, uom_id: data.id }); 
        setNewUnit({ name: '', abbreviation: '' });
        setIsUnitModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['uoms'] });
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Please provide material name and unit.");
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
      toast.success("Material added to inventory.");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: '' });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const logAdjustment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: -Math.abs(adjustData.qty),
        p_reason: `Stock Adjustment: ${adjustData.reason}`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inventory levels corrected.");
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  const downloadReport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
        const headers = "Description,SKU,Stock,Price,Value\n";
        const rows = materials?.map(m => `${m.product_name},${m.sku},${m.current_stock} ${m.unit},${m.buying_price},${m.current_stock * m.buying_price}`).join("\n");
        const totalLine = `\nTOTAL VALUE,,,,${ledgerStats.totalValuation}`;
        const blob = new Blob([headers + rows + totalLine], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Inventory_Report_${Date.now()}.csv`;
        link.click();
        return;
    }
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text("RAW MATERIAL REGISTRY REPORT", 14, 22);
    doc.setFontSize(10);
    doc.text(`Organization: ${businessName} | Date: ${new Date().toLocaleDateString()} | Currency: ${businessCurrency}`, 14, 30);
    (doc as any).autoTable({
        startY: 40,
        head: [['Description', 'SKU / ID', 'Stock Level', 'Price per Unit', 'Total Valuation']],
        body: materials?.map(m => [
          m.product_name, 
          m.sku, 
          `${m.current_stock} ${m.unit}`, 
          m.buying_price.toLocaleString(), 
          (m.current_stock * m.buying_price).toLocaleString()
        ]),
        headStyles: { fillColor: [51, 65, 85] },
        foot: [[{ content: 'CUMULATIVE VALUATION', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `${ledgerStats.totalValuation.toLocaleString()} ${businessCurrency}`, styles: { fontStyle: 'bold' } }]]
    });
    doc.save(`Material_Audit_${Date.now()}.pdf`);
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-[400px] bg-white gap-4"><Loader2 className="animate-spin text-blue-600 h-8 w-8" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Material Registry...</p></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 1. CLEAN HEADER & DYNAMIC STATS */}
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
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 text-blue-600">
               <Package size={20} />
             </div>
             <CardTitle className="text-md font-bold text-slate-900 uppercase tracking-wider">Material Enrollment</CardTitle>
          </div>
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
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Physical State</Label>
              <Select onValueChange={v => setForm({...form, type: v})} defaultValue="Solid">
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solid">Solid / Powder</SelectItem>
                  <SelectItem value="Liquid">Liquid / Fluid</SelectItem>
                  <SelectItem value="Gas">Gas</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                <Button variant="outline" onClick={() => setIsUnitModalOpen(true)} className="h-11 w-11 rounded-xl text-slate-400 border-slate-200">
                  <Plus size={20} />
                </Button>
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
            
            <div className="lg:col-span-3 space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Verified Supply Partner</Label>
              <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Identify Supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleOnboard} disabled={loading} className="w-full h-11 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all uppercase tracking-widest text-[10px] active:scale-95">
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
          <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by name or SKU..." 
                onChange={e => setSearchTerm(e.target.value)} 
                className="h-11 pl-11 border-slate-200 bg-white rounded-xl text-sm focus:ring-blue-600 shadow-sm" 
              />
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
                  <TableHead className="px-6 font-bold uppercase text-slate-500 text-[10px] tracking-widest">Stock Status</TableHead>
                  <TableHead className="font-bold uppercase text-slate-500 text-[10px] tracking-widest">Material Identity</TableHead>
                  <TableHead className="text-right font-bold uppercase text-slate-500 text-[10px] tracking-widest">Unit Rate</TableHead>
                  <TableHead className="text-right font-bold uppercase text-slate-500 text-[10px] tracking-widest">Balance</TableHead>
                  <TableHead className="px-10 text-right font-bold uppercase text-slate-500 text-[10px] tracking-widest">Valuation</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                  <TableRow key={m.variant_id} className="h-20 hover:bg-slate-50/50 transition-colors border-b last:border-none">
                    <TableCell className="text-center">
                      <Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} />
                    </TableCell>
                    <TableCell className="px-6">
                       {m.current_stock > 50 ? (
                         <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-none font-bold text-[9px] uppercase px-3 py-1 rounded-md">Healthy</Badge>
                       ) : (
                         <Badge variant="outline" className="bg-rose-50 text-rose-700 border-none font-bold text-[9px] uppercase px-3 py-1 rounded-md">Low Stock</Badge>
                       )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-[15px] tracking-tight">{m.product_name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">{m.sku} — {m.quality_grade}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-slate-800 text-sm tabular-nums">{m.buying_price.toLocaleString()}</span>
                      <span className="text-[9px] text-slate-400 ml-1.5 font-bold uppercase">{businessCurrency}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-base font-bold tabular-nums ${m.current_stock < 20 ? 'text-rose-600' : 'text-slate-900'}`}>{m.current_stock?.toLocaleString()}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{m.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 text-right font-bold text-slate-900 text-sm tabular-nums">
                      {(m.current_stock * m.buying_price).toLocaleString()}
                    </TableCell>
                    <TableCell className="pr-6 text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="h-10 w-10 text-slate-300 hover:text-slate-900 rounded-full flex items-center justify-center transition-all hover:bg-slate-100">
                            <BadgeAlert size={20} />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-3xl bg-white">
                          <div className="bg-slate-900 p-8 text-white text-center">
                            <DialogTitle className="text-lg font-bold uppercase tracking-widest">Inventory Correction</DialogTitle>
                            <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">{m.product_name}</DialogDescription>
                          </div>
                          <div className="p-10 space-y-8">
                              <div className="space-y-4">
                                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center block">Actual Count Adjustment</Label>
                                <div className="relative">
                                  <Input type="number" className="h-20 border-slate-100 bg-slate-50 font-black text-4xl text-center rounded-2xl shadow-inner text-slate-900 focus-visible:ring-0" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-300 uppercase text-[11px]">{m.unit}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identify Reason</Label>
                                <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                  <SelectTrigger className="h-12 border-slate-200 bg-white font-semibold rounded-xl text-sm"><SelectValue placeholder="Reason for change" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Waste">Production Waste</SelectItem>
                                    <SelectItem value="Damage">Material Damage</SelectItem>
                                    <SelectItem value="Audit">Audit Correction</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                          </div>
                          <DialogFooter className="p-8 bg-slate-50 border-t">
                            <Button onClick={() => logAdjustment.mutate()} className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl uppercase tracking-widest text-xs">
                              Confirm Adjustment
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* MEASUREMENT UNIT MODAL */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="max-w-sm rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
              <div className="bg-slate-900 p-8 text-white text-center">
                  <DialogTitle className="text-sm font-bold uppercase tracking-widest">Add Metric</DialogTitle>
              </div>
              <div className="p-8 space-y-6">
                  <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Unit Name</Label>
                      <Input placeholder="e.g. Kilogram" value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Abbreviation</Label>
                      <Input placeholder="e.g. KG" value={newUnit.abbreviation} onChange={e => setNewUnit({...newUnit, abbreviation: e.target.value})} className="h-11 rounded-xl text-center font-bold uppercase" />
                  </div>
              </div>
              <DialogFooter className="px-8 py-6 bg-slate-50 border-t flex gap-4">
                  <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-11 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Cancel</Button>
                  <Button onClick={handleCreateUnit} className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-xl shadow-lg uppercase tracking-widest text-[10px] flex-1">Authorize Unit</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <footer className="flex flex-col md:flex-row items-center justify-between border-t border-slate-100 pt-10 pb-16 opacity-30">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Business Standard V3.2.0</span>
             </div>
             <div className="h-4 w-px bg-slate-200 hidden md:block" />
             <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Material Integrity Node</span>
          </div>
          <div className="flex items-center gap-3 mt-6 md:mt-0">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registry Synchronized</span>
          </div>
      </footer>
    </div>
  );
}