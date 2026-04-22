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

  const handleCreateUnit = async () => {
    if (!newUnit.name || !newUnit.abbreviation) return toast.error("Required fields missing for measurement unit.");
    try {
        const { data, error } = await supabase.from('units_of_measure').insert([{ 
            name: newUnit.name, 
            abbreviation: newUnit.abbreviation.toUpperCase() 
        }]).select().single();
        if (error) throw error;
        toast.success(`Unit ${data.name} established.`);
        setForm({ ...form, uom_id: data.id }); 
        setNewUnit({ name: '', abbreviation: '' });
        setIsUnitModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['uoms'] });
    } catch (e: any) {
        toast.error(`Unit Creation Error: ${e.message}`);
    }
  };

  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Material Name and Unit of Measure are mandatory.");
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

      toast.success("Material successfully registered in the inventory system.");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: '' });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(`Registration Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logShrinkage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: -Math.abs(adjustData.qty),
        p_reason: `System Adjustment: ${adjustData.reason}`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock levels updated successfully.");
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  const downloadForensicReport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
        const headers = "Name,SKU,Type,Quality,Stock,Unit,UnitValue,TotalValue\n";
        const rows = materials?.map(m => `${m.product_name},${m.sku},${m.material_type},${m.quality_grade},${m.current_stock},${m.unit},${m.buying_price},${m.current_stock * m.buying_price}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Inventory_Report_${new Date().toISOString()}.csv`;
        link.click();
        return;
    }

    const doc = new jsPDF();
    (doc as any).autoTable({
        startY: 20,
        head: [['Material', 'SKU/Lot', 'Current Stock', 'Unit Price', 'Total Valuation']],
        body: materials?.map(m => [m.product_name, m.sku, `${m.current_stock} ${m.unit}`, `${m.buying_price} ${businessCurrency}`, `${(m.current_stock * m.buying_price).toLocaleString()} ${businessCurrency}`]),
    });
    doc.save(`Inventory_Valuation_Report.pdf`);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to remove ${selectedItems.length} records? This action cannot be undone.`)) return;
    const { error } = await supabase.from('product_variants').delete().in('id', selectedItems);
    if (error) toast.error(error.message);
    else {
        toast.success("Records removed successfully.");
        setSelectedItems([]);
        queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  };

  return (
    <div className="min-h-screen bg-white p-8 md:p-12 font-sans selection:bg-blue-50">
      
      {/* PROFESSIONAL PAGE HEADER */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Raw Material Inventory</h1>
            <p className="text-slate-500 mt-2 text-sm">{businessName} • Operational Control Center</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => downloadForensicReport('EXCEL')} variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg h-10 px-5 font-medium">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => downloadForensicReport('PDF')} variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg h-10 px-5 font-medium">
              <FileText className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* WIDE REGISTRATION FORM */}
        <Card className="border-none shadow-[0_1px_3px_rgba(0,0,0,0.1)] overflow-hidden bg-white rounded-xl">
          <CardHeader className="px-10 py-6 border-b border-slate-50">
            <div className="flex items-center gap-3">
               <Database className="h-5 w-5 text-blue-600" />
               <CardTitle className="text-lg font-bold text-slate-800">Register New Raw Material</CardTitle>
            </div>
            <CardDescription className="text-sm">Input material specifications and initial stock levels for system onboarding.</CardDescription>
          </CardHeader>
          <CardContent className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8">
              <div className="lg:col-span-2 space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Material Name</Label>
                <Input placeholder="Enter chemical or item name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-11 border-slate-200 rounded-lg font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SKU / Lot Reference</Label>
                <Input placeholder="Auto-generate if blank" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="h-11 border-slate-200 font-mono text-sm rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Physical State</Label>
                <Select onValueChange={v => setForm({...form, type: v})} defaultValue="Solid">
                  <SelectTrigger className="h-11 border-slate-200 font-medium rounded-lg"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solid">Solid / Powder</SelectItem>
                    <SelectItem value="Liquid">Liquid / Fluid</SelectItem>
                    <SelectItem value="Gas">Compressed Gas</SelectItem>
                    <SelectItem value="Component">Raw Assembly Part</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quality Grade</Label>
                <Select onValueChange={v => setForm({...form, quality: v})} defaultValue="Standard">
                  <SelectTrigger className="h-11 border-slate-200 font-medium rounded-lg"><SelectValue placeholder="Select quality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pharmaceutical">Pharmaceutical Grade</SelectItem>
                    <SelectItem value="Food Grade">Food Safe (FDA/WHO)</SelectItem>
                    <SelectItem value="Industrial">Industrial Standard</SelectItem>
                    <SelectItem value="Organic">Organic / Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end gap-1 mb-0.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit of Measure</Label>
                    <button onClick={() => setIsUnitModalOpen(true)} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wide">
                        + Add Unit
                    </button>
                </div>
                <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
                  <SelectTrigger className="h-11 border-slate-200 font-medium rounded-lg"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {uoms?.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Cost ({businessCurrency})</Label>
                <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="h-11 border-slate-200 text-right font-semibold rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Initial Stock Quantity</Label>
                <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="h-11 border-slate-200 text-right font-bold text-blue-600 bg-blue-50/20 rounded-lg" />
              </div>
              <div className="lg:col-span-3 space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Vendor / Supplier</Label>
                <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                  <SelectTrigger className="border-slate-200 font-medium h-11 rounded-lg"><SelectValue placeholder="Select vendor from registry" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleOnboard} disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 rounded-lg shadow-sm transition-all uppercase tracking-widest text-xs">
                  {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="mr-2 h-4 w-4"/>} 
                  Register Material
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CLEAN LEDGER TABLE */}
        <Card className="border-none shadow-[0_1px_3px_rgba(0,0,0,0.1)] bg-white overflow-hidden rounded-xl">
          <CardHeader className="px-10 py-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">Inventory Ledger & Valuation</CardTitle>
              <CardDescription className="text-sm font-medium text-slate-400 mt-1">Real-time valuation of available material stock levels.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Filter by material name or SKU..." 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-medium rounded-lg" 
                  />
               </div>
               {selectedItems.length > 0 && (
                 <Button onClick={handleBulkDelete} variant="destructive" className="h-11 px-6 font-bold rounded-lg uppercase text-[10px] tracking-widest">
                   <Trash2 className="mr-2 h-4 w-4" /> Remove ({selectedItems.length})
                 </Button>
               )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-16 text-center border-r border-slate-50">
                      <Checkbox onCheckedChange={(c) => setSelectedItems(c ? materials?.map(m => m.variant_id) || [] : [])} />
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-400 py-5 px-8 tracking-wider">Status</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-400 py-5 tracking-wider">Material Description</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-400 py-5 text-right tracking-wider">Unit Value</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-400 py-5 text-right tracking-wider">Stock Balance</TableHead>
                    <TableHead className="text-center pr-10 text-xs font-bold uppercase text-slate-400 tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                          <span className="text-slate-400 font-medium text-xs uppercase tracking-widest">Synchronizing Ledger...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : materials?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-slate-300 font-medium text-sm tracking-wide italic">No records found.</TableCell>
                    </TableRow>
                  ) : (
                    materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                      <TableRow key={m.variant_id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 h-20">
                        <TableCell className="text-center border-r border-slate-50">
                          <Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} />
                        </TableCell>
                        <TableCell className="px-8">
                           {m.current_stock > 100 ? (
                             <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold text-[10px] uppercase px-3">Operational</Badge>
                           ) : m.current_stock > 0 ? (
                             <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 font-bold text-[10px] uppercase px-3">Low Level</Badge>
                           ) : (
                             <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 font-bold text-[10px] uppercase px-3">Stock Depleted</Badge>
                           )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{m.product_name}</span>
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-2 uppercase tracking-wide mt-0.5">
                                {m.sku} • {m.quality_grade}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-600 text-sm">
                          {m.buying_price.toLocaleString()} <span className="text-[10px] text-slate-400 ml-1 uppercase">{businessCurrency}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-lg font-bold tracking-tight ${m.current_stock < 10 ? 'text-red-500' : 'text-slate-900'}`}>{m.current_stock?.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center pr-10">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="text-slate-300 hover:text-orange-600 hover:bg-orange-50 rounded-lg">
                                <BadgeAlert className="h-5 w-5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] rounded-xl p-0 overflow-hidden border-none shadow-2xl">
                              <DialogHeader className="bg-slate-900 px-8 py-6 text-white">
                                <DialogTitle className="flex items-center gap-3 text-xl font-bold tracking-tight uppercase">
                                  Manual Stock Adjustment
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs mt-1">Record a physical deduction for: <span className="text-white font-bold">{m.product_name}</span></DialogDescription>
                              </DialogHeader>
                              <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adjustment Quantity</Label>
                                  <div className="relative">
                                    <Input type="number" placeholder="0" className="h-14 border-slate-200 bg-slate-50 font-bold text-3xl text-center rounded-lg" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300 uppercase">{m.unit}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason for Adjustment</Label>
                                  <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                    <SelectTrigger className="h-11 border-slate-200 font-medium rounded-lg"><SelectValue placeholder="Select reason" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Waste">Production Waste / Scrap</SelectItem>
                                      <SelectItem value="Expired">Product Expiry</SelectItem>
                                      <SelectItem value="Damage">Damaged / Spillage</SelectItem>
                                      <SelectItem value="Forensic">Audit Correction</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
                                <Button onClick={() => logShrinkage.mutate()} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-lg shadow-sm uppercase tracking-widest text-xs">
                                  Finalize Adjustment
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

      {/* UNIT CREATION MODAL */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="sm:max-w-[450px] rounded-xl p-0 overflow-hidden border-none shadow-2xl">
              <div className="bg-slate-900 px-8 py-6 text-white">
                  <DialogTitle className="text-lg font-bold uppercase tracking-tight flex items-center gap-3">
                      Define Measurement Unit
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs mt-1 leading-relaxed">
                      Create an industrial measurement standard for your inventory.
                  </DialogDescription>
              </div>
              <div className="p-8 space-y-6">
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Unit Name</Label>
                      <Input placeholder="e.g. Kilogram" value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} className="h-11 border-slate-200 font-medium rounded-lg" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abbreviation</Label>
                      <Input placeholder="e.g. KG" value={newUnit.abbreviation} onChange={e => setNewUnit({...newUnit, abbreviation: e.target.value})} className="h-11 border-slate-200 font-bold text-lg rounded-lg" />
                  </div>
              </div>
              <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 flex gap-3">
                  <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="font-bold text-slate-400">Cancel</Button>
                  <Button onClick={handleCreateUnit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-lg shadow-sm uppercase tracking-widest text-xs">Establish Unit</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* STATUS FOOTER */}
      <footer className="max-w-[1600px] mx-auto mt-16 flex items-center justify-between border-t border-slate-100 pt-10 pb-12">
          <div className="space-y-1">
             <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">System Monitoring</p>
             <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200 px-3">{businessCurrency} Active</Badge>
                <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200 px-3 uppercase">Inventory Sync: Active</Badge>
             </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-100 rounded-xl">
             <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Data Integrity Status: Optimal
             </span>
          </div>
      </footer>
    </div>
  );
}