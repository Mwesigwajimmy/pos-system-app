'use client';

import React, { useState, useMemo, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// --- UI COMPONENTS ---
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Factory, Beaker, CheckCircle2, Loader2, 
  TrendingUp, Wallet, PackagePlus, Trash2, Plus, 
  ClipboardList, ShieldCheck, Search, Download, FileText, X, Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

export default function ManufacturingOrderManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Industrial Form States
  const [expenses, setExpenses] = useState<any[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<any[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().split('T')[0]);
  const [qcSupervisor, setQcSupervisor] = useState("");
  
  const [newOrder, setNewOrder] = useState({ variant_id: '', qty: 1, batch: '' });

  // --- 1. SECTOR IDENTITY & DATA ---
  const { data: profile } = useQuery({
    queryKey: ['active_profile_mfg'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, currency').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const currency = profile?.currency || 'UGX';

  const { data: orders, isLoading } = useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      // Pull from the repaired Product Name View
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

  // --- 2. CORE INDUSTRIAL LOGIC ---

  // Auto Batch Identity DNA
  useEffect(() => {
    if (isCreateModalOpen && !newOrder.batch) {
        const lotId = `LOT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        setNewOrder(prev => ({ ...prev, batch: lotId }));
    }
  }, [isCreateModalOpen]);

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
    setExpenses([{ category: 'Machine Maintenance / Labor', amount: 0 }]);
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
      toast.success("Industrial batch initiated");
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    }
  });

  const finalizeProductionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      // 1. Record Atomic Logs
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

      // 2. TRIGGER THE WELD: Move assets and seal ledger
      await supabase.from('mfg_production_orders').update({ actual_quantity_produced: actualYield }).eq('id', selectedOrder.id);
      const { error: syncErr } = await supabase.rpc('mfg_complete_production_v2', { p_order_id: selectedOrder.id });
      if (syncErr) throw syncErr;
    },
    onSuccess: () => {
      toast.success("Asset conversion complete. POS Stock Updated.");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(`Sync Failure: ${e.message}`)
  });

  const downloadReport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
        const headers = "LotID,Output,Yield,Status,MaterialCost,Overhead,TotalCost\n";
        const rows = orders?.map(o => `${o.batch_number},${o.product_name},${o.actual_quantity_produced},${o.status},${o.total_material_cost},${o.total_overhead_cost},${o.final_unit_cost * o.actual_quantity_produced}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Production_Audit_${Date.now()}.csv`;
        link.click();
        return;
    }
    const doc = new jsPDF();
    (doc as any).autoTable({
        startY: 20,
        head: [['Batch Lot', 'Good Name', 'Yield', 'Status', 'Unit Value']],
        body: orders?.map(o => [o.batch_number, o.product_name, o.actual_quantity_produced, o.status, `${o.final_unit_cost} ${currency}`]),
    });
    doc.save(`Industrial_Batch_Audit.pdf`);
  };

  const financialAudit = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans animate-in fade-in duration-700">
      
      {/* HEADER ACTION BAR */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
            <Factory className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 tracking-tighter">Production Hub</h1>
            <div className="flex items-center gap-2 mt-1">
               <ShieldCheck size={14} className="text-emerald-500" /> 
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Sector Node: Operational</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
             <Button onClick={() => downloadReport('EXCEL')} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold h-11 px-6 rounded-xl">
               <Download className="mr-2 h-4 w-4" /> Export CSV
             </Button>
             <Button onClick={() => setIsCreateModalOpen(true)} className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-xl shadow-2xl transition-all uppercase tracking-widest text-[10px]">
               <PackagePlus className="mr-2 h-5 w-5" /> Initiate industrial run
             </Button>
        </div>
      </div>

      {/* MONITOR TABLE */}
      <Card className="max-w-7xl mx-auto border-slate-200 shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Active Sector Runs</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-400">Atomic asset transformation and forensic batch tracking.</CardDescription>
          </div>
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <Input placeholder="Search Batch Lot SKU..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold rounded-xl shadow-inner" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="w-12 px-6"><Checkbox checked={selectedItems.length === orders?.length} onCheckedChange={(c) => setSelectedItems(c ? orders?.map(o => o.id) || [] : [])} /></TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 tracking-widest">Lot Identity</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 tracking-widest">Molecular Output</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 tracking-widest">Yield Target</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 text-center tracking-widest">Status</TableHead>
                  <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.filter((o: any) => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map((o: any) => (
                  <TableRow key={o.id} className="hover:bg-slate-50/50 transition-all h-20 border-b border-slate-50 last:border-none group">
                    <TableCell className="px-6"><Checkbox checked={selectedItems.includes(o.id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, o.id] : prev.filter(id => id !== o.id))} /></TableCell>
                    <TableCell className="font-mono font-black text-blue-600 text-sm">{o.batch_number || 'LOT-N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm tracking-tight">{o.product_name}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{o.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-slate-700 text-sm">{o.planned_quantity.toLocaleString()} Units</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "font-black uppercase text-[9px] px-3 py-1 rounded-lg border shadow-none",
                        o.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"
                      )}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      {o.status !== 'completed' && (
                        <Button onClick={() => openAuditDialog(o)} size="sm" className="bg-slate-900 hover:bg-blue-700 font-black px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all">
                          Finalize
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* INITIATE RUN MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Authorize industrial Run</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium text-xs mt-2 uppercase tracking-[0.3em]">Weld molecular assets into inventory.</DialogDescription>
          </div>
          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Finished Good Target</Label>
              <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm"><SelectValue placeholder="Select Product SKU" /></SelectTrigger>
                <SelectContent className="rounded-2xl shadow-2xl">
                  {finishedGoods?.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.product?.name} ({g.name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Batch ID (Auto)</Label>
                  <Input value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-12 border-slate-200 font-black uppercase rounded-2xl shadow-sm" />
               </div>
               <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Yield</Label>
                  <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-12 border-slate-200 font-black text-blue-600 rounded-2xl shadow-sm" />
               </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-8 border-t border-slate-100 flex gap-4">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Discard</Button>
            <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 rounded-[1.5rem] shadow-2xl shadow-blue-600/30 uppercase tracking-[0.2em] text-xs">
              {createOrderMutation.isPending ? <Loader2 className="animate-spin" /> : "Initiate Weld"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FINALIZATION DIALOG (Forensic) */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-[0_48px_96px_-24px_rgba(0,0,0,0.3)] rounded-[3rem]">
          <DialogHeader className="bg-slate-900 text-white p-10">
            <div className="flex flex-col md:flex-row justify-between gap-10">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl">
                   <ClipboardList className="text-white h-10 w-10" />
                </div>
                <div>
                    <DialogTitle className="text-3xl font-black uppercase tracking-tight">Molecular Asset conversion</DialogTitle>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic">Lot Identification: {selectedOrder?.batch_number}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Landed Unit cost</p>
                <p className="text-6xl font-black text-emerald-400 tracking-tighter mt-2">
                  {financialAudit.unitCost.toLocaleString()} <span className="text-sm font-bold opacity-30">{currency}</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white">
            <ScrollArea className="flex-1 p-12">
              <div className="space-y-14">
                <div className="space-y-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-4"><Beaker className="text-blue-600 h-6 w-6" /> 1. Input Absorption</h3>
                  <div className="rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl p-2 bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-none">
                          <TableHead className="text-[9px] font-black uppercase py-5 pl-10 tracking-[0.3em] text-slate-400">Chemical Identity</TableHead>
                          <TableHead className="text-[9px] font-black uppercase py-5 text-center tracking-[0.3em] text-slate-400">Volume Burn</TableHead>
                          <TableHead className="text-[9px] font-black uppercase py-4 text-right pr-10 tracking-[0.3em] text-slate-400">At-Run Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredientLogs.map((log, idx) => (
                          <TableRow key={idx} className="h-24 border-b border-slate-50 last:border-none group">
                            <TableCell className="pl-10 font-black text-slate-900 text-base">{log.name}</TableCell>
                            <TableCell>
                              <Input type="number" value={log.actual_qty} onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }} className="h-12 w-32 mx-auto font-black text-center border-slate-200 bg-slate-50 rounded-2xl text-blue-600 text-lg shadow-inner" />
                            </TableCell>
                            <TableCell className="text-right pr-10 font-mono font-black text-slate-500">{log.unit_cost.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="space-y-8 pb-16">
                   <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-4"><Wallet className="text-orange-500 h-6 w-6" /> 2. Overhead Ledgers</h3>
                    <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="h-11 px-6 font-black border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-100 rounded-2xl transition-all text-[9px]">
                      <Plus className="mr-2 h-4 w-4" /> Add Overhead Ledger
                    </Button>
                  </div>
                  <div className="space-y-5">
                    {expenses.map((exp, idx) => (
                      <div key={idx} className="flex gap-8 items-center bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-lg transition-all hover:shadow-2xl">
                        <div className="flex-1"><Input placeholder="Expense Classification" value={exp.category} onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }} className="h-12 font-black border-slate-200 bg-slate-50 focus:bg-white rounded-2xl text-sm shadow-inner" /></div>
                        <div className="w-56"><Input type="number" value={exp.amount} onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }} className="h-12 font-black text-right border-slate-200 bg-slate-50 focus:bg-white rounded-2xl text-lg text-orange-600 shadow-inner" /></div>
                        <Button variant="ghost" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="mt-1 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={24} /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="w-full lg:w-[480px] bg-slate-50 border-l border-slate-100 p-12 flex flex-col justify-between">
              <div className="space-y-14">
                <div className="space-y-6 text-center px-4">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">verified industrial yield</Label>
                    <Input type="number" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="h-28 text-7xl font-black bg-white border-slate-100 text-center rounded-[3rem] shadow-2xl text-slate-900 tracking-tighter" />
                </div>
                <div className="pt-12 border-t-2 border-dashed border-slate-200 space-y-8">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]"><span>Inflow Value</span><span className="text-slate-900">{financialAudit.matTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]"><span>Overhead Absorption</span><span className="text-slate-900">{financialAudit.expTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between items-center text-3xl font-black text-slate-900 pt-10 border-t-4 border-slate-900">
                    <span className="uppercase tracking-tight text-sm text-slate-400">Batch valuation</span>
                    <span className="text-blue-600">{financialAudit.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="pt-16">
                <Card className="bg-slate-900 text-white border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] rounded-[2.5rem] overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform duration-700 group-hover:rotate-[360deg]"><Settings2 size={120} /></div>
                  <CardContent className="p-10 relative z-10 space-y-6">
                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.5em]">Forensic Analytics</p>
                    <div><p className="text-xs text-slate-400 font-medium tracking-tight italic opacity-60">Landed cost per unit:</p><p className="text-5xl font-black tracking-tighter text-white mt-4">{financialAudit.unitCost.toLocaleString()}</p></div>
                    <div className="flex items-center gap-4 text-[9px] font-black uppercase text-emerald-400 pt-6 tracking-[0.2em]"><TrendingUp size={18} className="animate-bounce" /> <span>Precision Cost Lock Verified</span></div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          <DialogFooter className="bg-white border-t border-slate-100 p-12 flex flex-col sm:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-6"><div className="h-16 w-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center border-2 border-emerald-100 shadow-inner"><CheckCircle2 className="text-emerald-600 h-10 w-10" /></div><div><p className="text-base font-black uppercase tracking-tight text-slate-900">Execute asset transformation</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Atomic Ledger Sync Authorized</p></div></div>
            <div className="flex gap-6 w-full sm:w-auto"><Button variant="ghost" onClick={() => setSelectedOrder(null)} className="font-black text-slate-300 hover:text-red-500 h-16 px-10 uppercase tracking-[0.4em] text-[10px]">Abort Run</Button><Button onClick={() => finalizeProductionMutation.mutate()} disabled={finalizeProductionMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white h-16 px-16 font-black shadow-2xl shadow-blue-600/30 rounded-3xl flex-1 sm:flex-none uppercase tracking-[0.3em] text-xs transition-all hover:scale-105 active:scale-95">{finalizeProductionMutation.isPending ? <Loader2 className="animate-spin h-8 w-8" /> : "Authorize Ledger Weld"}</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto mt-20 flex items-center justify-end pb-12">
          <div className="flex items-center gap-4 px-8 py-4 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm transition-all hover:shadow-xl group">
             <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse group-hover:scale-150 transition-transform shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
             <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Molecular Ledger Sync: Operational</span>
          </div>
      </footer>
    </div>
  );
}