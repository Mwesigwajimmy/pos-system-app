'use client';

/**
 * --- MANUFACTURING & PRODUCTION MANAGER ---
 * Professional batch tracking, live material consumption, cost analysis,
 * customer-linked orders, and WhatsApp production notifications.
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
  Layers, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, BarChart3, Database, Activity, FileDown, Coins,
  Maximize2, Minimize2, User
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

export default function ManufacturingOrderManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFinalizeMaximized, setIsFinalizeMaximized] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  // Scroll-position tracking for the Production Schedule table's hint arrows.
  // Two separate trackers: the outer ScrollArea's viewport handles VERTICAL
  // overflow (bounded by max-h-[65vh] below), but <Table> always wraps
  // itself in its own internal horizontal-scroll div (see ui/table.tsx) —
  // that's the element that actually overflows horizontally, so it needs
  // its own independent tracker rather than sharing the vertical one.
  const [tableEl, setTableEl] = useState<HTMLDivElement | null>(null);
  const [tableAtTop, setTableAtTop] = useState(true);
  const [tableAtBottom, setTableAtBottom] = useState(true);
  const updateTableScroll = useCallback(() => {
      if (!tableEl) return;
      setTableAtTop(tableEl.scrollTop <= 1);
      setTableAtBottom(tableEl.scrollTop >= tableEl.scrollHeight - tableEl.clientHeight - 1);
  }, [tableEl]);
  useEffect(() => {
      if (!tableEl) return;
      updateTableScroll();
      const ro = new ResizeObserver(updateTableScroll);
      ro.observe(tableEl);
      return () => ro.disconnect();
  }, [tableEl, updateTableScroll]);

  const [hTableEl, setHTableEl] = useState<HTMLDivElement | null>(null);
  const [tableAtLeft, setTableAtLeft] = useState(true);
  const [tableAtRight, setTableAtRight] = useState(true);
  const updateHTableScroll = useCallback(() => {
      if (!hTableEl) return;
      setTableAtLeft(hTableEl.scrollLeft <= 1);
      setTableAtRight(hTableEl.scrollLeft >= hTableEl.scrollWidth - hTableEl.clientWidth - 1);
  }, [hTableEl]);
  useEffect(() => {
      if (!hTableEl) return;
      updateHTableScroll();
      const ro = new ResizeObserver(updateHTableScroll);
      ro.observe(hTableEl);
      return () => ro.disconnect();
  }, [hTableEl, updateHTableScroll]);

  // Form States for Finalization
  const [expenses, setExpenses] = useState<any[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<any[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);
  
  const [newOrder, setNewOrder] = useState({ variant_id: '', customer_id: '', qty: 1, batch: '' });

  // Scroll-position tracking for the Finalize dialog's "more content" hint arrows.
  // Uses a state-backed callback ref (not useRef) because Base UI's Dialog
  // portals its content — a plain ref stays null past the first render.
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const [bodyAtStart, setBodyAtStart] = useState(true);
  const [bodyAtEnd, setBodyAtEnd] = useState(true);
  const updateBodyScroll = useCallback(() => {
      if (!bodyEl) return;
      setBodyAtStart(bodyEl.scrollTop <= 1);
      setBodyAtEnd(bodyEl.scrollTop >= bodyEl.scrollHeight - bodyEl.clientHeight - 1);
  }, [bodyEl]);
  useEffect(() => {
      if (!bodyEl) return;
      updateBodyScroll();
      const ro = new ResizeObserver(updateBodyScroll);
      ro.observe(bodyEl);
      return () => ro.disconnect();
  }, [bodyEl, updateBodyScroll]);

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

  // 4. DATA: Raw Materials (for the searchable "add material" flow in Finalize)
  const { data: rawMaterials } = useQuery({
    queryKey: ['raw_materials_for_mfg'],
    queryFn: async () => {
      const { data } = await supabase.from('raw_material_registry').select('*');
      return data || [];
    }
  });

  // 5. DATA: Customers (order link + WhatsApp notification target)
  const { data: customers } = useQuery({
    queryKey: ['mfg_customers'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name, email, phone_number, whatsapp_number');
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
    setMaterialSearch("");
    setSelectedOrder(order);
  };

  // Client WhatsApp handshake — fires when a run starts and again when it's finalized.
  const dispatchNotification = (order: any, type: 'STARTED' | 'COMPLETED') => {
      const targetCustomer = customers?.find((c: any) => c.id.toString() === order.customer_id?.toString());
      if (!targetCustomer) return;

      const message = type === 'STARTED'
        ? `Hello ${targetCustomer.name}, production has officially started for your order [${order.batch_number}]. We are processing your ${order.product_name || 'request'} now.`
        : `Great news ${targetCustomer.name}! Your order [${order.batch_number}] is complete and ready for dispatch.`;

      const phone = (targetCustomer.whatsapp_number || targetCustomer.phone_number || "").replace(/\D/g, '');
      if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');

      toast.success(`Client notified of ${type.toLowerCase()} status.`);
  };

  // MUTATION: Create New Order
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
      toast.success("Production order started");
      dispatchNotification(data, 'STARTED');
      setIsCreateModalOpen(false);
      setNewOrder({ variant_id: '', customer_id: '', qty: 1, batch: '' });
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
      dispatchNotification(selectedOrder, 'COMPLETED');
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
          <CardHeader className="px-5 sm:px-8 py-5 sm:py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 bg-slate-50/40">
            <div className="flex items-start justify-between gap-3 md:block">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold text-slate-900">Production Schedule</CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scheduled and completed manufacturing activities</CardDescription>
                </div>
                {!mobileSearchOpen && (
                    <button
                        type="button"
                        onClick={() => setMobileSearchOpen(true)}
                        aria-label="Search"
                        className="md:hidden shrink-0 h-10 w-10 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-center"
                    >
                        <Search className="h-4 w-4 text-slate-400" />
                    </button>
                )}
            </div>

            {/* Desktop search bar */}
            <div className="relative w-full md:w-[400px] hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filter by Batch or Product..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="h-11 pl-11 border-slate-200 bg-white rounded-xl text-sm focus:ring-blue-600 shadow-sm"
                />
            </div>

            {/* Mobile: search collapses to an icon button; tapping it reveals the full bar. */}
            {mobileSearchOpen && (
                <div className="md:hidden flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            autoFocus
                            placeholder="Filter by Batch or Product..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="h-11 pl-10 border-slate-200 bg-white rounded-xl text-sm focus:ring-blue-600 shadow-sm w-full"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => { setMobileSearchOpen(false); setFilter(''); }}
                        className="shrink-0 h-11 px-3 text-xs font-bold text-slate-500 hover:text-slate-900"
                    >
                        Cancel
                    </button>
                </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative">
            <ScrollArea
                viewportRef={setTableEl}
                onScroll={updateTableScroll}
                className="w-full max-h-[65vh]"
            >
              <Table containerRef={setHTableEl} onScroll={updateHTableScroll}>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-14 border-none">
                    <TableHead className="w-16 text-center">
                      <Checkbox checked={selectedItems.length === orders?.length} onCheckedChange={(c) => setSelectedItems(c ? orders?.map(o => o.id) || [] : [])} className="border-2 border-slate-300 data-checked:border-blue-600 data-checked:bg-blue-600" />
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
                        <Checkbox checked={selectedItems.includes(o.id)} onCheckedChange={(c) => setSelectedItems(prev => c ? [...prev, o.id] : prev.filter(id => id !== o.id))} className="border-2 border-slate-300 data-checked:border-blue-600 data-checked:bg-blue-600" />
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
            {!tableAtTop && (
                <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center">
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                </div>
            )}
            {!tableAtBottom && (
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center animate-bounce">
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </div>
            )}
            {!tableAtLeft && (
                <div className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center">
                    <ChevronLeft className="h-4 w-4 text-slate-500" />
                </div>
            )}
            {!tableAtRight && (
                <div className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center">
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
            )}
            </div>
          </CardContent>
        </Card>

        {/* MODAL: START PRODUCTION */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="max-w-md sm:max-w-md w-[calc(100%-2rem)] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
                <div className="p-6 sm:p-10 text-center border-b border-slate-100 shrink-0">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 border border-blue-100 shadow-sm">
                        <PackagePlus className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>
                    <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900">New Production Run</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wider">Define the parameters for this batch</DialogDescription>
                </div>

                <div className="p-6 sm:p-10 space-y-6 overflow-y-auto min-h-0 custom-scrollbar">
                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Product Recipe</Label>
                        <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                            <SelectTrigger className="h-12 w-full border-slate-200 bg-slate-50/50 rounded-xl font-bold text-sm px-5">
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

                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Target Client (Notification)</Label>
                        <Select onValueChange={(val) => setNewOrder({...newOrder, customer_id: val})}>
                            <SelectTrigger className="h-12 w-full border-slate-200 bg-slate-50/50 rounded-xl font-bold text-sm px-5">
                                <SelectValue placeholder="Optional — link a customer..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-2xl max-h-[300px]">
                                {customers?.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold py-3 border-b last:border-none">
                                        <div className="flex items-center gap-2"><User size={12} className="text-blue-500" /> {c.name}</div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-5">
                        <div className="space-y-2.5 min-w-0">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Batch ID</Label>
                            <Input value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-12 w-full border-slate-200 bg-white font-bold rounded-xl text-center uppercase text-xs" />
                        </div>
                        <div className="space-y-2.5 min-w-0">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Target Yield</Label>
                            <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-12 w-full border-slate-200 bg-white font-bold rounded-xl text-center text-blue-600 text-sm" />
                        </div>
                    </div>

                    <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="w-full h-12 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all uppercase tracking-widest text-xs active:scale-[0.98]">
                        {createOrderMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirm & Initiate"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* --- ULTRA-WIDE MODAL: FINALIZE & RECONCILE (FIXED PRO LAYOUT) --- */}
        <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setIsFinalizeMaximized(false); } }}>
            <DialogContent showCloseButton={false} className={cn(
                "border-slate-200 shadow-2xl overflow-hidden flex flex-col p-0 gap-0 bg-white transition-all duration-300 ease-out",
                isFinalizeMaximized
                    ? "fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 m-0 w-screen h-screen max-w-none sm:max-w-none max-h-none rounded-none z-[9999]"
                    : "w-full h-full sm:h-auto sm:max-h-[90vh] sm:w-[95vw] sm:max-w-4xl rounded-none sm:rounded-3xl"
            )}>

                {/* Page-style header */}
                <div className="p-4 sm:p-6 bg-white border-b relative shrink-0">
                    <div className="flex items-start gap-3 sm:gap-4 pr-20 sm:pr-24">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 truncate">Finalize Batch Statistics</DialogTitle>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Lot:</span>
                                <Badge variant="secondary" className="bg-blue-50 text-blue-600 font-mono px-2 py-0.5 rounded-md text-[10px] border-none">
                                    {selectedOrder?.batch_number}
                                </Badge>
                                <span className="text-slate-300">·</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Forecast Unit Cost: <span className="text-slate-700">{costSummary.unitCost.toLocaleString()} {currency}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Window Controls */}
                    <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex items-center gap-1 sm:gap-2">
                        <button
                            type="button"
                            onClick={() => setIsFinalizeMaximized(!isFinalizeMaximized)}
                            className="hidden sm:inline-flex p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                            aria-label={isFinalizeMaximized ? "Restore" : "Maximize"}
                        >
                            {isFinalizeMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setSelectedOrder(null); setIsFinalizeMaximized(false); }}
                            aria-label="Close"
                            className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Form Body */}
                <div
                    ref={setBodyEl}
                    onScroll={updateBodyScroll}
                    className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/20"
                >
                    {!bodyAtStart && (
                        <div className="sticky top-0 z-10 h-0 flex justify-center overflow-visible pointer-events-none">
                            <div className="h-7 w-7 translate-y-1 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center">
                                <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                        </div>
                    )}

                    {/* A. Material Consumption Section */}
                    <div className="space-y-3 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-4 border-blue-600 pl-4">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">1. Material Consumption Ledger</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Verify actual raw weights used in this run</p>
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-600 font-black px-3 py-1 rounded-lg border-none uppercase text-[9px] tracking-tighter w-fit">Atomic Inventory Sync</Badge>
                        </div>

                        {/* Search-to-add: pull in a raw material not already on the recipe */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Add another raw material to this run..."
                                value={materialSearch}
                                onChange={e => setMaterialSearch(e.target.value)}
                                className="h-10 pl-9 border-slate-200 bg-white rounded-lg text-xs font-medium"
                            />
                            {materialSearch && (
                                <div className="absolute top-11 left-0 right-0 z-20 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                    {rawMaterials?.filter((m: any) => m.product_name.toLowerCase().includes(materialSearch.toLowerCase())).map((m: any) => (
                                        <div
                                            key={m.variant_id}
                                            onClick={() => {
                                                if (!ingredientLogs.find(i => i.variant_id === m.variant_id.toString())) {
                                                    setIngredientLogs([...ingredientLogs, { variant_id: m.variant_id.toString(), name: m.product_name, actual_qty: 0, unit_cost: m.buying_price }]);
                                                }
                                                setMaterialSearch("");
                                            }}
                                            className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-none flex justify-between items-center"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs text-slate-800">{m.product_name}</span>
                                                <span className="text-[9px] text-slate-400">Stock: {m.current_stock} {m.unit}</span>
                                            </div>
                                            <Plus size={14} className="text-blue-600" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            {/* Desktop/tablet: full table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                                        <TableRow className="h-12">
                                            <TableHead className="text-[10px] font-black pl-6 uppercase tracking-widest text-slate-400">Material specification</TableHead>
                                            <TableHead className="text-[10px] font-black text-center uppercase tracking-widest text-slate-400">Actual units used</TableHead>
                                            <TableHead className="text-[10px] font-black text-right uppercase tracking-widest text-slate-400">Inventory Rate ({currency})</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ingredientLogs.map((log, idx) => (
                                            <TableRow key={idx} className="hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0">
                                                <TableCell className="pl-6 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 text-sm">{log.name}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ref ID: {log.variant_id}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Input
                                                        type="number"
                                                        step="0.001"
                                                        value={log.actual_qty}
                                                        onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }}
                                                        className="h-10 w-36 mx-auto text-center border-slate-200 bg-slate-50/30 font-bold text-blue-700 rounded-lg shadow-sm"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-slate-400 text-sm tabular-nums">
                                                    {log.unit_cost.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="pr-4 text-center">
                                                    <button type="button" onClick={() => setIngredientLogs(ingredientLogs.filter((_, i) => i !== idx))} aria-label="Remove material" className="text-slate-300 hover:text-rose-500 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile: stacked material cards */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {ingredientLogs.map((log, idx) => (
                                    <div key={idx} className="p-4 space-y-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="font-bold text-slate-800 text-sm">{log.name}</span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tabular-nums">{log.unit_cost.toLocaleString()} {currency}</span>
                                                <button type="button" onClick={() => setIngredientLogs(ingredientLogs.filter((_, i) => i !== idx))} aria-label="Remove material" className="text-slate-300 hover:text-rose-500 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ref ID: {log.variant_id}</span>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actual units used</Label>
                                            <Input
                                                type="number"
                                                step="0.001"
                                                value={log.actual_qty}
                                                onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }}
                                                className="h-11 w-full text-center border-slate-200 bg-slate-50/30 font-bold text-blue-700 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* B. Overheads Section */}
                    <div className="space-y-3 mb-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-l-4 border-rose-500 pl-4">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">2. External Production Overheads</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Log labour, logistics, and facility utility costs</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="w-full sm:w-auto h-9 text-blue-600 font-bold text-[10px] uppercase tracking-widest border-blue-100 hover:bg-blue-50 px-4 rounded-lg">
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Expense
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {expenses.map((exp, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:items-center bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex-1 min-w-0">
                                        <Label className="text-[9px] font-black text-slate-300 uppercase mb-1 block">Expense category</Label>
                                        <Input
                                            placeholder="e.g. Mechanical Labour, Transport..."
                                            value={exp.category}
                                            onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }}
                                            className="h-10 border-slate-200 bg-slate-50/50 font-medium text-slate-900 rounded-lg px-3 text-sm"
                                        />
                                    </div>
                                    <div className="w-full sm:w-56 relative">
                                        <Label className="text-[9px] font-black text-slate-300 uppercase mb-1 block sm:text-right">Amount</Label>
                                        <Input
                                            type="number"
                                            value={exp.amount}
                                            onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }}
                                            className="h-10 w-full border-slate-200 bg-slate-50/50 text-right font-bold text-slate-900 rounded-lg text-sm pr-16"
                                        />
                                        <span className="absolute right-9 top-[calc(50%+0.5rem)] -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase pointer-events-none">{currency}</span>
                                        {/* Mobile: inline cancel so removing a line doesn't require reaching the far-right trash button */}
                                        <button
                                            type="button"
                                            onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))}
                                            aria-label="Remove expense"
                                            className="sm:hidden absolute right-1 top-[calc(50%+0.5rem)] -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="hidden sm:inline-flex h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors sm:mt-5 shrink-0">
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* C. Yield + Financials — balance-bar summary */}
                    <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4 p-4 sm:p-6 bg-slate-900 rounded-2xl shadow-xl border border-slate-800">
                        <div className="flex-1 flex flex-col justify-center">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Actual Finished Yield</span>
                            <Input
                                type="number"
                                value={actualYield}
                                onChange={e => setActualYield(Number(e.target.value))}
                                className="h-11 w-full sm:w-40 text-xl font-black border-none bg-slate-800 text-white rounded-lg text-center tabular-nums focus-visible:ring-1 focus-visible:ring-violet-500"
                            />
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4 font-mono border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                            <div className="flex flex-col justify-center">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Material Pool</span>
                                <span className="text-lg text-blue-400 font-black">{costSummary.matTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Overhead Pool</span>
                                <span className="text-lg text-rose-400 font-black">{costSummary.expTotal.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-center sm:items-end border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Net Valuation</span>
                            <span className="text-2xl text-white font-black tabular-nums">{costSummary.total.toLocaleString()} <span className="text-xs text-slate-500">{currency}</span></span>
                        </div>
                    </div>

                    {!bodyAtEnd && (
                        <div className="sticky bottom-0 z-10 h-0 flex justify-center overflow-visible pointer-events-none">
                            <div className="h-7 w-7 -translate-y-1 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center animate-bounce">
                                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 sm:p-5 bg-slate-50/50 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 shrink-0">
                    <Button type="button" variant="ghost" onClick={() => setSelectedOrder(null)} disabled={finalizeProductionMutation.isPending} className="w-full sm:w-auto h-10 px-5 font-black uppercase text-xs tracking-widest text-slate-400 hover:text-rose-600">
                        Discard Run
                    </Button>
                    <Button
                        onClick={() => finalizeProductionMutation.mutate()}
                        disabled={finalizeProductionMutation.isPending}
                        className="w-full sm:w-auto h-10 sm:h-11 px-6 sm:px-8 bg-slate-900 hover:bg-black text-white rounded-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center"
                    >
                        {finalizeProductionMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" /> <span className="font-black uppercase text-xs tracking-widest">Finalizing...</span></>
                        ) : (
                            <span className="font-black uppercase text-xs tracking-widest">Confirm & Finalize</span>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* SYSTEM FOOTER */}
        <footer className="mt-20 border-t border-slate-100 pt-12 pb-16 opacity-30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">
                <ShieldCheck size={14} />
                <span>Facility Protocol V5.2.0 • Industrial Verification Stable</span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                &copy; {new Date().getFullYear()} INDUSTRIAL MANAGEMENT SOLUTIONS
            </p>
        </footer>
      </div>
    </div>
  );
}