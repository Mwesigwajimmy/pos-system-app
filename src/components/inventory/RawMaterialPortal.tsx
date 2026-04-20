'use client';

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FlaskConical, ShieldCheck, Truck, Scale, BadgeAlert, 
  Trash2, Search, History, FileDown, 
  AlertTriangle, CheckCircle2, Loader2, Database, 
  Table as TableIcon, Layers, FileText, X, Globe,
  ArrowDownToLine, Filter, Settings, Calculator, Plus, Download
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
  
  // Enterprise Onboarding Form
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

  const businessCurrency = profile?.reporting_currency || 'UGX';
  const businessName = profile?.business_name || 'Business Manager';

  // --- 2. CORE DATA QUERIES ---
  const { data: materials, isLoading } = useQuery({
    queryKey: ['raw_materials_ledger'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_registry')
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

  // --- 3. LOGIC HANDLERS ---
  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Required fields missing: Name and Unit.");
    setLoading(true);
    try {
      const { error } = await supabase.rpc('fn_onboard_new_tenant_accounting', {
        p_name: form.name,
        p_sku: form.sku,
        p_type: form.type,
        p_quality: form.quality,
        p_price: form.price,
        p_initial_qty: form.qty,
        p_uom_id: parseInt(form.uom_id),
        p_vendor_id: form.supplier_id || null,
        p_currency: businessCurrency
      });

      if (error) throw error;

      toast.success("Material added to inventory");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: '' });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logShrinkage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: -Math.abs(adjustData.qty),
        p_reason: `Manual Adjustment: ${adjustData.reason}`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock adjustment processed");
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  const downloadForensicReport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
        const headers = "Material,SKU,Type,Quality,Stock,Unit,UnitValue,TotalValue\n";
        const rows = materials?.map(m => `${m.product_name},${m.sku},${m.material_type},${m.quality_grade},${m.current_stock},${m.unit},${m.buying_price},${m.current_stock * m.buying_price}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Inventory_Valuation.csv`;
        link.click();
        return;
    }

    const doc = new jsPDF();
    (doc as any).autoTable({
        startY: 20,
        head: [['Material', 'SKU', 'Stock', 'Value']],
        body: materials?.map(m => [m.product_name, m.sku, `${m.current_stock} ${m.unit}`, `${m.buying_price} ${businessCurrency}`]),
    });
    doc.save(`Inventory_Report.pdf`);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Confirm deletion of ${selectedItems.length} items?`)) return;
    const { error } = await supabase.from('product_variants').delete().in('id', selectedItems);
    if (error) toast.error(error.message);
    else {
        toast.success("Items removed");
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
          <p className="text-slate-500 mt-1">Manage material onboarding, stock levels, and forensic valuation.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => downloadForensicReport('EXCEL')} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => downloadForensicReport('PDF')} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* NEW MATERIAL ONBOARDING FORM */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
               <Plus className="h-5 w-5 text-blue-600" />
               <CardTitle className="text-lg font-semibold">Onboard New Material</CardTitle>
            </div>
            <CardDescription>Enter details to register a new raw material asset in the system.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Material Name</Label>
                <Input placeholder="e.g. High-Grade Industrial Resin" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border-slate-200 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU / Reference</Label>
                <Input placeholder="RM-001" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Material Type</Label>
                <Select onValueChange={v => setForm({...form, type: v})} defaultValue="Solid">
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solid">Solid</SelectItem>
                    <SelectItem value="Liquid">Liquid</SelectItem>
                    <SelectItem value="Gas">Gas</SelectItem>
                    <SelectItem value="Powder">Powder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quality Grade</Label>
                <Select onValueChange={v => setForm({...form, quality: v})} defaultValue="Standard">
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Quality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit of Measure</Label>
                <Select onValueChange={v => setForm({...form, uom_id: v})}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select Unit" /></SelectTrigger>
                  <SelectContent>
                    {uoms?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price ({businessCurrency})</Label>
                <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="border-slate-200 text-right font-semibold" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Initial Stock</Label>
                <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="border-slate-200 text-right font-semibold" />
              </div>
              <div className="lg:col-span-3 space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preferred Supplier</Label>
                <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleOnboard} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10">
                  {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Database className="mr-2 h-4 w-4"/>} 
                  Register Material
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VALUATION LEDGER TABLE SECTION */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Material Inventory & Valuation</CardTitle>
              <CardDescription>Current machines, allocations, and stock status.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Filter materials or SKU..." 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 h-10 w-full md:w-64 border-slate-200 bg-slate-50/50 focus:bg-white transition-all" 
                  />
               </div>
               {selectedItems.length > 0 && (
                 <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-10">
                   <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedItems.length})
                 </Button>
               )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="w-12 text-center border-r border-slate-100">
                      <Checkbox onCheckedChange={(c) => setSelectedItems(c ? materials?.map(m => m.variant_id) || [] : [])} />
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4 px-6">Material Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4">Identity / SKU</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4 text-right">Landed Cost</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4 text-right">Perpetual Stock</TableHead>
                    <TableHead className="text-center pr-6 text-[11px] font-bold uppercase text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center py-20">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                          <span className="text-slate-400 font-medium text-sm">Syncing with ledger...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : materials?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-medium">No materials found in registry.</TableCell>
                    </TableRow>
                  ) : (
                    materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                      <TableRow key={m.variant_id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <TableCell className="text-center border-r border-slate-100">
                          <Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} />
                        </TableCell>
                        <TableCell className="px-6">
                           {m.current_stock > 10 ? (
                             <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 shadow-none px-3">Stable Stock</Badge>
                           ) : m.current_stock > 0 ? (
                             <Badge className="bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-50 shadow-none px-3">Low Stock</Badge>
                           ) : (
                             <Badge className="bg-red-50 text-red-700 border-red-100 hover:bg-red-50 shadow-none px-3">Out of Stock</Badge>
                           )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col py-2">
                            <span className="font-semibold text-slate-900">{m.product_name}</span>
                            <span className="text-[11px] text-slate-500 font-mono mt-0.5">{m.sku} • {m.material_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-700">
                          {m.buying_price.toLocaleString()} <span className="text-[10px] text-slate-400 ml-1">{businessCurrency}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end py-2">
                            <span className={`text-lg font-bold ${m.current_stock < 5 ? 'text-red-600' : 'text-slate-900'}`}>{m.current_stock?.toLocaleString()}</span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">{m.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="text-slate-400 hover:text-orange-600 hover:bg-orange-50 h-8 w-8 p-0">
                                <BadgeAlert className="h-5 w-5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] rounded-xl border-none shadow-xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                  <AlertTriangle className="h-5 w-5 text-orange-500" /> Stock Adjustment
                                </DialogTitle>
                                <CardDescription>Log loss or manual deduction for <span className="font-bold text-slate-900">{m.product_name}</span>.</CardDescription>
                              </DialogHeader>
                              <div className="grid gap-6 py-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-slate-500 uppercase">Quantity to Deduct</Label>
                                  <Input type="number" placeholder="Enter amount" className="h-12 border-slate-200 font-semibold" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-slate-500 uppercase">Reason for Adjustment</Label>
                                  <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                    <SelectTrigger className="h-12 border-slate-200"><SelectValue placeholder="Select reason" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Expired">Chemical Expiry</SelectItem>
                                      <SelectItem value="Damaged">Damaged / Spilled</SelectItem>
                                      <SelectItem value="Theft">Shrinkage / Theft</SelectItem>
                                      <SelectItem value="Waste">Production Waste</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={() => logShrinkage.mutate()} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-lg">
                                  Process Adjustment
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
      <div className="max-w-7xl mx-auto mt-12 flex items-center justify-end">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
             <div className="h-2 w-2 rounded-full bg-emerald-500" />
             <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Online | Sync: active
             </span>
          </div>
      </div>
    </div>
  );
}