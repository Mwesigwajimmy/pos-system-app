'use client';

import React, { useState, useMemo, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Factory, Beaker, CheckCircle2, Loader2, 
  TrendingUp, Wallet, PackagePlus, Trash2, Plus, 
  ClipboardList, ShieldCheck, Search, Download, FileText, X, Settings2,
  Layers, ChevronRight, BarChart3, Database, Activity, FileDown
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

export default function ManufacturingOrderManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<any[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().split('T')[0]);
  const [qcSupervisor, setQcSupervisor] = useState("");
  const [newOrder, setNewOrder] = useState({ variant_id: '', qty: 1, batch: '' });

  const { data: profile } = useQuery({
    queryKey: ['active_profile_mfg'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, currency').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const currency = profile?.currency || 'USD';

  const { data: orders, isLoading } = useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mfg_production_orders_view').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: finishedGoods } = useQuery({
    queryKey: ['mfg_products_targets'],
    queryFn: async () => {
      const { data } = await supabase.from('product_variants')
        .select('id, name, sku, product:products(name)')
        .eq('is_composite', true)
        .eq('is_active', true);
      return data || [];
    }
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ['raw_ledger_mfg'],
    queryFn: async () => {
      const { data } = await supabase.from('raw_material_registry').select('*');
      return data || [];
    }
  });

  useEffect(() => {
    if (isCreateModalOpen && !newOrder.batch) {
        const lotId = `LOT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        setNewOrder(prev => ({ ...prev, batch: lotId }));
    }
  }, [isCreateModalOpen, newOrder.batch]);

  const openAuditDialog = async (order: any) => {
    const { data: recipe } = await supabase.rpc('get_composite_details_v5', { p_variant_id: order.output_variant_id });
    if (recipe?.components) {
      setIngredientLogs(recipe.components.map((c: any) => ({
        variant_id: c.component_variant_id.toString(),
        name: c.component_name,
        actual_qty: c.quantity * order.planned_quantity,
        unit_cost: c.unit_cost || 0
      })));
    }
    setActualYield(order.planned_quantity);
    setExpenses([{ category: 'Personnel & Utilities', amount: 0 }]);
    setSelectedOrder(order);
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('mfg_production_orders').insert([{
        output_variant_id: parseInt(newOrder.variant_id),
        planned_quantity: newOrder.qty,
        batch_number: newOrder.batch.toUpperCase(),
        status: 'draft',
        business_id: profile?.business_id,
        tenant_id: profile?.business_id
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Industrial order initialized");
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    }
  });

  const finalizeProductionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      await supabase.from('mfg_production_ingredient_logs').insert(ingredientLogs.map(l => ({
          production_order_id: selectedOrder.id,
          ingredient_variant_id: l.variant_id,
          quantity_used: l.actual_qty,
          unit_cost_at_run: l.unit_cost,
          business_id: selectedOrder.business_id
      })));

      await supabase.from('mfg_production_expenses').insert(expenses.map(e => ({
          production_order_id: selectedOrder.id,
          expense_category: e.category,
          amount: e.amount,
          tenant_id: selectedOrder.business_id
      })));

      await supabase.from('mfg_production_orders').update({ actual_quantity_produced: actualYield }).eq('id', selectedOrder.id);
      const { error: syncErr } = await supabase.rpc('mfg_complete_production_v2', { p_order_id: selectedOrder.id });
      if (syncErr) throw syncErr;
    },
    onSuccess: () => {
      toast.success("Operational reconciliation successful");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(`Process Alert: ${e.message}`)
  });

  const downloadReport = (format: 'PDF' | 'CSV') => {
    if (format === 'CSV') {
        const headers = "Lot_ID,Product,Yield,Status,Material_Valuation,Overhead,Landed_Cost\n";
        const rows = orders?.map(o => `${o.batch_number},${o.product_name},${o.actual_quantity_produced},${o.status},${o.total_material_cost},${o.total_overhead_cost},${o.final_unit_cost}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Manufacturing_Ledger_${Date.now()}.csv`;
        link.click();
        return;
    }
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text("PRODUCTION VALUATION LEDGER", 14, 22);
    doc.setFontSize(10);
    doc.text(`Registry Context: ${profile?.business_name} | Date: ${new Date().toLocaleDateString()}`, 14, 30);
    (doc as any).autoTable({
        startY: 40,
        head: [['Lot ID', 'Target Product', 'Final Yield', 'Lifecycle Status', 'Unit Valuation']],
        body: orders?.map(o => [o.batch_number, o.product_name, `${o.actual_quantity_produced} units`, o.status.toUpperCase(), `${o.final_unit_cost.toLocaleString()} ${currency}`]),
        headStyles: { fillColor: [15, 23, 42] }
    });
    doc.save(`Production_Audit_${Date.now()}.pdf`);
  };

  const financialAudit = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-white"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      <header className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-[11px] uppercase tracking-wider">
            <Activity size={14} /> Manufacturing Governance
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">Production Management</h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Industrial Control terminal</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           <Button onClick={() => downloadReport('CSV')} variant="outline" className="h-10 px-4 font-bold text-slate-600 uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
             <Download size={14} className="mr-2" /> CSV
           </Button>
           <Button onClick={() => downloadReport('PDF')} variant="outline" className="h-10 px-4 font-bold text-slate-600 uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
             <FileDown size={14} className="mr-2" /> PDF
           </Button>
           <Button onClick={() => setIsCreateModalOpen(true)} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest shadow-md rounded-lg transition-all active:scale-95">
             <Plus size={16} className="mr-2" /> New Lot
           </Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto">
        <Card className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardHeader className="px-6 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
            <div className="space-y-0.5">
              <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Operational Pipeline</CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active industrial nodes registry</CardDescription>
            </div>
            <div className="relative w-full md:w-[350px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Filter by Lot or Product..." 
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="h-11 pl-11 border-slate-200 bg-white rounded-xl font-medium text-sm focus:ring-1 focus:ring-blue-500" 
                />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-12">
                    <TableHead className="w-16 text-center border-r border-slate-100">
                      <Checkbox checked={selectedItems.length === orders?.length} onCheckedChange={(c) => setSelectedItems(c ? orders?.map(o => o.id) || [] : [])} />
                    </TableHead>
                    <TableHead className="px-6 font-bold uppercase text-slate-500 text-[10px] tracking-wider">Lot ID</TableHead>
                    <TableHead className="font-bold uppercase text-slate-500 text-[10px] tracking-wider">Product / Specification</TableHead>
                    <TableHead className="text-center font-bold uppercase text-slate-500 text-[10px] tracking-wider">Target Output</TableHead>
                    <TableHead className="text-center font-bold uppercase text-slate-500 text-[10px] tracking-wider">Status</TableHead>
                    <TableHead className="px-6 text-right font-bold uppercase text-slate-500 text-[10px] tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.filter((o: any) => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map((o: any) => (
                    <TableRow key={o.id} className="h-16 hover:bg-slate-50/50 transition-all border-b last:border-none">
                      <TableCell className="text-center border-r border-slate-50">
                        <Checkbox checked={selectedItems.includes(o.id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, o.id] : prev.filter(id => id !== o.id))} />
                      </TableCell>
                      <TableCell className="px-6 font-bold text-slate-900 text-xs tracking-wide uppercase">{o.batch_number || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{o.product_name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{o.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-sm tabular-nums">{o.planned_quantity.toLocaleString()} UNITS</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "font-bold uppercase text-[8px] px-3 py-1 rounded-full border-none shadow-sm",
                          o.status === 'completed' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                        )}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        {o.status !== 'completed' ? (
                          <Button onClick={() => openAuditDialog(o)} className="h-9 px-4 bg-slate-900 hover:bg-black text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all">
                            Finalize Lot
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                            <ShieldCheck size={14} className="text-emerald-500" /> Record Sealed
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* CREATE LOT MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden border-none shadow-2xl bg-white">
          <div className="bg-slate-900 px-6 py-6 text-white">
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Initiate Production Lot</DialogTitle>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Asset Selection</Label>
              <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                <SelectTrigger className="h-11 border-slate-200 bg-white rounded-lg font-medium text-sm px-4">
                  <SelectValue placeholder="Identify target SKU..." />
                </SelectTrigger>
                <SelectContent>
                  {finishedGoods?.map((g: any) => <SelectItem key={g.id} value={g.id.toString()} className="text-xs font-medium py-2">{g.product?.name} — {g.sku}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Lot Ref</Label>
                  <Input value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-11 border-slate-200 bg-white font-bold rounded-lg text-center uppercase tracking-wider text-xs" />
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Planned Qty</Label>
                  <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-11 border-slate-200 bg-white font-bold rounded-lg text-center text-blue-600 text-lg" />
               </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="h-11 px-6 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Abort</Button>
            <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all uppercase tracking-widest text-[10px] flex-1">
              {createOrderMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Authorize Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RECONCILIATION MODAL - AUTO-WIDE VERSION */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[1500px] w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
          <DialogHeader className="bg-slate-50/50 border-b p-6 md:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center shadow-lg">
                   <ClipboardList className="text-white h-8 w-8" />
                </div>
                <div className="space-y-0.5">
                    <DialogTitle className="text-3xl font-bold text-slate-900 tracking-tight">Lot Reconciliation</DialogTitle>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Lot Identifier:</span>
                      <Badge className="bg-blue-600 text-white font-bold px-4 py-1 rounded-full text-[10px] uppercase tracking-wider">{selectedOrder?.batch_number}</Badge>
                    </div>
                </div>
              </div>
              <div className="bg-slate-900 p-6 rounded-2xl text-right min-w-[280px] shadow-sm border border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Final Landed Valuation / Unit</p>
                <p className="text-4xl font-black text-white mt-1 tabular-nums tracking-tighter">
                  {financialAudit.unitCost.toLocaleString()} <span className="text-xs font-bold text-slate-500 uppercase ml-1">{currency}</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Left Content Area - expanded to lg:col-span-9 for wide monitor visibility */}
            <ScrollArea className="lg:col-span-9 bg-white border-r border-slate-100 h-full">
              <div className="p-6 md:p-12 space-y-16">
                
                {/* section 1: MATERIALS MATRIX */}
                <div className="space-y-8">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-600" /> 1. Operational Material Consumption Matrix
                  </h3>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                    <ScrollArea className="w-full">
                      <Table className="min-w-[800px]"> {/* Forces room for labels */}
                        <TableHeader className="bg-slate-50">
                          <TableRow className="h-14 border-none">
                            <TableHead className="text-[10px] font-bold py-4 pl-8 uppercase tracking-widest text-slate-500">Resource Identification</TableHead>
                            <TableHead className="text-[10px] font-bold py-4 text-center uppercase tracking-widest text-slate-500">Authorized usage metric</TableHead>
                            <TableHead className="text-[10px] font-bold py-4 text-right pr-8 uppercase tracking-widest text-slate-500">Unit cost basis ({currency})</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ingredientLogs.map((log, idx) => (
                            <TableRow key={idx} className="h-16 hover:bg-slate-50 transition-all border-b last:border-none">
                              <TableCell className="pl-8 font-bold text-slate-800 text-sm whitespace-nowrap">{log.name}</TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  step="0.001" 
                                  value={log.actual_qty} 
                                  onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }} 
                                  className="h-10 w-40 mx-auto text-center border-slate-200 bg-slate-50/50 rounded-lg font-bold text-blue-600 text-base focus:bg-white" 
                                />
                              </TableCell>
                              <TableCell className="text-right pr-8 font-bold text-slate-400 text-sm tabular-nums">{log.unit_cost.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                </div>

                {/* section 2: OVERHEADS */}
                <div className="space-y-8">
                   <div className="flex justify-between items-center">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-rose-600" /> 2. Process Overheads & Expenses
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="h-10 border-slate-200 text-slate-700 font-bold text-[10px] bg-white rounded-xl px-6 transition-all hover:bg-slate-50 uppercase tracking-widest shadow-sm">
                      <Plus className="mr-2 h-4 w-4" /> Add Ledger Category
                    </Button>
                  </div>
                  <div className="space-y-5">
                    {expenses.map((exp, idx) => (
                      <div key={idx} className="flex gap-6 items-center bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-all group">
                        <div className="flex-1"><Input placeholder="Ledger Description (e.g., Facility Rent, Energy)" value={exp.category} onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }} className="h-12 border-slate-200 bg-white font-medium text-slate-900 rounded-xl px-5 text-sm" /></div>
                        <div className="w-64"><Input type="number" step="0.01" value={exp.amount} onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }} className="h-12 border-slate-200 bg-white text-right font-bold text-rose-600 rounded-xl px-5 text-lg" /></div>
                        <Button variant="ghost" size="icon" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="h-12 w-12 text-slate-200 group-hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl"><Trash2 size={22} /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Right Sidebar Area - LG:COL-SPAN-3 */}
            <div className="lg:col-span-3 bg-slate-50/50 p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-12">
                <div className="space-y-5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">Actual Production Yield</Label>
                    <div className="relative group">
                      <Input 
                        type="number" 
                        value={actualYield} 
                        onChange={e => setActualYield(Number(e.target.value))} 
                        className="h-32 text-6xl font-black bg-white border-slate-200 text-center rounded-3xl shadow-sm text-slate-950 tracking-tighter focus:ring-4 focus:ring-blue-500/5 transition-all" 
                      />
                      <div className="absolute inset-0 rounded-3xl pointer-events-none border-2 border-transparent group-focus-within:border-blue-500/20" />
                    </div>
                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Verify physical finished units</p>
                </div>

                <div className="pt-12 border-t border-slate-200 space-y-8">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Resources</span>
                    <span className="text-slate-900 font-bold text-sm">{financialAudit.matTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Ledger Overheads</span>
                    <span className="text-slate-900 font-bold text-sm">{financialAudit.expTotal.toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-10 border-t-2 border-slate-950 flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lot Cumulative Value</span>
                      <span className="text-4xl font-black text-slate-950 tracking-tighter tabular-nums mt-1">
                        {financialAudit.total.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase">{currency}</span>
                  </div>
                </div>
              </div>

              <Card className="bg-blue-600 rounded-3xl text-white shadow-xl p-8 space-y-4 border-none mt-12">
                  <div className="flex items-center gap-3"><Database size={18} className="text-blue-200" /><span className="text-[10px] font-bold uppercase tracking-widest">Ledger Sync Protocol</span></div>
                  <p className="text-[10px] text-blue-100 font-medium leading-relaxed uppercase tracking-tight">Post-audit will permanently deduct resource balances and increment the finished goods registry.</p>
              </Card>
            </div>
          </div>

          <DialogFooter className="bg-white border-t p-6 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4 text-emerald-600 bg-emerald-50 px-6 py-2.5 rounded-full border border-emerald-100 font-bold text-[10px] uppercase tracking-widest">
                <CheckCircle2 size={18} /> Protocol Integrity Verified
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
                <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="h-14 px-8 font-bold text-slate-400 hover:text-slate-950 text-[11px] uppercase tracking-widest transition-all">Discard Adjustment</Button>
                <Button 
                  onClick={() => finalizeProductionMutation.mutate()} 
                  disabled={finalizeProductionMutation.isPending} 
                  className="h-14 px-12 bg-slate-950 hover:bg-black text-white font-bold rounded-2xl shadow-2xl transition-all uppercase tracking-[0.1em] text-[11px] flex items-center justify-center min-w-[350px] active:scale-[0.98] border border-slate-800"
                >
                    {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize & Commit Reconciliation"}
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="max-w-[1400px] mx-auto mt-16 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 pt-8 pb-12 opacity-40">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <ShieldCheck size={14} />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Industrial Protocol v4.2.0</span>
             </div>
             <div className="h-1 w-1 rounded-full bg-slate-400" />
             <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Autonomous Data Environment</span>
          </div>
          <div className="flex items-center gap-3 bg-white border border-slate-100 px-5 py-2 rounded-full shadow-sm mt-4 md:mt-0">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">System Synchronized</span>
          </div>
      </footer>
    </div>
  );
}