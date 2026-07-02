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
        headStyles: { fillColor: [51, 65, 85] }
    });
    doc.save(`Production_Report_${Date.now()}.pdf`);
  };

  const costSummary = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Production Registry...</p></div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-500">
        
        {/* PAGE HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-slate-100 pb-10">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em]">
                    <Factory size={16} /> Production Management
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manufacturing & Batch Orders</h1>
                <p className="text-sm font-medium text-slate-500">Track real-time production costs, material usage, and stock updates.</p>
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

        {/* MAIN DATA CARD */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="px-8 py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-slate-900">Current Production Schedule</CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scheduled and completed manufacturing logs</CardDescription>
            </div>
            <div className="relative w-full md:w-[400px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search Batch No. or Product..." 
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
                    <TableHead className="text-center font-bold uppercase text-slate-500 text-[10px] tracking-widest">Target Quantity</TableHead>
                    <TableHead className="text-center font-bold uppercase text-slate-500 text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="px-8 text-right font-bold uppercase text-slate-500 text-[10px] tracking-widest">Operations</TableHead>
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
                          "font-bold uppercase text-[9px] px-3 py-1 rounded-md border-none",
                          o.status === 'completed' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                        )}>
                          {o.status === 'completed' ? 'Finalized' : 'In Progress'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 text-right">
                        {o.status !== 'completed' ? (
                          <Button onClick={() => openAuditDialog(o)} className="h-9 px-5 bg-slate-900 hover:bg-black text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-sm">
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
                <div className="p-8 text-center border-b border-slate-100">
                    <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 border border-blue-100 shadow-sm">
                        <PackagePlus size={28} />
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900">New Production Batch</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wider">Configure production run parameters</DialogDescription>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Select Product Recipe</Label>
                        <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                            <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 rounded-xl font-bold text-sm px-5">
                                <SelectValue placeholder="Search recipe catalog..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-2xl max-h-[300px]">
                                {finishedGoods?.map((g: any) => (
                                    <SelectItem key={g.id} value={g.id.toString()} className="text-xs font-bold py-3">
                                        {g.product?.name} <span className="text-slate-400 ml-2">[{g.sku}]</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Batch Number</Label>
                            <Input value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-12 border-slate-200 bg-white font-bold rounded-xl text-center uppercase text-xs" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Planned Quantity</Label>
                            <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-12 border-slate-200 bg-white font-bold rounded-xl text-center text-blue-600 text-sm" />
                        </div>
                    </div>

                    <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all uppercase tracking-widest text-xs">
                        {createOrderMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirm Production"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* MODAL: FINALIZE & RECONCILE */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent className="max-w-[1400px] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden border border-slate-200 shadow-3xl rounded-[2rem] bg-white">
                
                {/* Header Summary */}
                <div className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 text-slate-900">
                            <ClipboardList size={28} />
                        </div>
                        <div className="space-y-0.5">
                            <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Finalize Batch Results</DialogTitle>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Lot:</span>
                                <Badge variant="outline" className="border-blue-200 text-blue-700 font-bold px-3 py-1 rounded-md text-[10px] uppercase">{selectedOrder?.batch_number}</Badge>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white px-8 py-6 rounded-2xl text-right min-w-[280px] shadow-sm border border-slate-200 flex flex-col items-end">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Calculated Unit Cost</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums tracking-tighter">
                            {costSummary.unitCost.toLocaleString()} <span className="text-xs text-slate-400 font-medium ml-1">{currency}</span>
                        </p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                    
                    {/* Input Section */}
                    <ScrollArea className="lg:col-span-8 bg-white border-r border-slate-100">
                        <div className="p-10 space-y-12">
                            
                            {/* Materials */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-blue-600" /> 1. Raw Materials Used
                                    </h3>
                                    <Badge variant="outline" className="text-slate-400 font-bold text-[9px] uppercase border-slate-100">Auto-calculated from recipe</Badge>
                                </div>
                                
                                <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow className="h-12 border-none">
                                                <TableHead className="text-[10px] font-bold pl-8 uppercase text-slate-400 tracking-wider">Component Name</TableHead>
                                                <TableHead className="text-[10px] font-bold text-center uppercase text-slate-400 tracking-wider">Actual Consumption</TableHead>
                                                <TableHead className="text-[10px] font-bold text-right pr-8 uppercase text-slate-400 tracking-wider">Market Unit Rate ({currency})</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ingredientLogs.map((log, idx) => (
                                                <TableRow key={idx} className="h-16 hover:bg-slate-50/50 border-b last:border-none">
                                                    <TableCell className="pl-8 font-bold text-slate-800 text-sm">{log.name}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Input 
                                                            type="number" 
                                                            value={log.actual_qty} 
                                                            onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }} 
                                                            className="h-10 w-32 mx-auto text-center border-slate-200 font-bold text-blue-600 rounded-lg shadow-sm" 
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8 font-mono text-xs font-semibold text-slate-500">{log.unit_cost.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Overheads */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-rose-600" /> 2. Overhead Expenses
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="h-9 text-blue-600 font-bold text-[10px] uppercase hover:bg-blue-50">
                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> New Line
                                    </Button>
                                </div>
                                
                                <div className="space-y-3">
                                    {expenses.map((exp, idx) => (
                                        <div key={idx} className="flex gap-4 items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100 transition-all hover:border-slate-300">
                                            <div className="flex-1">
                                                <Input 
                                                    placeholder="Expense Type (Labour, Power, Transport...)" 
                                                    value={exp.category} 
                                                    onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }} 
                                                    className="h-12 border-slate-200 bg-white font-medium text-slate-800 rounded-lg px-4 text-xs" 
                                                />
                                            </div>
                                            <div className="w-56 relative">
                                                <Input 
                                                    type="number" 
                                                    value={exp.amount} 
                                                    onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }} 
                                                    className="h-12 border-slate-200 bg-white text-right font-bold text-slate-900 rounded-lg text-sm pr-12" 
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase">{currency}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Summary Sidebar */}
                    <div className="lg:col-span-4 bg-slate-50/30 p-10 flex flex-col gap-10">
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 text-center space-y-4">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Counted Finished Yield</Label>
                            <Input 
                                type="number" 
                                value={actualYield} 
                                onChange={e => setActualYield(Number(e.target.value))} 
                                className="h-28 text-6xl font-bold border-none text-center bg-slate-50/50 rounded-2xl text-slate-900 tabular-nums shadow-inner focus-visible:ring-0" 
                            />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmed unit count</p>
                        </div>

                        <div className="space-y-6 px-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-3">Cost Breakdown</h4>
                            <div className="flex justify-between items-center text-xs font-medium text-slate-600">
                                <span className="uppercase tracking-wider">Materials</span>
                                <span className="font-bold text-slate-900">{costSummary.matTotal.toLocaleString()} {currency}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-medium text-slate-600">
                                <span className="uppercase tracking-wider">Overheads</span>
                                <span className="font-bold text-slate-900">{costSummary.expTotal.toLocaleString()} {currency}</span>
                            </div>
                            <div className="pt-8 border-t border-slate-900 flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Net Batch Value</span>
                                <span className="text-4xl font-bold text-blue-600 tabular-nums tracking-tighter">
                                    {costSummary.total.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-100 border border-slate-200 rounded-2xl mt-auto">
                            <div className="flex items-start gap-3">
                                <ShieldCheck size={18} className="text-slate-400 mt-1" />
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-wider">
                                    Authorization will restock the finished goods inventory and record material consumption against the specific batch ID.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-white border-t p-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
                        <CheckCircle2 size={18} /> Documentation Verified
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => setSelectedOrder(null)} className="h-14 px-8 font-bold text-slate-500 text-xs uppercase tracking-widest rounded-xl border-slate-200">Cancel</Button>
                        <Button 
                            onClick={() => finalizeProductionMutation.mutate()} 
                            disabled={finalizeProductionMutation.isPending} 
                            className="h-14 px-12 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xl uppercase tracking-widest text-xs min-w-[320px] transition-all active:scale-[0.98]"
                        >
                            {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Finalize Production Output"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* FOOTER */}
        <footer className="mt-20 border-t border-slate-100 pt-10 pb-16 opacity-30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
                <ShieldCheck size={14} />
                <span>Production Standard V4.5.1 • Node Verified</span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                &copy; {new Date().getFullYear()} BUSINESS MANAGEMENT SYSTEMS
            </p>
        </footer>
      </div>
    </div>
  );
}