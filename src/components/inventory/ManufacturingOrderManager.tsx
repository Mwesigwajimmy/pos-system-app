'use client';

import React, { useState, useMemo, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// --- UI COMPONENTS ---
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Search, X, Factory, Beaker, Truck, Utensils, 
  UserCheck, CheckCircle2, AlertCircle, Loader2, 
  TrendingUp, Wallet, PackagePlus, FlaskConical, Scale, 
  Trash2, Plus, Calendar, ShieldAlert, ShieldCheck, ClipboardList, Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- TYPES ---
export interface ManufacturingOrder {
  id: string;
  batch_number: string;
  output_variant_id: number;
  product_name: string;
  sku: string;
  planned_quantity: number;
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed';
  tenant_id: string;
  business_id: string;
  created_at: string;
}

interface IngredientLog {
  variant_id: string;
  name: string;
  planned_qty: number;
  actual_qty: number;
  waste_qty: number; 
  unit_cost: number;
}

interface Expense {
  category: string; 
  hours_or_units: number;
  rate: number;
  amount: number;
}

const supabase = createClient();

export default function ManufacturingOrderManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  
  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<IngredientLog[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [qcSupervisor, setQcSupervisor] = useState("");

  const [newOrder, setNewOrder] = useState({ variant_id: '', qty: 1, batch: '' });

  // --- 1. CORE DATA QUERIES ---
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_production_orders_view')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ManufacturingOrder[];
    }
  });

  const { data: finishedGoods } = useQuery({
    queryKey: ['composite_products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('id, name, sku')
        .eq('is_composite', true)
        .eq('is_active', true);
      return data || [];
    }
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ['raw_materials_registry'],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('id, name, sku, cost_price')
        .eq('is_raw_material', true)
        .eq('is_active', true);
      return data || [];
    }
  });

  // --- 2. LOGIC HANDLERS ---
  const addIngredientFromInventory = (variantId: string) => {
    // Check if already in list to prevent duplicates
    if (ingredientLogs.find(i => i.variant_id === variantId)) {
        return toast.error("Material already added to batch log.");
    }

    const material = rawMaterials?.find(m => m.id.toString() === variantId);
    if (!material) return;

    setIngredientLogs([...ingredientLogs, {
      variant_id: material.id.toString(),
      name: material.name,
      planned_qty: 0,
      actual_qty: 1,
      waste_qty: 0,
      unit_cost: material.cost_price || 0
    }]);
  };

  const removeIngredient = (variantId: string) => {
    setIngredientLogs(ingredientLogs.filter(i => i.variant_id !== variantId));
  };

  const openAuditDialog = async (order: ManufacturingOrder) => {
    try {
        const { data: recipe, error } = await supabase.rpc('get_composite_details_v5', { 
            p_variant_id: order.output_variant_id 
        });
        
        if (error) throw error;

        if (recipe?.components) {
          setIngredientLogs(recipe.components.map((c: any) => ({
            variant_id: c.component_variant_id.toString(),
            name: c.component_name,
            planned_qty: c.quantity,
            actual_qty: Number((c.quantity * order.planned_quantity).toFixed(4)),
            waste_qty: 0,
            unit_cost: c.unit_cost || 0
          })));
        } else {
            setIngredientLogs([]);
        }

        setActualYield(order.planned_quantity);
        setExpenses([
            { category: 'General Labor', hours_or_units: 1, rate: 0, amount: 0 },
            { category: 'Logistics/Transport', hours_or_units: 1, rate: 0, amount: 0 }
        ]);
        setSelectedOrder(order);
    } catch (err: any) {
        toast.error(`Recipe Load Failed: ${err.message}`);
    }
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!newOrder.variant_id || !newOrder.batch || newOrder.qty <= 0) {
          throw new Error("Please complete all required fields with valid values.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      const bizId = user?.app_metadata?.business_id || user?.user_metadata?.business_id;

      const { error } = await supabase.from('mfg_production_orders').insert([{
        output_variant_id: parseInt(newOrder.variant_id),
        planned_quantity: newOrder.qty,
        batch_number: newOrder.batch.toUpperCase(),
        status: 'draft',
        business_id: bizId,
        tenant_id: user?.user_metadata?.tenant_id
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Production batch created successfully");
      setIsCreateModalOpen(false);
      setNewOrder({ variant_id: '', qty: 1, batch: '' });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (error: any) => toast.error(error.message)
  });

  const finalizeProductionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      if (actualYield <= 0) throw new Error("Actual yield must be greater than zero.");
      if (!expiryDate) throw new Error("Batch expiry date is required for compliance.");

      // 1. Bulk Insert Ingredient Logs
      const { error: ingErr } = await supabase.from('mfg_production_ingredient_logs').insert(
        ingredientLogs.map(l => ({
          production_order_id: selectedOrder.id,
          ingredient_variant_id: l.variant_id,
          quantity_used: l.actual_qty,
          waste_qty: l.waste_qty,
          unit_cost_at_run: l.unit_cost,
          tenant_id: selectedOrder.tenant_id,
          business_id: selectedOrder.business_id
        }))
      );
      if (ingErr) throw ingErr;

      // 2. Bulk Insert Expenses
      if (expenses.length > 0) {
        const { error: expErr } = await supabase.from('mfg_production_expenses').insert(
          expenses.map(e => ({
            production_order_id: selectedOrder.id,
            expense_category: e.category,
            description: e.category,
            amount: e.hours_or_units * e.rate,
            tenant_id: selectedOrder.tenant_id,
            business_id: selectedOrder.business_id
          }))
        );
        if (expErr) throw expErr;
      }

      // 3. Final State Update
      const { error: updateErr } = await supabase.from('mfg_production_orders').update({ 
          actual_quantity_produced: actualYield,
          mfg_date: mfgDate,
          expiry_date: expiryDate,
          qc_inspector: qcSupervisor,
          status: 'confirmed'
      }).eq('id', selectedOrder.id);
      if (updateErr) throw updateErr;

      // 4. Trigger Server-Side Ledger & Inventory Reconciliation
      const { error: syncErr } = await supabase.rpc('mfg_complete_production_v2', { 
          p_order_id: selectedOrder.id 
      });
      if (syncErr) throw syncErr;
    },
    onSuccess: () => {
      toast.success("Batch finalized and Inventory synced");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(`Sync Error: ${e.message}`)
  });

  const financialAudit = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + (e.hours_or_units * e.rate), 0);
    const total = matTotal + expTotal;
    return { 
        matTotal, 
        expTotal, 
        total, 
        unitCost: actualYield > 0 ? (total / actualYield) : 0 
    };
  }, [ingredientLogs, expenses, actualYield]);

  // UI state for filtered results
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => 
        o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || 
        o.product_name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [orders, filter]);

  if (isLoading) return (
    <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Syncing Production Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-700">
      
      {/* PAGE HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
            <Factory className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Production Control</h1>
            <div className="flex items-center gap-2 mt-1">
               <ShieldCheck size={14} className="text-emerald-500" /> 
               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Manufacturing Hub Verified</span>
            </div>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-600/20 rounded-xl transition-all active:scale-95">
          <PackagePlus className="mr-2 h-5 w-5" /> New Batch Order
        </Button>
      </div>

      {/* MAIN ORDERS TABLE */}
      <Card className="max-w-7xl mx-auto border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">Active Production Orders</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-400 mt-1">Monitor and finalize ongoing manufacturing batches.</CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Filter by batch or product..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-9 h-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-all" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4 px-8">Batch Identity</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4">Finished Good</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4">Target Quantity</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-slate-500 py-4">Order Status</TableHead>
                  <TableHead className="text-right pr-8 text-[11px] font-bold uppercase text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-slate-400 text-sm italic font-medium">
                            No production orders found matching your criteria.
                        </TableCell>
                    </TableRow>
                ) : filteredOrders.map(o => (
                  <TableRow key={o.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 h-20">
                    <TableCell className="px-8 font-mono font-bold text-blue-600">{o.batch_number || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{o.product_name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{o.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">{o.planned_quantity.toLocaleString()} Units</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "font-bold uppercase text-[10px] px-3 py-1 shadow-none border",
                        o.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100"
                      )}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      {o.status !== 'completed' && (
                        <Button onClick={() => openAuditDialog(o)} size="sm" className="bg-slate-900 hover:bg-blue-700 font-bold px-4 rounded-lg">
                          Review & Finalize
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

      {/* CREATE ORDER MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <DialogTitle className="text-2xl font-bold tracking-tight">Initiate Production Batch</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium text-xs mt-1 uppercase tracking-wider">Select a product formula to begin manufacturing.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Product to Manufacture</Label>
              <Select value={newOrder.variant_id} onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                <SelectTrigger className="h-11 border-slate-200"><SelectValue placeholder="Select Finished Good" /></SelectTrigger>
                <SelectContent>
                  {finishedGoods?.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Batch Number</Label>
                  <Input placeholder="e.g. BATCH-2024-01" value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-11 border-slate-200 font-semibold" />
               </div>
               <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Planned Quantity</Label>
                  <Input type="number" min="1" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Math.max(1, Number(e.target.value))})} className="h-11 border-slate-200 font-semibold" />
               </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="font-bold">Cancel</Button>
            <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-xl shadow-md">
              {createOrderMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Create Work Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRODUCTION REVIEW DIALOG (Audit) */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogHeader className="bg-slate-900 text-white p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                   <ClipboardList className="text-white h-7 w-7" />
                </div>
                <div>
                    <DialogTitle className="text-2xl font-bold tracking-tight">Production Batch Review: {selectedOrder?.batch_number}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finalizing Formula For:</span>
                      <Badge className="bg-white/10 text-white hover:bg-white/20 border-none px-2 py-0.5 text-[10px] font-bold uppercase">{selectedOrder?.product_name}</Badge>
                    </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Calculated Cost Per Unit</p>
                <p className="text-4xl font-bold text-emerald-400 tracking-tight mt-1">
                  {financialAudit.unitCost.toLocaleString()} <span className="text-sm font-semibold opacity-50 uppercase">UGX</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white">
            <ScrollArea className="flex-1 p-8">
              <div className="space-y-10">
                
                {/* BATCH METADATA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Manufacturing Date</Label>
                        <Input type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)} className="h-10 border-slate-200 font-semibold" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-red-500 tracking-wider">Product Expiry Date</Label>
                        <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-10 border-red-200 text-red-600 font-semibold focus:ring-red-500" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Quality Control Supervisor</Label>
                        <Input placeholder="Enter supervisor name" value={qcSupervisor} onChange={e => setQcSupervisor(e.target.value)} className="h-10 border-slate-200 font-semibold" />
                    </div>
                </div>

                {/* MATERIAL CONSUMPTION */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                      <Beaker className="text-blue-600 h-4 w-4" /> 1. Material Consumption
                    </h3>
                    <Select onValueChange={addIngredientFromInventory}>
                      <SelectTrigger className="w-64 h-9 font-bold text-[11px] bg-blue-50/50 border-blue-100 text-blue-700 rounded-lg">
                          <SelectValue placeholder="+ ADD EXTRA MATERIAL" />
                      </SelectTrigger>
                      <SelectContent>
                          {rawMaterials?.map(rm => <SelectItem key={rm.id} value={rm.id.toString()}>{rm.name} ({rm.sku})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-bold uppercase py-3 pl-6">Material Name</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase py-3 text-center">Actual Quantity Used</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase py-3 text-center">Waste / Scrap</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase py-3 text-right pr-6">Cost per Unit</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredientLogs.map((log, idx) => (
                          <TableRow key={idx} className="border-b border-slate-50 last:border-0 h-16 group">
                            <TableCell className="pl-6 py-4">
                               <span className="font-bold text-slate-900">{log.name}</span>
                            </TableCell>
                            <TableCell>
                              <Input type="number" step="0.0001" value={log.actual_qty} onChange={e => {
                                 const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n);
                              }} className="h-9 w-24 mx-auto font-bold text-center border-slate-200 focus:bg-slate-50 transition-all" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" step="0.0001" value={log.waste_qty} onChange={e => {
                                 const n = [...ingredientLogs]; n[idx].waste_qty = Number(e.target.value); setIngredientLogs(n);
                              }} className="h-9 w-24 mx-auto font-bold text-center border-red-200 text-red-600 bg-red-50/30 focus:bg-red-50 transition-all" />
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <span className="font-mono font-bold text-slate-600">{log.unit_cost.toLocaleString()}</span>
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => removeIngredient(log.variant_id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500">
                                    <X size={14} />
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* ADDITIONAL COSTS */}
                <div className="space-y-4 pb-10">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                      <Wallet className="text-orange-500 h-4 w-4" /> 2. Additional Production Costs
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: '', hours_or_units: 1, rate: 0, amount: 0 }])} className="h-9 px-4 font-bold border-orange-200 text-orange-700 bg-orange-50/30 hover:bg-orange-50 transition-all">
                      <Plus className="mr-2 h-4 w-4" /> Add Cost Line
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {expenses.map((exp, idx) => (
                      <div key={idx} className="flex gap-4 items-center bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
                        <div className="flex-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Cost Description</Label>
                          <Input placeholder="e.g. Electricity, Night Labor" value={exp.category} onChange={e => {
                              const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n);
                          }} className="h-10 mt-1 font-bold border-slate-200 bg-white" />
                        </div>
                        <div className="w-32">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase text-center block">Qty / Hours</Label>
                          <Input type="number" step="0.01" value={exp.hours_or_units} onChange={e => {
                              const n = [...expenses]; n[idx].hours_or_units = Number(e.target.value); setExpenses(n);
                          }} className="h-10 mt-1 font-bold text-center border-slate-200 bg-white" />
                        </div>
                        <div className="w-40">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase text-right block">Rate Per Unit</Label>
                          <Input type="number" value={exp.rate} onChange={e => {
                              const n = [...expenses]; n[idx].rate = Number(e.target.value); setExpenses(n);
                          }} className="h-10 mt-1 font-bold text-right border-slate-200 bg-white" />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="mt-5 text-slate-300 hover:text-red-500 h-10">
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* SUMMARY SIDEBAR */}
            <div className="w-full lg:w-[420px] bg-slate-50 border-l border-slate-200 p-8 flex flex-col justify-between">
              <div className="space-y-10">
                <div className="space-y-4">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">3. Actual Production Yield</Label>
                    <div className="relative">
                      <Input type="number" step="0.01" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="h-20 text-5xl font-bold bg-white border-slate-200 text-center rounded-2xl shadow-sm focus:ring-blue-500" />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end opacity-50">
                        <span className="text-[10px] font-bold uppercase tracking-tight">Confirmed</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight text-blue-600">Items</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic text-center px-4">
                      Enter the total number of finished units successfully placed into inventory.
                    </p>
                </div>

                <div className="pt-8 border-t border-slate-200 space-y-4">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase">
                    <span>Material Costs</span>
                    <span className="text-slate-900 font-mono">{financialAudit.matTotal.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase">
                    <span>Operational Overheads</span>
                    <span className="text-slate-900 font-mono">{financialAudit.expTotal.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-bold text-slate-900 pt-6 border-t-2 border-slate-200">
                    <span className="uppercase tracking-tight">Total Batch Cost</span>
                    <span className="text-blue-600 font-mono">{financialAudit.total.toLocaleString()} UGX</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-10">
                <Card className="bg-slate-900 text-white border-none shadow-xl rounded-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 transition-transform group-hover:rotate-12">
                      <Settings2 size={100} />
                  </div>
                  <CardContent className="p-8 relative z-10 space-y-4">
                    <p className="text-[11px] font-bold uppercase text-blue-400 tracking-widest">Production Analysis</p>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Unit Production Cost:</p>
                      <p className="text-5xl font-bold tracking-tight text-white mt-1">{financialAudit.unitCost.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-emerald-400 pt-2">
                        <TrendingUp size={14} /> <span>Margin analysis verified</span>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4 border-2 border-dashed border-slate-200 rounded-2xl italic">
                  Order ID: {selectedOrder?.id.substring(0,12).toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white border-t p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm"><CheckCircle2 className="text-emerald-600 h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-tight text-slate-900">Batch ready for completion</p>
                <p className="text-[10px] font-medium text-slate-400">Inventory and ledger sync will be triggered upon confirmation.</p>
              </div>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="font-bold text-slate-400 hover:text-red-500 h-12 px-6">Discard Changes</Button>
              <Button 
                onClick={() => finalizeProductionMutation.mutate()} 
                disabled={finalizeProductionMutation.isPending} 
                className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-12 font-bold shadow-lg shadow-blue-600/20 rounded-xl flex-1 sm:flex-none uppercase tracking-wider"
              >
                {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                Complete Production Sync
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SYSTEM STATUS FOOTER */}
      <div className="max-w-7xl mx-auto mt-12 flex items-center justify-end">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Production Engine | Sync: active
             </span>
          </div>
      </div>
    </div>
  );
}