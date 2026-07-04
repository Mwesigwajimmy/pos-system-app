'use client';

/**
 * --- MANUFACTURING & PRODUCTION MANAGER ---
 * VERSION: v5.1 ENTERPRISE (LAYOUT FIXED)
 * Use: Professional batch tracking, cost analysis, and stock reconciliation.
 */

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
      const { data } = await supabase.from('profiles').select('*, business_name, currency').eq('id', user?.id).limit(1).single();
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

  // Auto-generate Batch Number
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

  // MUTATION: Finalize Production
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
      toast.success("Production finalized and stock updated");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`)
  });

  // --- REAL PDF DOWNLOAD ENGINE ---
  const downloadReport = (formatType: 'PDF' | 'CSV') => {
    if (!orders || orders.length === 0) return toast.error("No data available to export.");

    if (formatType === 'CSV') {
        const headers = "Batch_No,Product,Yield,Status,Material_Cost,Expenses,Unit_Cost\n";
        const rows = orders.map(o => `${o.batch_number},${o.product_name},${o.actual_quantity_produced},${o.status},${o.total_material_cost},${o.total_overhead_cost},${o.final_unit_cost}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Production_Ledger_${Date.now()}.csv`;
        link.click();
        return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("PRODUCTION SUMMARY REPORT", 14, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Organization: ${profile?.business_name || 'Business Unit'}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

    const autoTable = (doc as any).autoTable;
    autoTable(doc, {
        startY: 45,
        head: [['BATCH NO.', 'PRODUCT NAME', 'QTY PRODUCED', 'STATUS', 'UNIT COST']],
        body: orders.map(o => [
            o.batch_number || 'N/A', 
            o.product_name, 
            `${o.actual_quantity_produced || 0} units`, 
            o.status.toUpperCase(), 
            `${o.final_unit_cost.toLocaleString()} ${currency}`
        ]),
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`Production_Report_${Date.now()}.pdf`);
  };

  const costSummary = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Production Registry...</p></div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-slate-100 pb-10">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em]">
                    <Factory size={16} /> Production Control
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manufacturing Orders</h1>
                <p className="text-sm font-medium text-slate-500">Manage real-time production runs, material consumption, and batch costs.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
                <Button onClick={() => downloadReport('CSV')} variant="outline" className="h-11 px-5 font-bold text-slate-600 rounded-xl border-slate-200 hover:bg-slate-50 transition-colors">
                    <FileText size={16} className="mr-2" /> EXCEL
                </Button>
                <Button onClick={() => downloadReport('PDF')} variant="outline" className="h-11 px-5 font-bold text-slate-600 rounded-xl border-slate-200 hover:bg-slate-50 transition-colors">
                    <Download size={16} className="mr-2" /> PDF
                </Button>
                <Button onClick={() => setIsCreateModalOpen(true)} className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95">
                    <Plus size={18} className="mr-2" /> Start New Batch
                </Button>
            </div>
        </header>

        {/* MAIN DATA TABLE CARD */}
        <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="px-8 py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/40">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-slate-900">Production Schedule</CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scheduled and completed manufacturing activities</CardDescription>
            </div>
            <div className="relative w-full md:w-[400px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Filter by Batch or Product..." 
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="h-11 pl-11 border-slate-200 bg-white rounded-xl text-sm focus:ring-blue-600 shadow-sm" 
                />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-14 border-none">
                    <TableHead className="w-16 text-center">
                      <Checkbox checked={selectedItems.length === orders?.length} onCheckedChange={(c) => setSelectedItems(c ? orders?.map(o => o.id) || [] : [])} />
                    </TableHead>
                    <TableHead className="px-6 font-bold uppercase text-slate-500 text-[10px] tracking-widest">Batch Number</TableHead>
                    <TableHead className="font-bold uppercase text-slate-500 text-[10px] tracking-widest">Product Information</TableHead>
                    <TableHead className="text-center font-bold uppercase text-slate-500 text-[10px] tracking-widest">Target Yield</TableHead>
                    <TableHead className="text-center font-bold uppercase text-slate-500 text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="px-8 text-right font-bold uppercase text-slate-500 text-[10px] tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.filter((o: any) => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map((o: any) => (
                    <TableRow key={o.id} className="h-20 hover:bg-slate-50/50 transition-colors border-b last:border-none">
                      <TableCell className="text-center">
                        <Checkbox checked={selectedItems.includes(o.id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, o.id] : prev.filter(id => id !== o.id))} />
                      </TableCell>
                      <TableCell className="px-6 font-bold text-slate-900 text-xs font-mono">{o.batch_number || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{o.product_name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5 tracking-wider">SKU: {o.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-sm tabular-nums">{o.planned_quantity.toLocaleString()} UNITS</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={cn(
                          "font-bold uppercase text-[9px] px-3 py-1 rounded-md border-none shadow-sm",
                          o.status === 'completed' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                        )}>
                          {o.status === 'completed' ? 'Finalized' : 'Active Run'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 text-right">
                        {o.status !== 'completed' ? (
                          <Button onClick={() => openAuditDialog(o)} className="h-9 px-5 bg-slate-900 hover:bg-black text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95">
                            Finalize Batch
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <ShieldCheck size={14} className="text-emerald-500" /> Stock Invoiced
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

        {/* MODAL: START PRODUCTION */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl bg-white">
                <div className="p-10 text-center border-b border-slate-100">
                    <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 border border-blue-100 shadow-sm">
                        <PackagePlus size={32} />
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900">New Production Run</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wider">Define the parameters for this batch</DialogDescription>
                </div>
                
                <div className="p-10 space-y-6">
                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Product Recipe</Label>
                        <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                            <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 rounded-xl font-bold text-sm px-5">
                                <SelectValue placeholder="Search recipe catalog..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-2xl max-h-[300px]">
                                {finishedGoods?.map((g: any) => (
                                    <SelectItem key={g.id} value={g.id.toString()} className="text-xs font-bold py-3 border-b last:border-none">
                                        {g.product?.name} <span className="text-slate-400 ml-2">[{g.sku}]</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Batch ID</Label>
                            <Input value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-12 border-slate-200 bg-white font-bold rounded-xl text-center uppercase text-xs" />
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Target Yield</Label>
                            <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-12 border-slate-200 bg-white font-bold rounded-xl text-center text-blue-600 text-sm" />
                        </div>
                    </div>

                    <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all uppercase tracking-widest text-xs active:scale-[0.98]">
                        {createOrderMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirm & Initiate"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* --- ULTRA-WIDE MODAL: FINALIZE & RECONCILE (FIXED CSS) --- */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent className="max-w-[1550px] w-[98vw] max-h-[96vh] h-[96vh] flex flex-col p-0 overflow-hidden border border-slate-200 shadow-3xl rounded-[2.5rem] bg-white">
                
                {/* WIDE HEADER - FIXED TOP */}
                <div className="shrink-0 bg-slate-50/60 backdrop-blur-md border-b border-slate-100 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 text-slate-900">
                            <ClipboardList size={24} />
                        </div>
                        <div className="space-y-0.5">
                            <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Finalize Batch Statistics</DialogTitle>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Lot ID:</span>
                                <Badge variant="outline" className="border-blue-100 text-blue-600 font-bold px-3 py-1 rounded-lg text-[10px] uppercase tracking-tight">{selectedOrder?.batch_number}</Badge>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white px-8 py-4 rounded-2xl text-right min-w-[280px] shadow-sm border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Calculated Item Unit Cost</p>
                        <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tighter">
                            {costSummary.unitCost.toLocaleString()} <span className="text-xs text-slate-300 font-medium ml-1">{currency}</span>
                        </p>
                    </div>
                </div>

                {/* CONTENT AREA - FLEX GROW WITH INTERNAL SCROLLING */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-white">
                    
                    {/* LEFT AREA: Data Input */}
                    <div className="lg:col-span-8 h-full flex flex-col border-r border-slate-100">
                        <ScrollArea className="flex-1">
                            <div className="p-8 md:p-12 space-y-12">
                                
                                {/* 1. Materials Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                                            <div className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-sm" /> 1. Material Consumption Ledger
                                        </h3>
                                        <Badge className="bg-slate-50 text-slate-400 font-bold px-3 py-1 rounded-lg border-none uppercase text-[9px]">Verified Recipe Path</Badge>
                                    </div>
                                    
                                    <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50">
                                                <TableRow className="h-12">
                                                    <TableHead className="text-[10px] font-bold pl-8 uppercase tracking-widest text-slate-400">Material specification</TableHead>
                                                    <TableHead className="text-[10px] font-bold text-center uppercase tracking-widest text-slate-400">Actual units used</TableHead>
                                                    <TableHead className="text-[10px] font-bold text-right pr-8 uppercase tracking-widest text-slate-400">Unit Rate ({currency})</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {ingredientLogs.map((log, idx) => (
                                                    <TableRow key={idx} className="h-16 hover:bg-slate-50/30 transition-colors border-b last:border-none">
                                                        <TableCell className="pl-8 font-bold text-slate-700 text-sm">{log.name}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Input 
                                                                type="number" 
                                                                step="0.001" 
                                                                value={log.actual_qty} 
                                                                onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }} 
                                                                className="h-10 w-36 mx-auto text-center border-slate-200 bg-slate-50/50 font-bold text-blue-600 rounded-xl focus:bg-white shadow-inner" 
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right pr-8 font-mono font-bold text-slate-400 text-xs tabular-nums">{log.unit_cost.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* 2. Overheads Section */}
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center px-2">
                                        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                                            <div className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm" /> 2. Overheads & External Expenses
                                        </h3>
                                        <Button variant="ghost" size="sm" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="h-8 text-blue-600 font-bold text-[10px] uppercase tracking-wider hover:bg-blue-50 px-4 rounded-lg transition-all">
                                            <Plus className="mr-1.5 h-3 w-3" /> Add Expense Line
                                        </Button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {expenses.map((exp, idx) => (
                                            <div key={idx} className="flex gap-4 items-center bg-slate-50/30 p-3 rounded-xl border border-slate-100 transition-all hover:border-slate-200">
                                                <div className="flex-1">
                                                    <Input 
                                                        placeholder="Reason (Labour, Logistics...)" 
                                                        value={exp.category} 
                                                        onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }} 
                                                        className="h-11 border-slate-200 bg-white font-medium text-slate-800 rounded-xl px-4 text-xs" 
                                                    />
                                                </div>
                                                <div className="w-56 relative">
                                                    <Input 
                                                        type="number" 
                                                        value={exp.amount} 
                                                        onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }} 
                                                        className="h-11 border-slate-200 bg-white text-right font-bold text-slate-900 rounded-xl text-sm pr-12" 
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 uppercase">{currency}</span>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="h-10 w-10 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT AREA: Summary & Finalization (FIXED SIDEBAR) */}
                    <div className="lg:col-span-4 bg-slate-50/20 p-8 flex flex-col justify-between border-l border-slate-50 h-full overflow-hidden">
                        <div className="space-y-8">
                            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200/50 text-center space-y-4">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Actual Finished Yield</Label>
                                <div className="relative">
                                    <Input 
                                        type="number" 
                                        value={actualYield} 
                                        onChange={e => setActualYield(Number(e.target.value))} 
                                        className="h-24 text-6xl font-black border-none text-center bg-slate-50/50 rounded-2xl text-slate-900 tabular-nums shadow-inner focus-visible:ring-0" 
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Post-production inventory count</p>
                            </div>

                            <div className="space-y-6 px-4 py-2">
                                <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-300 border-b border-slate-100 pb-3">Operational Financials</h4>
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-slate-400 uppercase tracking-widest text-[10px]">Material Pool</span>
                                    <span className="font-bold text-slate-900">{costSummary.matTotal.toLocaleString()} {currency}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-slate-400 uppercase tracking-widest text-[10px]">Overhead Pool</span>
                                    <span className="font-bold text-slate-900">{costSummary.expTotal.toLocaleString()} {currency}</span>
                                </div>
                                <div className="pt-8 mt-4 border-t-2 border-slate-100 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2">Aggregate Valuation</span>
                                    <span className="text-5xl font-black text-blue-600 tabular-nums tracking-tighter">
                                        {costSummary.total.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl mb-2">
                            <div className="flex items-start gap-4">
                                <ShieldCheck size={18} className="text-blue-400 mt-0.5" />
                                <p className="text-[9px] text-slate-400 font-medium leading-relaxed uppercase tracking-wider">
                                    Confirming finalization will trigger a forensic inventory handshake, updating master stock and general ledger entries.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* WIDE FOOTER - FIXED BOTTOM */}
                <div className="shrink-0 bg-white border-t border-slate-100 p-8 flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3 text-emerald-600 font-bold text-[10px] uppercase tracking-widest bg-emerald-50 px-6 py-2.5 rounded-full border border-emerald-100">
                        <CheckCircle2 size={16} /> Autonomous Data Link: High Integrity
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => setSelectedOrder(null)} className="h-14 px-8 font-bold text-slate-400 hover:text-slate-900 text-[10px] uppercase tracking-widest rounded-xl transition-all">Discard Run</Button>
                        <Button 
                            onClick={() => finalizeProductionMutation.mutate()} 
                            disabled={finalizeProductionMutation.isPending} 
                            className="h-14 px-12 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xl uppercase tracking-widest text-[10px] min-w-[320px] transition-all"
                        >
                            {finalizeProductionMutation.isPending ? (
                                <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Finalizing Node...</>
                            ) : "Confirm & Finalize Production Output"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* SYSTEM FOOTER */}
        <footer className="mt-20 border-t border-slate-100 pt-12 pb-16 opacity-30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">
                <ShieldCheck size={14} />
                <span>Facility Protocol V5.1.0 • System Verified</span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                &copy; {new Date().getFullYear()} INDUSTRIAL MANAGEMENT SOLUTIONS
            </p>
        </footer>
      </div>
    </div>
  );
}