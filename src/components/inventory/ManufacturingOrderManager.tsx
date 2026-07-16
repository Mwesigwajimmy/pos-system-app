'use client';

/**
 * --- MANUFACTURING & PRODUCTION MANAGER ---
 * VERSION: v5.6 OMEGA (INDUSTRIAL WELD)
 * Use: Professional batch tracking, live inventory consumption, and customer notification.
 * Logic: Interconnected with Raw Materials and Forensic Comms.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Factory, Beaker, Loader2,
  TrendingUp, Wallet, PackagePlus, Trash2, Plus,
  ClipboardList, ShieldCheck, Search, Download, FileText, X, Settings2,
  Layers, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, BarChart3, 
  Database, Activity, FileDown, Coins, Mail, MessageSquare, Smartphone, CheckCircle2, User
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

export default function ManufacturingOrderManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  // Scroll States (Preserved)
  const [tableEl, setTableEl] = useState<HTMLDivElement | null>(null);
  const [wsEl, setWsEl] = useState<HTMLDivElement | null>(null);
  const [tableAtTop, setTableAtTop] = useState(true);
  const [tableAtBottom, setTableAtBottom] = useState(true);

  // Form States for Finalization
  const [expenses, setExpenses] = useState<any[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<any[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);
  
  const [newOrder, setNewOrder] = useState({ variant_id: '', customer_id: '', qty: 1, batch: '' });

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

  // 2. DATA: Live Raw Materials (For selection)
  const { data: rawMaterials } = useQuery({
    queryKey: ['raw_materials_for_mfg'],
    queryFn: async () => {
      const { data } = await supabase.from('raw_material_registry').select('*');
      return data || [];
    }
  });

  // 3. DATA: Manufacturing Orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mfg_production_orders_view').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // 4. DATA: Customers (For order link)
  const { data: customers } = useQuery({
    queryKey: ['mfg_customers'],
    queryFn: async () => {
        const { data } = await supabase.from('customers').select('id, name, email, phone_number, whatsapp_number');
        return data || [];
    }
  });

  const { data: finishedGoods } = useQuery({
    queryKey: ['mfg_products_targets'],
    queryFn: async () => {
      const { data } = await supabase.from('product_variants').select('id, name, sku, product:products(name)').eq('is_composite', true).eq('is_active', true);
      return data || [];
    }
  });

  useEffect(() => {
    if (isCreateModalOpen && !newOrder.batch) {
        setNewOrder(prev => ({ ...prev, batch: `LOT-${Date.now().toString().slice(-6)}` }));
    }
  }, [isCreateModalOpen, newOrder.batch]);

  const openAuditDialog = async (order: any) => {
    const { data: recipe } = await supabase.rpc('get_composite_details_v5', { p_variant_id: order.output_variant_id });
    if (recipe?.components) {
      setIngredientLogs(recipe.components.map((c: any) => ({
        variant_id: c.component_variant_id.toString(),
        name: c.component_name,
        actual_qty: c.quantity * order.planned_quantity,
        unit_cost: c.unit_cost || 0,
        currency: c.currency || currency
      })));
    }
    setActualYield(order.planned_quantity);
    setExpenses([{ category: 'Labour & Overheads', amount: 0 }]);
    setSelectedOrder(order);
  };

  // --- NOTIFICATION HANDSHAKE ---
  const dispatchNotification = (order: any, type: 'STARTED' | 'COMPLETED') => {
      const targetCustomer = customers?.find(c => c.id.toString() === order.customer_id?.toString());
      if (!targetCustomer) return;

      const message = type === 'STARTED' 
        ? `Hello ${targetCustomer.name}, production has officially started for your order [${order.batch_number}]. We are processing your ${order.product_name || 'request'} now.`
        : `Great news ${targetCustomer.name}! Your order [${order.batch_number}] is complete and ready for dispatch.`;

      const phone = (targetCustomer.whatsapp_number || targetCustomer.phone_number || "").replace(/\D/g, '');
      if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      
      toast.success(`Client notified of ${type} status.`);
  };

  // MUTATION: Create Order
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('mfg_production_orders').insert([{
        output_variant_id: parseInt(newOrder.variant_id),
        customer_id: newOrder.customer_id ? parseInt(newOrder.customer_id) : null,
        planned_quantity: newOrder.qty,
        batch_number: newOrder.batch.toUpperCase(),
        status: 'draft',
        business_id: profile?.business_id,
        tenant_id: profile?.business_id
      }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Production Run Initiated");
      dispatchNotification(data, 'STARTED');
      setIsCreateModalOpen(false);
      setNewOrder({ variant_id: '', customer_id: '', qty: 1, batch: '' });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    }
  });

  // MUTATION: Finalize Order
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
      toast.success("Production complete. Stock levels adjusted.");
      dispatchNotification(selectedOrder, 'COMPLETED');
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      queryClient.invalidateQueries({ queryKey: ['raw_materials_ledger'] });
    }
  });

  const costSummary = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1650px] mx-auto p-10 space-y-10 animate-in fade-in duration-700">
        
        {/* HEADER */}
        <header className="flex justify-between items-center border-b border-slate-100 pb-10">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]">
                    <Factory size={16} /> Production Control Node
                </div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Manufacturing Orders</h1>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="h-14 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-2xl transition-all uppercase tracking-widest text-xs">
                <Plus size={18} className="mr-2" /> Start New Batch
            </Button>
        </header>

        {/* SCHEDULE TABLE */}
        <Card className="border-slate-200 shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-0">
            <ScrollArea className="w-full max-h-[60vh]">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-16">
                    <TableHead className="pl-10 font-black uppercase text-slate-400 text-[10px] tracking-widest">Batch Ref</TableHead>
                    <TableHead className="font-black uppercase text-slate-400 text-[10px] tracking-widest">Product Identity</TableHead>
                    <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-widest">Target Yield</TableHead>
                    <TableHead className="text-center font-black uppercase text-slate-400 text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="pr-10 text-right font-black uppercase text-slate-400 text-[10px] tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.map((o: any) => (
                    <TableRow key={o.id} className="h-24 hover:bg-slate-50/50 transition-colors border-b last:border-none">
                      <TableCell className="pl-10 font-black text-slate-900 text-xs font-mono">{o.batch_number}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-base uppercase tracking-tight">{o.product_name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SKU: {o.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-700 text-sm tabular-nums">{o.planned_quantity} UNITS</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("font-black uppercase text-[9px] px-4 py-1.5 rounded-lg border-none shadow-sm", o.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
                          {o.status === 'completed' ? 'Forensically Sealed' : 'In Production'}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-10 text-right">
                        {o.status !== 'completed' ? (
                          <Button onClick={() => openAuditDialog(o)} className="h-11 px-8 bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95">
                            Finalize Batch
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-slate-300 border-slate-100 uppercase text-[9px] font-bold tracking-widest">Ledger Locked</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* MODAL: START PRODUCTION */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
                <div className="p-10 text-center bg-slate-900 text-white">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">Industrial Initiation</DialogTitle>
                    <DialogDescription className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-[0.2em]">Deploying new manufacturing node</DialogDescription>
                </div>
                
                <div className="p-10 space-y-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Manufacturing Recipe</Label>
                        <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                            <SelectTrigger className="h-14 border-slate-200 bg-slate-50 font-black text-slate-900 rounded-2xl px-6">
                                <SelectValue placeholder="Identify blueprint..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                {finishedGoods?.map((g: any) => (
                                    <SelectItem key={g.id} value={g.id.toString()} className="font-bold py-4 border-b last:border-none uppercase text-xs">
                                        {g.product?.name} <span className="text-slate-400 ml-2">[{g.sku}]</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Target Client (Notification Node)</Label>
                        <Select onValueChange={(val) => setNewOrder({...newOrder, customer_id: val})}>
                            <SelectTrigger className="h-14 border-slate-200 bg-slate-50 font-black text-slate-900 rounded-2xl px-6">
                                <SelectValue placeholder="Search Client Identity..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                {customers?.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id.toString()} className="font-bold py-4 border-b last:border-none uppercase text-xs">
                                        <div className="flex items-center gap-2"><User size={14} className="text-blue-500" /> {c.name}</div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch ID</Label>
                            <Input value={newOrder.batch} readOnly className="h-14 border-slate-200 bg-white font-black rounded-2xl text-center uppercase text-sm tracking-widest text-slate-400" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Planned yield</Label>
                            <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-14 border-blue-100 bg-blue-50/20 font-black rounded-2xl text-center text-blue-600 text-xl" />
                        </div>
                    </div>

                    <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-2xl transition-all uppercase tracking-[0.2em] text-xs">
                        {createOrderMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize & Notify Client"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* --- MODAL: FINALIZE & RECONCILE --- */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent showCloseButton={false} className="max-w-[1650px] w-[98vw] h-[96vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl rounded-[3rem] bg-white">
                
                <div className="shrink-0 bg-slate-900 p-10 flex justify-between items-center text-white">
                    <div className="flex items-center gap-8">
                        <div className="h-20 w-20 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/20">
                            <ClipboardList size={32} className="text-blue-400" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-4xl font-black tracking-tight uppercase">Finalize Batch Statistics</DialogTitle>
                            <Badge variant="secondary" className="bg-blue-600 text-white font-mono px-5 py-2 rounded-xl text-sm border-none shadow-lg">
                                LOT_IDENTITY: {selectedOrder?.batch_number}
                            </Badge>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-2xl px-12 py-8 rounded-[2.5rem] text-right border border-white/10 shadow-inner">
                        <p className="text-[11px] text-blue-400 font-black uppercase tracking-[0.3em] mb-1">Calculated Item Unit Cost</p>
                        <p className="text-5xl font-black tabular-nums tracking-tighter">
                            {costSummary.unitCost.toLocaleString()} <span className="text-sm text-slate-400 font-bold ml-1 uppercase">{currency}</span>
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-white">
                    <div className="lg:col-span-8 h-full flex flex-col border-r border-slate-100">
                        <ScrollArea className="flex-1">
                            <div className="p-14 space-y-16">
                                
                                {/* 1. LIVE MATERIAL LEDGER */}
                                <div className="space-y-10">
                                    <div className="flex items-center justify-between border-l-4 border-blue-600 pl-8">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">1. Material Consumption Ledger</h3>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Surgically deduct raw weights used in this run</p>
                                        </div>
                                        <div className="relative w-80">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <Input 
                                                placeholder="Add Raw Material..." 
                                                value={materialSearch}
                                                onChange={e => setMaterialSearch(e.target.value)}
                                                className="pl-12 h-12 border-slate-100 bg-slate-50 font-black rounded-2xl text-[10px] uppercase tracking-widest"
                                            />
                                            {materialSearch && (
                                                <div className="absolute top-14 w-full z-[100] bg-white border border-slate-100 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                                                    {rawMaterials?.filter(m => m.product_name.toLowerCase().includes(materialSearch.toLowerCase())).map(m => (
                                                        <div key={m.variant_id} onClick={() => {
                                                            if (!ingredientLogs.find(i => i.variant_id === m.variant_id.toString())) {
                                                                setIngredientLogs([...ingredientLogs, { variant_id: m.variant_id.toString(), name: m.product_name, actual_qty: 0, unit_cost: m.buying_price, currency: m.currency || currency }]);
                                                            }
                                                            setMaterialSearch("");
                                                        }} className="p-5 hover:bg-blue-50 cursor-pointer border-b last:border-none flex justify-between items-center">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-[11px] uppercase">{m.product_name}</span>
                                                                <span className="text-[9px] text-slate-400">Inventory: {m.current_stock} {m.unit}</span>
                                                            </div>
                                                            <PlusCircle size={18} className="text-blue-600" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="rounded-[3rem] border border-slate-100 overflow-hidden bg-slate-50/20">
                                        <Table>
                                            <TableHeader className="bg-slate-100/50">
                                                <TableRow className="h-16">
                                                    <TableHead className="text-[11px] font-black pl-12 uppercase tracking-[0.2em] text-slate-500">Material Identity</TableHead>
                                                    <TableHead className="text-[11px] font-black text-center uppercase tracking-[0.2em] text-slate-500">Actual consumption</TableHead>
                                                    <TableHead className="text-[11px] font-black text-right pr-12 uppercase tracking-[0.2em] text-slate-500">Stock Rate</TableHead>
                                                    <TableHead className="w-20"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {ingredientLogs.map((log, idx) => (
                                                    <TableRow key={idx} className="h-24 hover:bg-white border-b border-slate-100 last:border-none">
                                                        <TableCell className="pl-12 font-black text-slate-800 text-lg uppercase">{log.name}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Input type="number" step="0.001" value={log.actual_qty} onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }} className="h-16 w-52 mx-auto text-center border-slate-200 bg-white font-black text-blue-600 text-3xl rounded-2xl shadow-inner focus:ring-blue-600/20" />
                                                        </TableCell>
                                                        <TableCell className="text-right pr-12 font-mono font-black text-slate-500 text-sm">{log.unit_cost.toLocaleString()} <span className="text-[10px] text-slate-300 font-bold ml-1">{log.currency}</span></TableCell>
                                                        <TableCell className="pr-12 text-center"><button onClick={() => setIngredientLogs(ingredientLogs.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-rose-600 transition-colors"><Trash2 size={24}/></button></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* 2. EXTERNAL OVERHEADS */}
                                <div className="space-y-10">
                                    <div className="flex justify-between items-center border-l-4 border-rose-500 pl-8">
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">2. External Production Overheads</h3>
                                        <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="h-12 text-blue-600 font-black text-[11px] uppercase tracking-widest border-blue-100 px-10 rounded-2xl transition-all shadow-sm">
                                            <Plus className="mr-2 h-4 w-4" /> Add Expense Node
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        {expenses.map((exp, idx) => (
                                            <div key={idx} className="flex gap-6 items-center bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                                                <Input placeholder="Expense category (Labour, Electricity, Fuel...)" value={exp.category} onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }} className="h-16 flex-1 border-slate-100 bg-slate-50/50 font-black text-slate-900 rounded-3xl px-10 text-sm focus:bg-white" />
                                                <div className="relative w-96">
                                                    <Input type="number" value={exp.amount} onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }} className="h-16 border-slate-100 bg-slate-50/50 text-right font-black text-slate-900 rounded-3xl text-2xl pr-16 focus:bg-white" />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-300 uppercase">{currency}</span>
                                                </div>
                                                <button onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="h-16 w-16 text-slate-100 hover:text-rose-500 rounded-full transition-colors mt-6"><Trash2 size={28} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT AREA: Yield & Notification */}
                    <div className="lg:col-span-4 bg-slate-50/40 p-12 flex flex-col border-l border-slate-100 h-full overflow-hidden">
                        <div className="space-y-14">
                            <div className="bg-white p-14 rounded-[3.5rem] shadow-2xl border border-slate-200/50 text-center space-y-6">
                                <Label className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] block">Actual Finished Yield</Label>
                                <Input type="number" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="h-44 text-9xl font-black border-none text-center bg-slate-50 rounded-[3rem] text-slate-900 tabular-nums shadow-inner focus-visible:ring-0 focus-visible:bg-slate-100" />
                                <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 py-4 rounded-[1.5rem] mx-10">Production Node Verification</p>
                            </div>

                            <div className="space-y-10 px-8">
                                <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-300 border-b border-slate-100 pb-6">Consolidated Ledger Impacts</h4>
                                <div className="flex justify-between items-center text-sm font-black">
                                    <span className="text-slate-400 uppercase tracking-widest text-[11px]">Material Pool</span>
                                    <span className="text-slate-900 text-xl tabular-nums">{costSummary.matTotal.toLocaleString()} <span className="text-xs text-slate-400">{currency}</span></span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-black">
                                    <span className="text-slate-400 uppercase tracking-widest text-[11px]">Aggregated Overheads</span>
                                    <span className="text-xl text-slate-900 tabular-nums">{costSummary.expTotal.toLocaleString()} <span className="text-xs text-slate-400">{currency}</span></span>
                                </div>
                                <div className="pt-14 mt-12 border-t-8 border-slate-900 flex flex-col items-center">
                                    <span className="text-7xl font-black text-slate-900 tabular-nums tracking-tighter">{costSummary.total.toLocaleString()}</span>
                                    <span className="text-sm font-black text-blue-600 uppercase tracking-[0.5em] mt-3">Total Net Batch Valuation</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl mt-auto">
                            <div className="flex items-start gap-6">
                                <ShieldCheck size={32} className="text-blue-400 shrink-0" />
                                <p className="text-xs text-slate-400 font-black leading-relaxed uppercase tracking-widest">
                                    Executing the seal will trigger a forensic stock deduction of raw materials and restock finished goods into the primary vault.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. WIDE FOOTER */}
                <div className="shrink-0 bg-white border-t border-slate-100 p-12 flex flex-col sm:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-5 text-emerald-600 font-black text-[13px] uppercase tracking-[0.3em] bg-emerald-50 px-12 py-5 rounded-[2rem] border border-emerald-100 shadow-inner">
                        <CheckCircle2 size={24} /> Autonomous Ledger Handshake Active
                    </div>
                    <div className="flex gap-6 w-full sm:w-auto">
                        <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="h-20 px-16 font-black text-slate-400 hover:text-rose-600 text-sm uppercase tracking-[0.2em] rounded-3xl transition-all">Discard Run</Button>
                        <Button 
                            onClick={() => finalizeProductionMutation.mutate()} 
                            disabled={finalizeProductionMutation.isPending} 
                            className="h-24 px-24 bg-slate-900 hover:bg-black text-white font-black rounded-[3rem] shadow-2xl shadow-slate-900/40 uppercase tracking-[0.3em] text-base min-w-[500px] transition-all active:scale-[0.98]"
                        >
                            {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin h-8 w-8 mr-4" /> : "Confirm & Finalize Production Output"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        
        <footer className="mt-20 border-t border-slate-100 pt-16 pb-16 opacity-30 flex items-center justify-between">
            <div className="flex items-center gap-5 text-[11px] text-slate-400 font-black uppercase tracking-[0.6em]">
                <ShieldCheck size={18} />
                <span>Facility Protocol V5.6.0 • Sovereign Integrated Engine</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© INDUSTRIAL MANAGEMENT OS</p>
        </footer>
      </div>
    </div>
  );
}