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
      const { data } = await supabase.from('profiles').select('*, business_name, currency').eq('id', user?.id).single();
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

  // Handler: Create New Unit of Measure
  const handleCreateUnit = async () => {
    if (!newUnit.name || !newUnit.abbreviation) return toast.error("Please fill in unit name and abbreviation.");
    
    try {
        const { data, error } = await supabase
            .from('units_of_measure')
            .insert([{ 
                name: newUnit.name, 
                abbreviation: newUnit.abbreviation.toUpperCase() 
            }])
            .select()
            .single();

        if (error) throw error;

        toast.success(`Unit ${data.name} created.`);
        setForm({ ...form, uom_id: data.id.toString() });
        setNewUnit({ name: '', abbreviation: '' });
        setIsUnitModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['uoms'] });
    } catch (e: any) {
        toast.error(`Unit Creation Failed: ${e.message}`);
    }
  };

  // Handler: Full Material Onboarding (Interconnects POS, Warehouse & Ledger)
  const handleOnboard = async () => {
    if (!form.name || !form.uom_id) return toast.error("Required fields missing: Material Name and Unit.");
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

      toast.success("Industrial asset successfully registered and valued in Ledger.");
      setForm({ name: '', sku: '', type: 'Solid', quality: 'Standard', price: 0, qty: 0, uom_id: '', supplier_id: '', currency_code: '' });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    } catch (e: any) {
      toast.error(`Integration Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logShrinkage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: adjustData.variant_id,
        p_qty_change: -Math.abs(adjustData.qty),
        p_reason: `Industrial Adjustment: ${adjustData.reason}`
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock adjustment processed and ledger updated.");
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
        link.download = `Inventory_Valuation_${new Date().toISOString()}.csv`;
        link.click();
        return;
    }

    const doc = new jsPDF();
    (doc as any).autoTable({
        startY: 20,
        head: [['Material', 'SKU', 'Stock', 'Unit Value', 'Total Valuation']],
        body: materials?.map(m => [m.product_name, m.sku, `${m.current_stock} ${m.unit}`, `${m.buying_price} ${businessCurrency}`, `${(m.current_stock * m.buying_price).toLocaleString()} ${businessCurrency}`]),
    });
    doc.save(`Forensic_Inventory_Report.pdf`);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Confirm removal of ${selectedItems.length} records? This will impact your Balance Sheet.`)) return;
    const { error } = await supabase.from('product_variants').delete().in('id', selectedItems);
    if (error) toast.error(error.message);
    else {
        toast.success("Records removed from registry.");
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
          <p className="text-slate-500 mt-1">Industrial-grade material management, forensic stock control, and GL valuation.</p>
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
        
        {/* MATERIAL ONBOARDING FORM */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
               <Plus className="h-5 w-5 text-blue-600" />
               <CardTitle className="text-lg font-semibold">Onboard Production Asset</CardTitle>
            </div>
            <CardDescription>Register new raw materials for manufacturing, pharma, or food processing cycles.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Material / Chemical Name</Label>
                <Input placeholder="e.g. Purified Sodium Chloride" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border-slate-200 focus:ring-blue-500 font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU / ID Number</Label>
                <Input placeholder="Auto-generated if blank" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="border-slate-200 font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">State of Matter</Label>
                <Select onValueChange={v => setForm({...form, type: v})} defaultValue="Solid">
                  <SelectTrigger className="border-slate-200 font-medium"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solid">Solid (Powder/Grain)</SelectItem>
                    <SelectItem value="Liquid">Liquid / Fluid</SelectItem>
                    <SelectItem value="Gas">Gas / Vapor</SelectItem>
                    <SelectItem value="Raw Component">Raw Assembly Component</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quality Grade</Label>
                <Select onValueChange={v => setForm({...form, quality: v})} defaultValue="Standard">
                  <SelectTrigger className="border-slate-200 font-medium"><SelectValue placeholder="Quality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pharmaceutical">Pharmaceutical (High Purity)</SelectItem>
                    <SelectItem value="Food Grade">Food Grade</SelectItem>
                    <SelectItem value="Industrial">Standard Industrial</SelectItem>
                    <SelectItem value="Premium">Premium / Organic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DYNAMIC UNIT SELECTOR WITH CUSTOM ADD FLOW */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit of Measure</Label>
                    <button onClick={() => setIsUnitModalOpen(true)} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                        <Plus size={10} /> ADD NEW UNIT
                    </button>
                </div>
                <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
                  <SelectTrigger className="border-slate-200 font-medium"><SelectValue placeholder="Select Metric" /></SelectTrigger>
                  <SelectContent>
                    {uoms?.map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                            {u.name} ({u.abbreviation})
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Buying Price ({businessCurrency})</Label>
                <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="border-slate-200 text-right font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Opening Stock Balance</Label>
                <Input type="number" value={form.qty} onChange={e => setForm({...form, qty: Number(e.target.value)})} className="border-slate-200 text-right font-bold text-blue-600" />
              </div>
              <div className="lg:col-span-3 space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Vendor / Supplier</Label>
                <Select onValueChange={v => setForm({...form, supplier_id: v})}>
                  <SelectTrigger className="border-slate-200 font-medium"><SelectValue placeholder="Link a Vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleOnboard} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 shadow-lg shadow-blue-600/20">
                  {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Database className="mr-2 h-4 w-4"/>} 
                  Commit Material
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CUSTOM UNIT MODAL (Enterprise Standard) */}
        <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
            <DialogContent className="sm:max-w-[400px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Ruler className="text-blue-400" /> Add New Unit
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs mt-1">
                        Create a measurement unit for your inventory (e.g. Kilograms, Milliliters).
                    </DialogDescription>
                </div>
                <div className="p-6 space-y-5">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Unit Name</Label>
                        <Input placeholder="e.g. Kilogram" value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} className="h-11 border-slate-200 focus:ring-blue-500 font-medium" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Abbreviation</Label>
                        <Input placeholder="e.g. KG" value={newUnit.abbreviation} onChange={e => setNewUnit({...newUnit, abbreviation: e.target.value})} className="h-11 border-slate-200 font-bold" />
                    </div>
                </div>
                <DialogFooter className="bg-slate-50 p-4 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="font-bold text-slate-500">Cancel</Button>
                    <Button onClick={handleCreateUnit} className="bg-slate-900 hover:bg-blue-600 text-white font-bold px-8 rounded-lg transition-all">Save Unit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* LEDGER & VALUATION TABLE */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Inventory Valuation Ledger</CardTitle>
              <CardDescription>Live tracking of raw material assets and their current balance sheet impact.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Filter by SKU or chemical name..." 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 h-10 w-full md:w-72 border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                  />
               </div>
               {selectedItems.length > 0 && (
                 <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-10 px-4 font-bold shadow-md">
                   <Trash2 className="mr-2 h-4 w-4" /> Remove ({selectedItems.length})
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
                    <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4 px-6">Industrial Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4">Identity / Chemical SKU</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4 text-right">Acquisition Cost</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4 text-right">Perpetual Stock</TableHead>
                    <TableHead className="text-center pr-6 text-[11px] font-bold uppercase text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center py-20">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          <span className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Neural Ledger Sync...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : materials?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-medium italic">No active material registry found in this sector.</TableCell>
                    </TableRow>
                  ) : (
                    materials?.filter(m => m.product_name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                      <TableRow key={m.variant_id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 h-20">
                        <TableCell className="text-center border-r border-slate-100">
                          <Checkbox checked={selectedItems.includes(m.variant_id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, m.variant_id] : prev.filter(id => id !== m.variant_id))} />
                        </TableCell>
                        <TableCell className="px-6">
                           {m.current_stock > 100 ? (
                             <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 shadow-none px-3 font-bold">STABLE</Badge>
                           ) : m.current_stock > 10 ? (
                             <Badge className="bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-50 shadow-none px-3 font-bold">MONITOR</Badge>
                           ) : (
                             <Badge className="bg-red-50 text-red-700 border-red-100 hover:bg-red-50 shadow-none px-3 font-bold uppercase animate-pulse">Critical Restock</Badge>
                           )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{m.product_name}</span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 tracking-tighter uppercase">{m.sku} • {m.quality_grade} grade</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-700">
                          {m.buying_price.toLocaleString()} <span className="text-[9px] text-slate-400 ml-1 uppercase">{businessCurrency}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-lg font-black ${m.current_stock < 5 ? 'text-red-600' : 'text-slate-900'}`}>{m.current_stock?.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setAdjustData({...adjustData, variant_id: m.variant_id})} className="text-slate-300 hover:text-orange-600 hover:bg-orange-50 h-9 w-9 p-0 rounded-xl">
                                <BadgeAlert className="h-5 w-5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                              <DialogHeader className="bg-orange-600 p-6 text-white">
                                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                  <AlertTriangle className="h-6 w-6" /> Forensic Adjustment
                                </DialogTitle>
                                <DialogDescription className="text-orange-100 text-xs">Register shrinkage or waste for <span className="font-bold text-white underline">{m.product_name}</span>.</DialogDescription>
                              </DialogHeader>
                              <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quantity to Deduct</Label>
                                  <Input type="number" placeholder="0.00" className="h-12 border-slate-200 font-bold text-xl" onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Adjustment Reason</Label>
                                  <Select onValueChange={v => setAdjustData({...adjustData, reason: v})}>
                                    <SelectTrigger className="h-12 border-slate-200 font-medium"><SelectValue placeholder="Select reason" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Waste">Production Waste / Scrap</SelectItem>
                                      <SelectItem value="Expired">Chemical/Batch Expiry</SelectItem>
                                      <SelectItem value="Spilled">Industrial Damage/Spillage</SelectItem>
                                      <SelectItem value="Theft">Unexplained Shrinkage</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
                                <Button onClick={() => logShrinkage.mutate()} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-orange-600/20">
                                  Authorize Inventory Deduction
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

      {/* SYSTEM STATUS FOOTER (Location & Unit Awareness) */}
      <div className="max-w-7xl mx-auto mt-12 flex items-center justify-between">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
             Registry Active: {businessName} | {profile?.currency} Reporting Protocol v10.4
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Enterprise Sync: Operational
             </span>
          </div>
      </div>
    </div>
  );
}