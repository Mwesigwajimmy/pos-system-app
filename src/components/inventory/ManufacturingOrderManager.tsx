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
  ClipboardList, ShieldCheck, Search, Download, FileText, X, Settings2,
  Layers, ChevronRight, BarChart3, Database
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

  useEffect(() => {
    if (isCreateModalOpen && !newOrder.batch) {
        const lotId = `BATCH-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
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
    setExpenses([{ category: 'Direct Labor & Utilities', amount: 0 }]);
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
      toast.success("Production batch initialized successfully");
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
      toast.success("Batch reconciliation complete. Inventory levels updated.");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(`Sync Failure: ${e.message}`)
  });

  const downloadReport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
        const headers = "BatchID,Product,Yield,Status,MaterialCost,Overhead,TotalCost\n";
        const rows = orders?.map(o => `${o.batch_number},${o.product_name},${o.actual_quantity_produced},${o.status},${o.total_material_cost},${o.total_overhead_cost},${o.final_unit_cost * o.actual_quantity_produced}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Production_Report_${Date.now()}.csv`;
        link.click();
        return;
    }
    const doc = new jsPDF();
    (doc as any).autoTable({
        startY: 20,
        head: [['Batch ID', 'Product Name', 'Yield', 'Status', 'Unit Cost']],
        body: orders?.map(o => [o.batch_number, o.product_name, o.actual_quantity_produced, o.status, `${o.final_unit_cost} ${currency}`]),
    });
    doc.save(`Production_Batch_Audit.pdf`);
  };

  const financialAudit = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-slate-400 h-8 w-8" /></div>;

  return (
    <div className="min-h-screen bg-[#f9fafb] p-8 md:p-12 font-sans selection:bg-blue-100">
      
      {/* HEADER SECTION - Styled after your reference image */}
      <div className="max-w-[1600px] mx-auto mb-10">
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Production Management</h1>
                <p className="text-slate-500 mt-2 text-sm max-w-xl">
                    Manage industrial production cycles, track raw material consumption, and audit batch overhead costs with precision.
                </p>
            </div>
            <div className="flex gap-3">
                <Button onClick={() => downloadReport('EXCEL')} variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm rounded-lg h-10 px-4 font-medium">
                    <Download className="mr-2 h-4 w-4" /> Export Data
                </Button>
                <Button onClick={() => setIsCreateModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 rounded-lg shadow-sm h-10">
                    <PackagePlus className="mr-2 h-4 w-4" /> New Production Batch
                </Button>
            </div>
         </div>
      </div>

      {/* MONITOR TABLE - High whitespace and clean lines */}
      <Card className="max-w-[1600px] mx-auto border-none shadow-[0_1px_3px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden bg-white">
        <CardHeader className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-50">
          <div className="flex items-center gap-4">
            <Layers className="text-slate-400 h-5 w-5" />
            <div>
                <CardTitle className="text-lg font-bold text-slate-800">Active Production Batches</CardTitle>
                <CardDescription className="text-xs">Real-time status of molecular asset transformation.</CardDescription>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Filter by Product, SKU or Batch ID..." 
                value={filter} 
                onChange={e => setFilter(e.target.value)} 
                className="pl-10 h-10 border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded-lg text-sm" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow>
                  <TableHead className="w-12 pl-8"><Checkbox checked={selectedItems.length === orders?.length} onCheckedChange={(c) => setSelectedItems(c ? orders?.map(o => o.id) || [] : [])} /></TableHead>
                  <TableHead className="text-xs font-bold uppercase text-slate-500 tracking-wider py-4">Batch ID</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-slate-500 tracking-wider py-4">Target Product</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-slate-500 tracking-wider py-4">Planned Yield</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-slate-500 tracking-wider py-4 text-center">Status</TableHead>
                  <TableHead className="text-right pr-8 text-xs font-bold uppercase text-slate-500 tracking-wider">Operations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.filter((o: any) => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map((o: any) => (
                  <TableRow key={o.id} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-none transition-colors">
                    <TableCell className="pl-8"><Checkbox checked={selectedItems.includes(o.id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, o.id] : prev.filter(id => id !== o.id))} /></TableCell>
                    <TableCell className="font-medium text-slate-600">{o.batch_number || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{o.product_name}</span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">{o.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">{o.planned_quantity.toLocaleString()} Units</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        "font-bold uppercase text-[10px] px-2.5 py-0.5 rounded-full",
                        o.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      {o.status !== 'completed' ? (
                        <Button onClick={() => openAuditDialog(o)} size="sm" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-4 rounded-lg text-xs shadow-sm">
                          Finalize Batch
                        </Button>
                      ) : (
                        <div className="text-slate-400 text-xs italic">Archived</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE BATCH MODAL - Clean, Focused Form */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 px-8 py-6 text-white">
            <DialogTitle className="text-xl font-bold tracking-tight">Initialize Production Batch</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">Select a composite product to begin the asset transformation cycle.</DialogDescription>
          </div>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target Finished Good</Label>
              <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                <SelectTrigger className="h-11 border-slate-200 rounded-lg shadow-sm"><SelectValue placeholder="Select Product SKU..." /></SelectTrigger>
                <SelectContent>
                  {finishedGoods?.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.product?.name} ({g.sku})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Batch ID (Internal)</Label>
                  <Input value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-11 border-slate-200 font-medium rounded-lg" />
               </div>
               <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Planned Quantity</Label>
                  <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-11 border-slate-200 font-semibold rounded-lg" />
               </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 flex gap-3">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="font-semibold text-slate-500">Cancel</Button>
            <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-lg shadow-lg shadow-blue-600/20">
              {createOrderMutation.isPending ? <Loader2 className="animate-spin" /> : "Release Production Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FINALIZATION DIALOG - Professional Wide Ledger View */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[1200px] h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="bg-white border-b border-slate-100 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                   <ClipboardList className="text-slate-600 h-7 w-7" />
                </div>
                <div>
                    <DialogTitle className="text-2xl font-bold text-slate-900">Batch Reconciliation & Finalization</DialogTitle>
                    <p className="text-sm font-medium text-slate-400 mt-0.5">Tracking Lot Identity: <span className="text-blue-600 font-bold">{selectedOrder?.batch_number}</span></p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-right min-w-[200px]">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Landed Cost Per Unit</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {financialAudit.unitCost.toLocaleString()} <span className="text-sm font-medium text-slate-400 uppercase ml-1">{currency}</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-[#fcfcfc]">
            <ScrollArea className="flex-1 p-8">
              <div className="space-y-10 max-w-4xl mx-auto">
                {/* INGREDIENT SECTION */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Beaker className="text-blue-500 h-4 w-4" /> 1. Component Consumption Log
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[11px] font-bold py-3 pl-6">Material Description</TableHead>
                          <TableHead className="text-[11px] font-bold py-3 text-center">Actual Consumption</TableHead>
                          <TableHead className="text-[11px] font-bold py-3 text-right pr-6">Cost Basis ({currency})</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredientLogs.map((log, idx) => (
                          <TableRow key={idx} className="h-16">
                            <TableCell className="pl-6 font-semibold text-slate-700">{log.name}</TableCell>
                            <TableCell>
                              <Input type="number" value={log.actual_qty} onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }} className="h-9 w-28 mx-auto text-center border-slate-200 font-bold text-blue-600 bg-slate-50/50" />
                            </TableCell>
                            <TableCell className="text-right pr-6 font-mono text-sm text-slate-500">{log.unit_cost.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* OVERHEAD SECTION */}
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Wallet className="text-orange-500 h-4 w-4" /> 2. Overhead Expense Ledger
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="h-9 border-slate-200 text-slate-600 font-bold text-xs bg-white rounded-lg">
                      <Plus className="mr-2 h-3.5 w-3.5" /> Add Expense
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {expenses.map((exp, idx) => (
                      <div key={idx} className="flex gap-4 items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                        <div className="flex-1"><Input placeholder="Expense Type (e.g. Electricity, Labor)" value={exp.category} onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }} className="h-10 border-slate-200 text-sm font-medium" /></div>
                        <div className="w-48"><Input type="number" value={exp.amount} onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }} className="h-10 text-right border-slate-200 font-bold text-orange-600" /></div>
                        <Button variant="ghost" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 size={18} /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* SIDEBAR SUMMARY */}
            <div className="w-full lg:w-[400px] bg-slate-50 border-l border-slate-200 p-8 flex flex-col">
              <div className="flex-1 space-y-10">
                <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center block">Actual Production Yield</Label>
                    <Input type="number" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="h-24 text-6xl font-bold bg-white border-slate-200 text-center rounded-2xl shadow-inner text-slate-900 tracking-tighter" />
                    <p className="text-[10px] text-center text-slate-400 italic">Verify physical count before final reconciliation.</p>
                </div>

                <div className="pt-8 border-t border-slate-200 space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400"><span>Component Value</span><span className="text-slate-700">{financialAudit.matTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400"><span>Overhead Applied</span><span className="text-slate-700">{financialAudit.expTotal.toLocaleString()}</span></div>
                  <div className="pt-6 border-t border-slate-900 flex justify-between items-end">
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Batch Valuation</span><span className="text-2xl font-bold text-slate-900">{financialAudit.total.toLocaleString()}</span></div>
                    <span className="text-sm font-bold text-slate-400 mb-1">{currency}</span>
                  </div>
                </div>

                <Card className="bg-slate-900 text-white border-none shadow-xl rounded-xl overflow-hidden mt-8">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-blue-400"><Database size={16} /><span className="text-[10px] font-bold uppercase tracking-widest">Inventory Ledger Sync</span></div>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">Completing this run will deduct ingredients from the raw ledger and increase finished good inventory by <span className="text-white font-bold">{actualYield} units</span>.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white border-t border-slate-100 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-slate-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Audit trail ready for synchronization</span>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
                <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="font-bold text-slate-400 hover:text-red-500 text-xs px-6 uppercase tracking-wider">Discard Draft</Button>
                <Button onClick={() => finalizeProductionMutation.mutate()} disabled={finalizeProductionMutation.isPending} className="bg-slate-900 hover:bg-slate-800 text-white h-12 px-10 font-bold rounded-lg shadow-xl flex-1 sm:flex-none uppercase tracking-widest text-xs transition-transform active:scale-95">
                    {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : "Authorize Reconciliation"}
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FOOTER */}
      <footer className="max-w-[1600px] mx-auto mt-12 flex items-center justify-between border-t border-slate-200 pt-8 pb-12">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Manufacturing System Online | Node Status: Active
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Powered by Enterprise Manufacturing Hub v4.2
          </div>
      </footer>
    </div>
  );
}