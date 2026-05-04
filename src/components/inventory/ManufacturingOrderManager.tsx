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
  Layers, ChevronRight, BarChart3, Database, Activity, FileDown, Coins
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

export default function ManufacturingOrderManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Form States for Finalization
  const [expenses, setExpenses] = useState<any[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<any[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);
  
  const [newOrder, setNewOrder] = useState({ variant_id: '', qty: 1, batch: '' });

  // 1. DATA: Identity & Context
  const { data: profile } = useQuery({
    queryKey: ['active_profile_mfg'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, currency').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const currency = profile?.currency || 'UGX';

  // 2. DATA: Manufacturing Orders List
  const { data: orders, isLoading } = useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mfg_production_orders_view').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // 3. DATA: Finished Goods Recipes
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

  // Auto-generate Batch Number when modal opens
  useEffect(() => {
    if (isCreateModalOpen && !newOrder.batch) {
        const lotId = `BATCH-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        setNewOrder(prev => ({ ...prev, batch: lotId }));
    }
  }, [isCreateModalOpen, newOrder.batch]);

  // Load Recipe Data for Finalization
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
    setExpenses([{ category: 'Labour & Overheads', amount: 0 }]);
    setSelectedOrder(order);
  };

  // MUTATION: Create New Order
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
      toast.success("Production order started");
      setIsCreateModalOpen(false);
      setNewOrder({ variant_id: '', qty: 1, batch: '' });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    }
  });

  // MUTATION: Finalize Production & Update Stock
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
      toast.success("Production completed and stock updated");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`)
  });

  const downloadReport = (format: 'PDF' | 'CSV') => {
    if (format === 'CSV') {
        const headers = "Batch_No,Product,Yield,Status,Material_Cost,Expenses,Unit_Cost\n";
        const rows = orders?.map(o => `${o.batch_number},${o.product_name},${o.actual_quantity_produced},${o.status},${o.total_material_cost},${o.total_overhead_cost},${o.final_unit_cost}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Production_Ledger_${Date.now()}.csv`;
        link.click();
        return;
    }
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text("PRODUCTION COST REPORT", 14, 22);
    doc.setFontSize(10);
    doc.text(`Business: ${profile?.business_name} | Date: ${new Date().toLocaleDateString()}`, 14, 30);
    (doc as any).autoTable({
        startY: 40,
        head: [['Batch No.', 'Product Name', 'Final Yield', 'Status', 'Cost per Unit']],
        body: orders?.map(o => [o.batch_number, o.product_name, `${o.actual_quantity_produced} units`, o.status.toUpperCase(), `${o.final_unit_cost.toLocaleString()} ${currency}`]),
        headStyles: { fillColor: [15, 23, 42] }
    });
    doc.save(`Production_Report_${Date.now()}.pdf`);
  };

  const financialAudit = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-white"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-white">
      {/* THE FIX: Main centered container */}
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-8">
            <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-[11px] uppercase tracking-wider">
                    <Factory size={14} /> Production Tracking
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">Manufacturing & Batch Orders</h1>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Monitor production progress and costs</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => downloadReport('CSV')} variant="outline" className="h-11 px-5 font-bold text-slate-600 rounded-xl hover:bg-slate-50">
                    <Download size={16} className="mr-2" /> EXCEL
                </Button>
                <Button onClick={() => downloadReport('PDF')} variant="outline" className="h-11 px-5 font-bold text-slate-600 rounded-xl hover:bg-slate-50">
                    <FileDown size={16} className="mr-2" /> PDF
                </Button>
                <Button onClick={() => setIsCreateModalOpen(true)} className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">
                    <Plus size={20} className="mr-2" /> Start New Batch
                </Button>
            </div>
        </header>

        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="px-8 py-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">Active Production Pipeline</CardTitle>
              <CardDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">List of all scheduled and completed batches</CardDescription>
            </div>
            <div className="relative w-full md:w-[450px] group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                  placeholder="Search by Batch No. or Product..." 
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="h-14 pl-12 border-slate-200 bg-white rounded-2xl font-medium text-sm focus:ring-2 focus:ring-blue-600 transition-all shadow-inner" 
                />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-slate-50/80 backdrop-blur-sm border-b">
                  <TableRow className="h-14 border-none">
                    <TableHead className="w-20 text-center">
                      <Checkbox checked={selectedItems.length === orders?.length} onCheckedChange={(c) => setSelectedItems(c ? orders?.map(o => o.id) || [] : [])} />
                    </TableHead>
                    <TableHead className="px-6 font-bold uppercase text-slate-500 text-[11px] tracking-widest">Batch Number</TableHead>
                    <TableHead className="font-bold uppercase text-slate-500 text-[11px] tracking-widest">Product Information</TableHead>
                    <TableHead className="text-center font-bold uppercase text-slate-500 text-[11px] tracking-widest">Target Yield</TableHead>
                    <TableHead className="text-center font-bold uppercase text-slate-500 text-[11px] tracking-widest">Status</TableHead>
                    <TableHead className="px-8 text-right font-bold uppercase text-slate-500 text-[11px] tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.filter((o: any) => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map((o: any) => (
                    <TableRow key={o.id} className="h-20 hover:bg-slate-50/50 transition-colors border-b last:border-none">
                      <TableCell className="text-center">
                        <Checkbox checked={selectedItems.includes(o.id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, o.id] : prev.filter(id => id !== o.id))} />
                      </TableCell>
                      <TableCell className="px-6 font-bold text-slate-900 text-sm tracking-wide font-mono">{o.batch_number || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-[15px]">{o.product_name}</span>
                          <span className="text-[11px] font-bold text-slate-400 uppercase mt-1">SKU: {o.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-base tabular-nums">{o.planned_quantity.toLocaleString()} UNITS</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "font-bold uppercase text-[9px] px-4 py-1.5 rounded-full border-none shadow-sm",
                          o.status === 'completed' ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                        )}>
                          {o.status === 'completed' ? 'READY' : 'IN PROGRESS'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 text-right">
                        {o.status !== 'completed' ? (
                          <Button onClick={() => openAuditDialog(o)} className="h-10 px-6 bg-slate-900 hover:bg-black text-white font-bold text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-md">
                            Complete Production
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <ShieldCheck size={16} className="text-emerald-500" /> Stock Invoiced
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

        {/* --- MODAL: START PRODUCTION --- */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
                <div className="bg-slate-900 p-10 text-white text-center">
                    <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <PackagePlus size={32} />
                    </div>
                    <DialogTitle className="text-2xl font-bold uppercase tracking-tight">New Production Batch</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Enter details to initiate production</DialogDescription>
                </div>
                
                <div className="p-10 space-y-8">
                    <div className="space-y-2.5">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Finished Product to Produce</Label>
                        <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                            <SelectTrigger className="h-14 border-slate-200 bg-white rounded-2xl font-bold text-[15px] px-6 shadow-inner focus:ring-blue-600">
                                <SelectValue placeholder="Search product recipe..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl max-h-[300px]">
                                {finishedGoods?.map((g: any) => (
                                    <SelectItem key={g.id} value={g.id.toString()} className="text-sm font-bold py-4 px-6 border-b last:border-none">
                                        {g.product?.name} <span className="text-[10px] text-blue-500 ml-2">[{g.sku}]</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Batch Number</Label>
                            <Input value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-14 border-none bg-slate-50 font-bold rounded-2xl text-center uppercase tracking-widest text-sm shadow-inner" />
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Target Quantity</Label>
                            <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-14 border-none bg-slate-50 font-bold rounded-2xl text-center text-blue-600 text-xl shadow-inner" />
                        </div>
                    </div>

                    <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl transition-all uppercase tracking-widest text-sm">
                        {createOrderMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize Production"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* --- MODAL: FINALIZE PRODUCTION & RECONCILE --- */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent className="max-w-[1400px] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl rounded-[2.5rem] bg-white">
                
                {/* Header with summary stats */}
                <div className="bg-slate-50/80 backdrop-blur-sm border-b p-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-20 bg-slate-900 rounded-3xl flex items-center justify-center shadow-xl">
                            <ClipboardList className="text-white h-10 w-10" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-bold text-slate-900 tracking-tight">Finalize Batch Results</DialogTitle>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Batch:</span>
                                <Badge className="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-widest">{selectedOrder?.batch_number}</Badge>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-950 p-8 rounded-[2rem] text-right min-w-[320px] shadow-2xl border border-slate-800">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Estimated Cost per Item</p>
                        <p className="text-4xl font-black text-white mt-1 tabular-nums tracking-tighter italic">
                            {financialAudit.unitCost.toLocaleString()} <span className="text-sm font-bold text-slate-500 uppercase ml-1">{currency}</span>
                        </p>
                    </div>
                </div>

                {/* Main scrollable body split into sections */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                    
                    {/* Left Scrollable Form Area */}
                    <ScrollArea className="lg:col-span-8 bg-white border-r border-slate-100 h-full">
                        <div className="p-12 space-y-16">
                            
                            {/* Section 1: Materials */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                                        <div className="h-3 w-3 rounded-full bg-blue-600" /> 1. Raw Materials Consumed
                                    </h3>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold px-4 py-1.5 rounded-lg border-none uppercase text-[10px]">Auto-Calculated from Recipe</Badge>
                                </div>
                                
                                <div className="rounded-3xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-50 border-b">
                                            <TableRow className="h-14 border-none">
                                                <TableHead className="text-[11px] font-bold pl-8 uppercase tracking-widest text-slate-400">Material Name</TableHead>
                                                <TableHead className="text-[11px] font-bold text-center uppercase tracking-widest text-slate-400">Actual Quantity Used</TableHead>
                                                <TableHead className="text-[11px] font-bold text-right pr-8 uppercase tracking-widest text-slate-400">Unit Price ({currency})</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ingredientLogs.map((log, idx) => (
                                                <TableRow key={idx} className="h-16 hover:bg-slate-50/50 border-b last:border-none">
                                                    <TableCell className="pl-8 font-bold text-slate-800 text-[14px]">{log.name}</TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number" 
                                                            step="0.001" 
                                                            value={log.actual_qty} 
                                                            onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }} 
                                                            className="h-11 w-40 mx-auto text-center border-none bg-slate-50 font-bold text-blue-600 text-base rounded-xl focus:bg-white shadow-inner" 
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8 font-mono font-bold text-slate-400 tabular-nums">{log.unit_cost.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Section 2: Overheads */}
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                                        <div className="h-3 w-3 rounded-full bg-rose-600" /> 2. Production Overheads & Additional Expenses
                                    </h3>
                                    <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="h-11 border-slate-200 text-slate-600 font-bold text-[11px] bg-white rounded-xl px-6 transition-all hover:bg-slate-50 uppercase tracking-widest shadow-sm">
                                        <Plus className="mr-2 h-4 w-4" /> Add Expense Line
                                    </Button>
                                </div>
                                
                                <div className="space-y-4">
                                    {expenses.map((exp, idx) => (
                                        <div key={idx} className="flex gap-4 items-center bg-slate-50/30 p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-left-4 duration-300">
                                            <div className="flex-1">
                                                <Input 
                                                    placeholder="Reason (e.g., Daily Labour, Electricity, Transport)" 
                                                    value={exp.category} 
                                                    onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }} 
                                                    className="h-14 border-slate-200 bg-white font-semibold text-slate-900 rounded-xl px-6 text-[15px] shadow-sm" 
                                                />
                                            </div>
                                            <div className="w-64 relative group">
                                                <Input 
                                                    type="number" 
                                                    value={exp.amount} 
                                                    onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }} 
                                                    className="h-14 border-slate-200 bg-white text-right font-bold text-rose-600 rounded-xl px-6 text-xl pr-14 shadow-sm" 
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 uppercase">{currency}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="h-14 w-14 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl border border-transparent hover:border-red-100">
                                                <Trash2 size={24} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Right Fixed Summary/Action Sidebar */}
                    <div className="lg:col-span-4 bg-slate-50/50 p-10 flex flex-col gap-10">
                        <div className="space-y-4 bg-white p-10 rounded-[2rem] shadow-xl border border-slate-100">
                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center block mb-2">Physical Finished Quantity</Label>
                            <Input 
                                type="number" 
                                value={actualYield} 
                                onChange={e => setActualYield(Number(e.target.value))} 
                                className="h-32 text-7xl font-black bg-slate-50 border-none text-center rounded-3xl shadow-inner text-slate-950 tracking-tighter focus:ring-4 focus:ring-blue-600/10 transition-all" 
                            />
                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4">Actual units counted after production</p>
                        </div>

                        <div className="space-y-6 flex-1 px-4">
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-4">Cost Summary</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Material Cost</span>
                                <span className="text-slate-900 font-bold text-base tabular-nums">{financialAudit.matTotal.toLocaleString()} {currency}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overheads & Labour</span>
                                <span className="text-slate-900 font-bold text-base tabular-nums">{financialAudit.expTotal.toLocaleString()} {currency}</span>
                            </div>
                            <div className="pt-8 border-t-2 border-slate-900 flex justify-between items-baseline">
                                <span className="text-xs font-bold text-slate-950 uppercase tracking-[0.2em]">Total Batch Cost</span>
                                <span className="text-4xl font-black text-blue-600 tracking-tighter tabular-nums">
                                    {financialAudit.total.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-2xl space-y-4 mt-auto">
                            <div className="flex items-center gap-3"><Coins size={22} className="text-blue-200" /><span className="text-xs font-bold uppercase tracking-widest">Inventory Posting</span></div>
                            <p className="text-[11px] text-blue-50 font-medium leading-relaxed uppercase">Finishing this lot will automatically deduct your raw material stock and increase your finished product inventory.</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-white border-t p-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-4 text-emerald-600 bg-emerald-50 px-8 py-3 rounded-full border border-emerald-100 font-bold text-[11px] uppercase tracking-widest">
                        <CheckCircle2 size={20} /> Production Audit Complete
                    </div>
                    <div className="flex gap-6 w-full sm:w-auto">
                        <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="h-16 px-10 font-bold text-slate-400 hover:text-slate-950 text-xs uppercase tracking-widest transition-all">Cancel Adjustment</Button>
                        <Button 
                            onClick={() => finalizeProductionMutation.mutate()} 
                            disabled={finalizeProductionMutation.isPending} 
                            className="h-16 px-16 bg-slate-950 hover:bg-black text-white font-bold rounded-2xl shadow-2xl transition-all uppercase tracking-widest text-xs flex items-center justify-center min-w-[400px] active:scale-[0.98]"
                        >
                            {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize & Complete Production"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <footer className="mt-16 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 pt-8 pb-12 opacity-30">
            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold uppercase tracking-[0.4em]">
                <ShieldCheck size={14} />
                <span>Production Registry V4.2.0 • GADS Validated</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 md:mt-0">&copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE LTD</p>
        </footer>
      </div>
    </div>
  );
}