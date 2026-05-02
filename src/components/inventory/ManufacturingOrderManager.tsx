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
    <div className="min-h-screen bg-white p-6 md:p-12 space-y-12 animate-in fade-in duration-700">
      
      <header className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-100 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em]">
            <Activity size={16} /> Manufacturing Governance
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-slate-950">Production Management</h1>
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest leading-none">Industrial Control terminal</p>
        </div>
        
        <div className="flex items-center gap-4">
           <Button onClick={() => downloadReport('CSV')} variant="ghost" className="h-12 px-6 font-bold text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-900 transition-all">
             <Download size={16} className="mr-2" /> Export CSV
           </Button>
           <Button onClick={() => downloadReport('PDF')} variant="ghost" className="h-12 px-6 font-bold text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-900 transition-all">
             <FileDown size={16} className="mr-2" /> Audit PDF
           </Button>
           <Button onClick={() => setIsCreateModalOpen(true)} className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-200 rounded-2xl transition-all active:scale-95">
             <Plus size={18} className="mr-2" /> Initialize Lot
           </Button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto">
        <Card className="border-none shadow-[0_32px_64px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="px-12 py-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-10 bg-slate-50/20">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Operational Pipeline</CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time monitoring of active industrial nodes</CardDescription>
            </div>
            <div className="relative w-full md:w-[400px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Global search through registry..." 
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="h-14 pl-12 border-none bg-white rounded-2xl shadow-inner font-bold text-sm" 
                />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full whitespace-nowrap">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                  <TableRow className="h-16">
                    <TableHead className="w-20 text-center border-r border-slate-100">
                      <Checkbox checked={selectedItems.length === orders?.length} onCheckedChange={(c) => setSelectedItems(c ? orders?.map(o => o.id) || [] : [])} />
                    </TableHead>
                    <TableHead className="px-10 font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Lot Identifier</TableHead>
                    <TableHead className="font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Finished Good Specification</TableHead>
                    <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Planned Output</TableHead>
                    <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Process Status</TableHead>
                    <TableHead className="px-10 text-right font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">Authorization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.filter((o: any) => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map((o: any) => (
                    <TableRow key={o.id} className="h-24 hover:bg-slate-50/50 transition-all border-b border-slate-50">
                      <TableCell className="text-center border-r border-slate-50">
                        <Checkbox checked={selectedItems.includes(o.id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, o.id] : prev.filter(id => id !== o.id))} />
                      </TableCell>
                      <TableCell className="px-10 font-bold text-slate-900 uppercase tracking-tight">{o.batch_number || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm tracking-tight">{o.product_name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{o.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-sm tabular-nums">{o.planned_quantity.toLocaleString()} UNITS</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "font-bold uppercase text-[9px] px-4 py-1.5 rounded-full border-none shadow-sm",
                          o.status === 'completed' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                        )}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-10 text-right">
                        {o.status !== 'completed' ? (
                          <Button onClick={() => openAuditDialog(o)} className="h-10 px-6 bg-slate-900 hover:bg-black text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all">
                            Verify & Post
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2 text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                            <ShieldCheck size={16} className="text-emerald-500" /> Operational Record Sealed
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

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
          <div className="bg-slate-950 px-10 py-8 text-white">
            <DialogTitle className="text-xl font-bold uppercase tracking-widest">Initiate Production Lot</DialogTitle>
          </div>
          <div className="p-10 space-y-10">
            <div className="space-y-4">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Asset Selection</Label>
              <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                <SelectTrigger className="h-14 border-none bg-slate-50 rounded-2xl shadow-inner font-bold text-sm px-6">
                  <SelectValue placeholder="Identify target SKU..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {finishedGoods?.map((g: any) => <SelectItem key={g.id} value={g.id.toString()} className="font-bold py-4 px-6">{g.product?.name} — {g.sku}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-4">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reference ID</Label>
                  <Input value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-14 border-none bg-slate-50 font-black rounded-2xl shadow-inner text-center uppercase tracking-widest" />
               </div>
               <div className="space-y-4">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Yield</Label>
                  <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-14 border-none bg-slate-50 font-black rounded-2xl shadow-inner text-center text-blue-600 text-xl" />
               </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50/50 p-10 border-t border-slate-100 flex gap-6">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="h-14 px-8 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Discard</Button>
            <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-2xl transition-all uppercase tracking-widest text-[10px] flex-1">
              {createOrderMutation.isPending ? <Loader2 className="animate-spin" /> : "Authorize Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[1400px] h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] bg-white">
          <DialogHeader className="bg-white border-b border-slate-100 p-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12">
              <div className="flex items-center gap-8">
                <div className="h-20 w-20 bg-slate-950 rounded-3xl flex items-center justify-center shadow-2xl">
                   <ClipboardList className="text-white h-10 w-10" />
                </div>
                <div className="space-y-1">
                    <DialogTitle className="text-4xl font-bold text-slate-900 tracking-tighter">Operational Reconciliation</DialogTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Audit Lot:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-4 py-1.5 rounded-xl uppercase tracking-widest text-[10px]">{selectedOrder?.batch_number}</Badge>
                    </div>
                </div>
              </div>
              <div className="bg-slate-950 p-8 rounded-[2rem] text-right min-w-[280px] shadow-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Landed Unit Valuation</p>
                <p className="text-5xl font-black text-white mt-1 tabular-nums">
                  {financialAudit.unitCost.toLocaleString()} <span className="text-sm font-bold text-slate-500 uppercase ml-2">{currency}</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            <ScrollArea className="flex-1 bg-white">
              <div className="p-12 space-y-16">
                <div className="space-y-8">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" /> 1. Material Consumption Matrix
                  </h3>
                  <div className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden bg-white">
                    <ScrollArea className="w-full">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="h-16 border-none">
                          <TableHead className="text-[10px] font-black py-6 pl-10 uppercase tracking-widest text-slate-500">Material Specification</TableHead>
                          <TableHead className="text-[10px] font-black py-6 text-center uppercase tracking-widest text-slate-500">Actual Metric Consumption</TableHead>
                          <TableHead className="text-[10px] font-black py-6 text-right pr-10 uppercase tracking-widest text-slate-500">Inventory Cost Basis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredientLogs.map((log, idx) => (
                          <TableRow key={idx} className="h-20 hover:bg-slate-50/30 transition-all border-b border-slate-50 last:border-none">
                            <TableCell className="pl-10 font-bold text-slate-950 text-sm">{log.name}</TableCell>
                            <TableCell>
                              <Input type="number" step="0.001" value={log.actual_qty} onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }} className="h-12 w-40 mx-auto text-center border-none bg-slate-50 rounded-2xl font-black text-blue-600 shadow-inner text-lg" />
                            </TableCell>
                            <TableCell className="text-right pr-10 font-bold text-slate-400 text-sm tabular-nums">{log.unit_cost.toLocaleString()} {currency}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                </div>

                <div className="space-y-8">
                   <div className="flex justify-between items-center">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 flex items-center gap-4">
                      <div className="h-2 w-2 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]" /> 2. Operational Overheads
                    </h3>
                    <Button variant="ghost" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="h-12 border border-slate-200 text-slate-900 font-bold text-[10px] bg-white rounded-2xl px-8 transition-all hover:bg-slate-950 hover:text-white uppercase tracking-widest shadow-sm">
                      <Plus className="mr-3 h-4 w-4" /> Append Overhead
                    </Button>
                  </div>
                  <div className="space-y-6">
                    {expenses.map((exp, idx) => (
                      <div key={idx} className="flex gap-8 items-center bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all">
                        <div className="flex-1"><Input placeholder="Category Description (Labor, Power, Rent...)" value={exp.category} onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }} className="h-14 border-none bg-slate-50 font-bold text-slate-950 rounded-2xl shadow-inner px-8 text-sm" /></div>
                        <div className="w-72"><Input type="number" step="0.01" value={exp.amount} onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }} className="h-14 border-none bg-slate-50 text-right font-black text-rose-600 rounded-2xl shadow-inner px-8 text-xl" /></div>
                        <Button variant="ghost" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="h-14 w-14 rounded-2xl text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all"><Trash2 size={24} /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>

            <div className="w-full lg:w-[500px] bg-slate-50/50 border-l border-slate-100 p-16 flex flex-col justify-between">
              <div className="space-y-16">
                <div className="space-y-6">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] text-center block">Authorized Production Yield</Label>
                    <Input type="number" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="h-40 text-8xl font-black bg-white border-none text-center rounded-[3rem] shadow-2xl text-slate-950 tracking-tighter" />
                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4">Confirm Physical Node Quantity</p>
                </div>

                <div className="pt-12 border-t border-slate-200 space-y-8">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Material Consumption</span><span className="text-slate-950 text-sm">{financialAudit.matTotal.toLocaleString()} {currency}</span></div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Applied Overheads</span><span className="text-slate-950 text-sm">{financialAudit.expTotal.toLocaleString()} {currency}</span></div>
                  <div className="pt-10 border-t-2 border-slate-950 flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Lot Valuation</span>
                      <span className="text-5xl font-black text-slate-950 tracking-tighter tabular-nums mt-1">{financialAudit.total.toLocaleString()}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 mb-2 uppercase">{currency}</span>
                  </div>
                </div>
              </div>

              <Card className="bg-blue-600 rounded-[2.5rem] text-white shadow-2xl shadow-blue-600/30 p-10 space-y-4 border-none mt-12">
                  <div className="flex items-center gap-4"><Database size={20} className="text-blue-200" /><span className="text-[11px] font-bold uppercase tracking-widest">Inventory Orchestration</span></div>
                  <p className="text-xs text-blue-100 font-medium leading-relaxed uppercase tracking-tight">System will perform molecular-level deduction of components from raw ledger and increase finished good inventory node.</p>
              </Card>
            </div>
          </div>

          <DialogFooter className="bg-white border-t border-slate-100 p-12 flex flex-col sm:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-4 text-emerald-600 bg-emerald-50 px-8 py-3 rounded-full border border-emerald-100 font-bold text-[11px] uppercase tracking-widest">
                <CheckCircle2 size={18} /> Audit Integrity Protocol Active
            </div>
            <div className="flex gap-8 w-full sm:w-auto">
                <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="h-16 px-10 font-bold text-slate-400 hover:text-slate-950 text-[11px] uppercase tracking-widest transition-colors">Discard Draft</Button>
                <Button onClick={() => finalizeProductionMutation.mutate()} disabled={finalizeProductionMutation.isPending} className="h-16 px-16 bg-slate-950 hover:bg-black text-white font-bold rounded-[1.5rem] shadow-2xl transition-all uppercase tracking-widest text-[11px] flex items-center justify-center min-w-[320px] active:scale-[0.98]">
                    {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize Reconciliation Protocol"}
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="max-w-[1600px] mx-auto mt-24 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 pt-12 pb-20 opacity-30">
          <div className="flex items-center gap-8">
             <div className="flex items-center gap-3">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Industrial Protocol v4.2.0</span>
             </div>
             <div className="h-1 w-1 rounded-full bg-slate-400" />
             <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Autonomous Data Environment</span>
          </div>
          <div className="flex items-center gap-4 bg-white border border-slate-100 px-6 py-2.5 rounded-full shadow-sm">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">System Synchronized</span>
          </div>
      </footer>
    </div>
  );
}